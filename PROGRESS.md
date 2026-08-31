# Progress

Tracks delivery status for the CDE engagement scope: step-up auth reference implementation.

---

## Phase 1 — Reference Implementation (this repo)

| Task | Status | Notes |
|------|--------|-------|
| Define auth challenge Lambda | DONE | State machine with retry limit |
| Create auth challenge Lambda | DONE | OTP via SES; console-mode fallback |
| Verify auth challenge Lambda | DONE | DynamoDB lookup; replay protection |
| Pre-token generation Lambda | DONE | Injects `step_up` claim into JWT |
| CDK stack — Cognito User Pool | DONE | Custom triggers wired |
| CDK stack — DynamoDB OTP table | DONE | TTL-based expiry |
| CDK stack — IAM least-privilege | DONE | Separate role per Lambda |
| CDK stack — outputs | DONE | Exported for sample app consumption |
| Sample app — setup script | DONE | Creates test user via Admin API |
| Sample app — end-to-end demo | DONE | Demonstrates full flow with step output |
| Architecture documentation | DONE | Sequence diagrams, flow description |
| Porting guide | DONE | Loyalty-tier and concierge patterns |
| Security / compliance doc | DONE | Risk register with rationale |
| Next steps doc | DONE | Optimization roadmap and handoff checklist |

---

## Phase 2 — Customer Adoption (out of scope for this engagement)

| Task | Status | Owner |
|------|--------|-------|
| Port pattern to loyalty-tier flow | NOT STARTED | Customer engineering |
| Port pattern to concierge override flow | NOT STARTED | Customer engineering |
| SES domain identity setup (production sender) | NOT STARTED | Customer infra team |
| Integrate with existing booking service | NOT STARTED | Customer |
| Load / performance testing | NOT STARTED | Customer |
| WAF rules for Cognito endpoint | NOT STARTED | Customer security |
| Enable Advanced Security Features (ASF) | NOT STARTED | Customer security |
| Production go-live checklist | NOT STARTED | Joint review |

---

## Known Issues / Open Items

- OTP delivery in demo uses a verified individual email address. Customer must set up SES domain identity for production.
- The `USER_PASSWORD_AUTH` flow is enabled on the demo app client for simplicity. This must be disabled and replaced with SRP in production.
- No rate limiting is implemented at the Lambda layer; relies on Cognito's built-in throttling.
