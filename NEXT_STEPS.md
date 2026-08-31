# Next Steps

Post-engagement roadmap covering optimization opportunities, production hardening, and the customer handoff process.

---

## 1. Immediate Actions (before production promotion)

These are **blockers** for going to production. See `SECURITY_COMPLIANCE.md` for full rationale.

| Action | Owner | Effort |
|--------|-------|--------|
| Replace `USER_PASSWORD_AUTH` with `USER_SRP_AUTH` in sample app | Customer engineering | S |
| Change `RemovalPolicy.DESTROY` → `RETAIN` in CDK stack | Customer engineering | XS |
| Set up SES domain identity (`no-reply@bookings.example.com`) | Customer infra | M |
| Enable Cognito Advanced Security Features (ASF) in CDK stack | Customer engineering | S |
| Associate AWS WAF with User Pool | Customer security | M |
| Scope SES IAM permission to verified domain ARN | Customer engineering | XS |
| Set access token expiry ≤ 15 min for booking client | Customer product | XS |

---

## 2. Second-Factor Upgrade Path

The current implementation uses email OTP. When the customer is ready to upgrade:

### Option A: TOTP (Authenticator App)
- Use Cognito's built-in software token MFA (`cognitoUserPool.addTotpMfa()`)
- Remove the `CreateAuthChallenge` / `VerifyAuthChallenge` Lambda pair
- Leverage Cognito-managed TOTP — no DynamoDB, no SES dependency
- Best fit: Gold/Platinum tiers, internal staff

### Option B: SMS OTP via SNS
- Replace SES `SendEmail` call in `CreateAuthChallenge` with SNS `Publish` to phone number
- Requires `phone_number` as a verified user attribute
- Add `phone_number` to the User Pool standard attributes in CDK stack
- Best fit: Silver tier, consumer-facing

### Option C: WebAuthn / Passkey (Cognito Passwordless)
- Cognito now supports passkeys natively (2024+)
- No custom Lambda triggers needed for WebAuthn
- Highest assurance level; appropriate for Platinum tier and concierge flows
- Requires browser/device support evaluation

---

## 3. Port Pattern to Loyalty-Tier Flow

See `docs/porting-guide.md` for detailed instructions. High-level changes:

- `DefineAuthChallenge`: instead of checking `bookingAmount`, check `userAttributes['custom:loyalty_tier']` or a post-sign-in attribute lookup
- `CreateAuthChallenge`: instead of OTP, generate a redirect token or session marker
- `VerifyAuthChallenge`: verify the redirect completed (e.g., a signed callback from the loyalty service)
- `PreTokenGeneration`: inject `loyalty_tier` claim instead of `step_up`

Estimated effort: **3–5 days** for an engineer familiar with this reference implementation.

---

## 4. Port Pattern to Concierge Override Flow

Key differences from step-up:
- The challenge initiator is a staff member at the concierge desk, not the end user
- Override must be time-bounded and audited
- Recommended approach: `CreateAuthChallenge` issues a short-lived code to the concierge's admin console; `VerifyAuthChallenge` checks the code was approved in the admin system

Estimated effort: **5–8 days** (includes admin console integration).

---

## 5. Performance and Scalability

### Lambda Cold Starts
- All three triggers are in the Cognito auth critical path. Cold starts add latency.
- Recommendation: enable Lambda Provisioned Concurrency for `CreateAuthChallenge` (OTP generation + SES call) in production peak hours
- Estimated provisioned concurrency: 2–5 units based on concurrent sign-in load

### DynamoDB Throughput
- Current table mode: PAY_PER_REQUEST (on-demand)
- At >1000 concurrent step-up auths, consider switching to PROVISIONED mode with auto-scaling to reduce per-request cost
- OTP records are tiny (<1 KB). DynamoDB cost is dominated by request count, not storage.

### SES Throughput
- Default SES sending rate: 14 emails/second (sandbox: 1/second)
- Request production sending limit increase before launch

---

## 6. Observability

Add the following before production:

```typescript
// In CDK stack: add CloudWatch alarms
new cloudwatch.Alarm(this, 'StepUpFailureRate', {
  metric: verifyAuthChallengeFn.metricErrors().with({ period: Duration.minutes(5) }),
  threshold: 10,
  evaluationPeriods: 1,
  alarmDescription: 'High step-up verification failure rate — possible brute-force attempt',
});
```

Recommended metrics to track:
- `step_up_initiated` — count per minute
- `step_up_succeeded` — success rate
- `step_up_failed_max_attempts` — abuse signal
- `otp_delivery_latency` — SES delivery time (CloudWatch Logs Insights on Lambda logs)

---

## 7. Handoff Checklist

To hand off this project to the customer engineering team:

- [ ] Walk through `README.md` quick start together (deploy + demo run)
- [ ] Walk through `docs/architecture.md` sequence diagrams
- [ ] Walk through `DECISIONS.md` — explain rationale behind each ADR
- [ ] Walk through `SECURITY_COMPLIANCE.md` — review production promotion checklist together
- [ ] Walk through `docs/porting-guide.md` — assign owner for loyalty-tier port
- [ ] Confirm customer team has CDK bootstrap done in their non-prod account
- [ ] Confirm customer team has SES domain identity set up (or has a plan)
- [ ] Transfer repo ownership / access
- [ ] Schedule 30-day check-in to review production promotion progress

---

## 8. Cost Estimate (monthly, non-production)

| Service | Usage assumption | Estimated cost |
|---------|-----------------|---------------|
| Cognito | 100 MAU, 1000 auth ops | ~$0 (free tier) |
| Lambda | 3 triggers × 1000 invocations | ~$0 (free tier) |
| DynamoDB | PAY_PER_REQUEST, <10K OTPs/month | ~$0.01 |
| SES | 1000 OTP emails/month | ~$0.10 |
| **Total** | | **< $1/month (non-prod)** |

Production estimates depend on MAU and booking volume. Request a Well-Architected cost review before go-live.
