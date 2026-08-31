# Security and Compliance Design

This document records security design decisions, controls in place, and the risk register — including risks that are intentionally **not mitigated** in this non-production reference implementation, with the rationale for each accepted risk.

---

## Security Controls in Place

### SC-C1: OTP Replay Prevention
Consumed OTPs are deleted from DynamoDB immediately after successful verification. An OTP can only be used once.

### SC-C2: OTP Expiry (TTL)
All OTPs have a configurable TTL (default 5 minutes) enforced at two levels:
1. Lambda verify function checks `expiresAt` explicitly before accepting the answer
2. DynamoDB TTL auto-deletes expired records (eventual consistency — the Lambda check is the authoritative gate)

### SC-C3: OTP Entropy
OTPs are 6-digit numeric codes generated using Node.js `crypto.randomInt` (CSPRNG). Entropy = log2(10^6) ≈ 20 bits. Acceptable for a time-limited, rate-limited challenge.

### SC-C4: Cognito Challenge Retry Limit
`DefineAuthChallenge` enforces a maximum of 3 failed attempts before failing the auth. This prevents brute-force of 6-digit OTPs within the challenge window.

### SC-C5: Opaque OTP Reference
The OTP value is never stored in `privateChallengeParameters` or returned to the client. Only an opaque UUID (`otpId`) is stored in the Cognito session. See ADR-003.

### SC-C6: Least-Privilege IAM
Each Lambda function has a dedicated IAM role with the minimum required permissions:
- `DefineAuthChallenge`: no AWS API access needed; no role policy additions
- `CreateAuthChallenge`: DynamoDB `PutItem` on OTP table; SES `SendEmail` scoped to verified identity
- `VerifyAuthChallenge`: DynamoDB `GetItem` and `DeleteItem` on OTP table only
- `PreTokenGeneration`: no AWS API access needed

### SC-C7: DynamoDB Encryption at Rest
DynamoDB table uses AWS-managed keys (SSE enabled by default). No customer data beyond `userId` and OTP hash is stored.

### SC-C8: Transport Security
All Cognito API calls, SES, and DynamoDB calls are over TLS 1.2+. No plaintext channels.

### SC-C9: Token Expiry
Cognito tokens issued after step-up have a 1-hour access token expiry (Cognito default). The `step_up_at` claim allows downstream services to impose a stricter time window (e.g., reject step-up claims older than 15 minutes for payment flows).

---

## Risk Register

### Risk SC-R1: Email as Second Factor

| Field | Value |
|-------|-------|
| **Description** | Email OTP is weaker than TOTP or WebAuthn as a second factor. Email accounts can be compromised. |
| **Likelihood** | Medium |
| **Impact** | High (unauthorized booking) |
| **Mitigation status** | **ACCEPTED (non-production)** |
| **Rationale** | This is a reference implementation and demo. The second-factor *mechanism* is intentionally pluggable — the `CreateAuthChallenge` and `VerifyAuthChallenge` Lambdas are the only functions that need to change to swap in TOTP or WebAuthn. Email OTP is used here for zero-dependency setup. Production recommendation: evaluate TOTP (no additional cost) or SNS SMS for Silver/Gold; WebAuthn for Platinum tier. |

### Risk SC-R2: USER_PASSWORD_AUTH Enabled on App Client

| Field | Value |
|-------|-------|
| **Description** | `USER_PASSWORD_AUTH` transmits credentials to Cognito over HTTPS. Weaker than SRP because the server sees the raw password. |
| **Likelihood** | Low (demo environment, not internet-facing) |
| **Impact** | Medium |
| **Mitigation status** | **ACCEPTED (non-production only)** |
| **Rationale** | The demo focuses on the custom auth challenge flow, not the initial sign-in. Adding client-side SRP to the demo obscures the primary teaching point. Production apps MUST use `USER_SRP_AUTH`. The CDK stack must be updated to disable `USER_PASSWORD_AUTH` before promotion. This is listed as a required action in `NEXT_STEPS.md`. |

