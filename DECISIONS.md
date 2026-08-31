# Architecture Decision Records

---

## ADR-001: Use Cognito Custom Auth Challenge (CUSTOM_AUTH) for Step-Up

**Date:** 2026-08-31  
**Status:** Accepted

### Context
Three approaches were considered for step-up auth:
1. Cognito Custom Auth Challenge (`CUSTOM_AUTH` flow)
2. API Gateway Lambda authorizer reading a step-up claim from the existing token
3. A separate identity service outside Cognito

### Decision
Use Cognito's built-in `CUSTOM_AUTH` flow with three Lambda triggers (Define / Create / Verify).

### Rationale
- Stays entirely within Cognito; no new infrastructure for auth decisions
- Tokens issued after a successful challenge carry a `step_up` custom claim (via Pre-Token Generation) that any downstream service can verify independently
- The three Lambda trigger pattern (Define / Create / Verify) is the AWS-documented path for custom factors and maps directly to the customer's loyalty-tier and concierge flows, making it the lowest-friction pattern to port

### Trade-offs
- Each step-up initiates a new Cognito auth session, not a token refresh. This means a new access/ID/refresh token set is issued, replacing any existing tokens in the client. The sample app and porting guide explain how to handle token replacement.
- `CUSTOM_AUTH` is not available with the Hosted UI. The customer's hosted sign-in rebuild must use their own UI calling the Cognito API directly.

---

## ADR-002: OTP Delivered via SES (Email), Not SMS/TOTP

**Date:** 2026-08-31  
**Status:** Accepted

### Context
Second-factor options considered: TOTP (authenticator app), SMS OTP (SNS), email OTP (SES), push notification.

### Decision
Email OTP via SES for this reference implementation.

### Rationale
- No physical device required for the demo; testers only need an email address
- SES is already in the customer's footprint
- OTP via email is a common travel industry pattern (familiar UX)
- SMS via SNS adds cost and requires phone number attribute on users; acceptable for production but adds setup friction in non-prod demo

### Trade-offs
- Email delivery latency can be higher than SMS (seconds vs. near-instant)
- Email accounts are more likely to be compromised than phone numbers for some threat models
- Production recommendation: evaluate SMS OTP or TOTP depending on user tier. See `NEXT_STEPS.md`.

---

## ADR-003: OTP Storage in DynamoDB (Not Cognito Session)

**Date:** 2026-08-31  
**Status:** Accepted

### Context
The `privateChallengeParameters` field in Cognito's challenge response is designed to store the answer or a reference. Two options:
1. Store OTP directly in `privateChallengeParameters` (stays in Cognito session, no external storage)
2. Store OTP in DynamoDB; store only an opaque `otpId` reference in `privateChallengeParameters`

### Decision
Store OTP in DynamoDB; store `otpId` in `privateChallengeParameters`.

### Rationale
- `privateChallengeParameters` is returned to the client as part of the challenge response. Although the Cognito documentation says these are "private," the verify Lambda receives them, but they are visible in CloudTrail logs and potentially in Lambda environment context. Storing the actual secret there increases exposure surface.
- DynamoDB record is deleted on successful verification (replay protection)
- DynamoDB TTL provides automatic cleanup of unconsumed OTPs

### Trade-offs
- Adds a DynamoDB dependency. Mitigated: table is pay-per-request, no operational overhead.

---

## ADR-004: CDK (TypeScript) for IaC

**Date:** 2026-08-31  
**Status:** Accepted

### Context
IaC options: CDK (TypeScript), CloudFormation (YAML), Terraform.

### Decision
AWS CDK v2 with TypeScript.

### Rationale
- Customer uses AWS-native tooling; CDK stays within that ecosystem
- TypeScript CDK is the AWS-recommended path for new Lambda-heavy workloads (NodejsFunction handles bundling automatically)
- CDK provides type safety for resource references (no manual ARN string management)
- The customer's engineering team has CDK familiarity per scoping conversation

### Trade-offs
- Requires Node.js and npm on the deployer's machine. Mitigated: prerequisites are documented.
- CDK bootstrap is required once per account/region. Documented in README quick start.

---

## ADR-005: USER_PASSWORD_AUTH Enabled on Demo App Client

**Date:** 2026-08-31  
**Status:** Accepted (non-production only)

