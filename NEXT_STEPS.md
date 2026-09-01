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

## 8. Cost Estimate (monthly)

### Assumptions

- Cognito free tier: 50,000 MAU (Always Free, no 12-month expiry).
- Lambda free tier: 1M requests/month, 400,000 GB-seconds (Always Free).
- DynamoDB free tier: 25 WCU / 25 RCU (Always Free); PAY_PER_REQUEST pricing at $1.25/M write, $0.25/M read above free tier.
- SES: $0.10 per 1,000 emails sent.
- All estimates are for us-east-1 pricing. Actual costs vary by region.

### Non-production / Demo (~100 MAU)

| Service | Usage assumption | Estimated cost |
|---------|-----------------|---------------|
| Cognito | 100 MAU, 1,000 auth ops | ~$0 (free tier) |
| Lambda | 4 triggers × 1,000 invocations, 256 MB, <1s avg | ~$0 (free tier) |
| DynamoDB | PAY_PER_REQUEST, <10K OTPs/month | ~$0.01 |
| SES | 1,000 OTP emails/month | ~$0.10 |
| **Total** | | **< $1/month** |

### Pilot (~5,000 MAU)

| Service | Usage assumption | Estimated cost |
|---------|-----------------|---------------|
| Cognito | 5,000 MAU, 50K auth ops | ~$0 (free tier covers 50K MAU) |
| Lambda | 4 triggers × 50K invocations, 256 MB | ~$0 (free tier) |
| DynamoDB | 50K writes + 50K reads/month | ~$0.07 |
| SES | 50K OTP emails/month | ~$5.00 |
| **Total** | | **~$5/month** |

### Production (~100,000 MAU)

| Service | Usage assumption | Estimated cost |
|---------|-----------------|---------------|
| Cognito | 100K MAU, 1M auth ops | ~$275 (50K free + 50K × $0.0055) |
| Lambda | 4 triggers × 1M invocations, 256 MB, <1s avg | ~$0 (within free tier) |
| DynamoDB | 1M writes + 1M reads/month | ~$1.50 |
| SES | 1M OTP emails/month | ~$100 |
| **Total** | | **~$375/month** |

### Cost trade-offs

- **DynamoDB billing mode**: PAY_PER_REQUEST is optimal up to ~50K MAU. Above that, provisioned capacity with auto-scaling may reduce costs by 30–50% at the expense of capacity planning complexity (see ADR-003).
- **SES costs scale linearly** with OTP volume. To reduce costs at scale, consider SMS (SNS) as an alternative delivery channel — higher per-message cost but higher conversion rates.
- **Cognito pricing** is the dominant cost driver at production scale. The first 50,000 MAU are Always Free (no 12-month expiry); beyond that, pricing is tiered ($0.0055/MAU for next 50K, then $0.0046/MAU).