### Risk SC-R3: RemovalPolicy.DESTROY on User Pool and DynamoDB

| Field | Value |
|-------|-------|
| **Description** | `RemovalPolicy.DESTROY` means `cdk destroy` deletes the Cognito User Pool and DynamoDB table. All user data is permanently lost. |
| **Likelihood** | Triggered on any `cdk destroy` |
| **Impact** | High (data loss) in production |
| **Mitigation status** | **ACCEPTED (non-production)** |
| **Rationale** | Non-production demo environments require easy teardown without orphaned resources. There is no production user data in this account. Production stacks MUST change this to `RemovalPolicy.RETAIN` and add deletion protection. See `NEXT_STEPS.md`. |

### Risk SC-R4: SES FROM_EMAIL is a Shared Address

| Field | Value |
|-------|-------|
| **Description** | The demo uses a single FROM_EMAIL address for OTP delivery. No per-tenant or per-environment separation. |
| **Likelihood** | N/A (operational, not security) |
| **Impact** | Low |
| **Mitigation status** | **ACCEPTED (non-production)** |
| **Rationale** | Production should use a domain identity (e.g., `no-reply@bookings.example.com`) with DKIM and DMARC. SES sandbox mode limits to verified addresses only, which is appropriate for non-prod. |

### Risk SC-R5: No WAF on Cognito Endpoint

| Field | Value |
|-------|-------|
| **Description** | Cognito User Pool endpoint has no WAF rule set. Automated credential stuffing or OTP enumeration attacks are not blocked at the network layer. |
| **Likelihood** | Low (non-prod, not publicly advertised) |
| **Impact** | Medium |
| **Mitigation status** | **ACCEPTED (non-production)** |
| **Rationale** | Cognito's built-in throttling provides basic protection. Cognito Advanced Security Features (ASF) can detect compromised credentials and anomalous sign-in behavior. WAF + ASF are listed as required production controls in `NEXT_STEPS.md`. This risk is not mitigated in the demo because WAF association adds significant CDK complexity and cost that is disproportionate for a non-prod reference environment. |

### Risk SC-R6: OTP Logged in CloudWatch (console mode)

| Field | Value |
|-------|-------|
| **Description** | When `OTP_DELIVERY_MODE=console`, the OTP is printed to CloudWatch Logs. Any IAM principal with CloudWatch Logs read access can retrieve active OTPs. |
| **Likelihood** | Medium (console mode is used during demo) |
| **Impact** | Medium |
| **Mitigation status** | **ACCEPTED (demo only, non-production)** |
| **Rationale** | Console mode exists solely to allow running the demo without SES setup. It MUST NOT be used in any environment where real users receive OTPs. The Lambda code logs a warning when this mode is active. The `OTP_DELIVERY_MODE` environment variable defaults to `email` in the CDK stack. |

---

## Production Promotion Checklist

Before this pattern is deployed to production, the following controls **must** be implemented:

- [ ] Replace `USER_PASSWORD_AUTH` with `USER_SRP_AUTH`
- [ ] Change `RemovalPolicy.DESTROY` to `RemovalPolicy.RETAIN` on User Pool and DynamoDB
- [ ] Set up SES domain identity with DKIM/DMARC
- [ ] Enable Cognito Advanced Security Features (ASF)
- [ ] Associate AWS WAF with the Cognito User Pool
- [ ] Reduce access token expiry from 1 hour to 15 minutes (or less) for high-value flows
- [ ] Scope SES `SendEmail` permission to specific verified domain ARN (not `*`)
- [ ] Enable DynamoDB point-in-time recovery
- [ ] Enable CloudTrail for all Cognito and Lambda API calls
- [ ] Rotate the OTP table encryption key annually (KMS CMK)
- [ ] Set `OTP_DELIVERY_MODE=email` (never `console`) in production