### Context
Cognito supports multiple initial auth flows: USER_SRP_AUTH (secure, client-side SRP), USER_PASSWORD_AUTH (password sent to API), ADMIN_USER_PASSWORD_AUTH (server-side only).

### Decision
Enable `USER_PASSWORD_AUTH` on the demo client for simplicity.

### Rationale
- The focus of this demo is the *custom auth challenge* (step-up) flow, not the initial sign-in flow
- Implementing client-side SRP in a demo script adds ~200 lines of crypto code that distracts from the primary purpose
- The app client is non-production and not internet-facing

### Trade-offs and Mitigation
- `USER_PASSWORD_AUTH` transmits the password to the Cognito API (over TLS). In production, this should be replaced with `USER_SRP_AUTH`.
- Risk is accepted for non-production demo. The CDK stack and porting guide explicitly document this as a required change before production promotion.
- See `SECURITY_COMPLIANCE.md` — Risk SC-003.

---

## ADR-006-b: CDK lambdaTriggers.verifyAuthChallenge Does Not Emit VerifyAuthChallengeResponse

**Date:** 2026-08-31  
**Status:** Accepted

### Context
CDK's `UserPool` construct accepts `lambdaTriggers.verifyAuthChallenge`. However, in CDK v2 (≥2.100), this property is silently dropped from the synthesized CloudFormation `LambdaConfig` — the resulting User Pool has no `VerifyAuthChallengeResponse` trigger, causing Cognito to throw `UnexpectedLambdaException` when processing `RespondToAuthChallenge`.

### Decision
Register `VerifyAuthChallengeResponse` using `userPool.addTrigger(cognito.UserPoolOperation.VERIFY_AUTH_CHALLENGE_RESPONSE, fn)` instead of the inline `lambdaTriggers` object.

### Rationale
`addTrigger` directly modifies the CFN resource via a `CfnUserPoolLambdaConfig` override, bypassing the broken property mapping. Confirmed working in CDK 2.1139.0.

### Trade-offs
None — `addTrigger` is the recommended pattern for adding triggers post-construction.

---

## ADR-007: Booking Threshold Check Is an Application-Layer Concern

**Date:** 2026-08-31  
**Status:** Accepted

### Context
The original design passed `bookingAmount` via `clientMetadata` in `InitiateAuth` so the `DefineAuthChallenge` or `CreateAuthChallenge` Lambda could decide whether to require OTP. Testing confirmed that Cognito does NOT forward `ClientMetadata` from `InitiateAuth` to any Lambda trigger in the CUSTOM_AUTH flow — contrary to AWS documentation.

### Decision
Move the threshold check to the application layer. The app calls `CUSTOM_AUTH` only when step-up is required. Lambda functions no longer need `bookingAmount`. The `bookingAmount` is still passed in `RespondToAuthChallenge.clientMetadata` (which DOES reach `PreTokenGeneration`) for embedding in the token claim.

### Rationale
- Eliminates dependency on undocumented Cognito behavior
- Cleaner separation: Cognito handles authentication mechanics; the app handles business rules
- Reduces Lambda complexity

### Trade-offs
- The app must know the threshold value. This is passed as a CDK output and loaded from `.env`. In a multi-service setup, the threshold should be centralized (e.g., in SSM Parameter Store).

---

## ADR-006: Pre-Token Generation Lambda Injects step_up Claim

**Date:** 2026-08-31  
**Status:** Accepted

### Context
After step-up auth completes, downstream services (booking API, payment API) need to verify that step-up was performed in the current session. Two options:
1. Services call a Cognito API to check session state
2. The JWT itself carries a `step_up` claim

### Decision
Use Pre-Token Generation Lambda to inject `step_up: "true"` and `step_up_at: <epoch>` into the ID token claims.

### Rationale
- Downstream services can verify the claim locally (JWT signature check) without making an additional API call
- Claim injection at token generation time is the standard OAuth2/OIDC pattern for conveying auth context
- The `step_up` claim is scoped to the token's expiry, preventing indefinite elevation

### Trade-offs
- If the user's step-up token is stolen, the claim is valid until expiry. Mitigated by short token expiry (1 hour default, recommended to reduce to 15 minutes for bookings). See `NEXT_STEPS.md`.
