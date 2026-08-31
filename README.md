# Cognito Step-Up Auth Demo

Reference implementation of **step-up authentication for high-value hotel bookings**, built on Amazon Cognito Custom Auth Challenge. Delivered as a CDE (Customer Delivery Engagement) reference pattern.

---

## Background

A hotel group is rebuilding its hosted sign-in system with Amazon Cognito and needs three custom authentication flows:

1. **Loyalty-tier gating** — route guests to different experiences based on Silver / Gold / Platinum status after sign-in
2. **Step-up auth on high-value bookings** ← **this repo implements this flow**
3. **Concierge desk override** — allow front-desk staff to approve exceptions on behalf of guests

All three flows were stalled due to competing architecture proposals. This repo provides a working reference implementation of flow 2 that the customer's team can independently port to flows 1 and 3. See [`docs/porting-guide.md`](docs/porting-guide.md).

---

## What This Project Does

**Scenario:** A hotel guest books a suite. When the booking total exceeds **$5,000**, the system requires a second verification step before confirming the reservation — ensuring the action is intentional and the account has not been compromised.

**User experience:**
1. Guest signs in normally
2. Guest builds a booking worth $8,000
3. Before confirming, the app detects the high-value threshold and initiates a challenge
4. A one-time verification code is sent to the guest's registered email
5. Guest enters the code
6. Booking is confirmed; a new token containing a `step_up` claim is issued

Downstream services (booking engine, payment processor) verify the `step_up` claim directly from the JWT — no additional Cognito API call required.

---

## Technical Implementation

```
Guest submits a $8,000 hotel booking
         │
         ▼
App checks: bookingAmount > BOOKING_THRESHOLD ($5,000)?
         │ YES
         ▼
InitiateAuth (CUSTOM_AUTH) ──────────────────────────────────────────┐
         │                                                            │
         ▼                                                            │
DefineAuthChallenge (Lambda)                                          │
  Session empty → issue CUSTOM_CHALLENGE                             │
         │                                                            │
         ▼                                                            │
CreateAuthChallenge (Lambda)                                          │
  Generate 6-digit OTP (CSPRNG)                                      │
  Store in DynamoDB with 5-min TTL                                   │
  Deliver via SES email (or CloudWatch Logs in demo mode)            │
         │                                                            │
         ▼                                                            │
Guest receives OTP, enters it in the app                             │
         │                                                            │
         ▼                                                            │
RespondToAuthChallenge ──────────────────────────────────────────────┘
         │
         ▼
VerifyAuthChallenge (Lambda)
  DynamoDB lookup + expiry check
  Constant-time comparison (timing attack prevention)
  Delete OTP on success (replay prevention)
         │
         ▼
DefineAuthChallenge (Lambda) — challenge passed → issue tokens
         │
         ▼
PreTokenGeneration (Lambda)
  Inject into JWT:
    step_up                = "true"
    step_up_at             = <epoch>
    step_up_booking_amount = "8000"
         │
         ▼
Tokens returned to app — booking confirmed
```

### Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Auth mechanism | Cognito CUSTOM_AUTH | Native to Cognito; keeps step-up claim in the JWT |
| Second factor | Email OTP | Zero device dependency for demo; pluggable for TOTP/SMS in production |
| OTP storage | DynamoDB (not Cognito session) | OTP value never exposed in CloudTrail or Lambda context |
| Threshold check | Application layer (not Lambda) | Cognito does not forward `InitiateAuth.ClientMetadata` to Lambda triggers |
| IaC | AWS CDK v2 (TypeScript) | Customer's preferred toolchain; NodejsFunction handles bundling |

> Two AWS behavior gaps discovered during implementation are documented in [`DECISIONS.md`](DECISIONS.md) (ADR-006-b, ADR-007) to prevent the same issues during porting.

---

## Directory Structure

```
cognito-step-up-auth-demo/
│
├── README.md                     ← You are here. Project overview and index.
├── PROGRESS.md                   ← Task tracking: completed, in-progress, remaining.
├── DECISIONS.md                  ← Architecture decision records (ADRs).
├── SECURITY_COMPLIANCE.md        ← Security design rationale and accepted risk register.
├── NEXT_STEPS.md                 ← Optimization roadmap and handoff checklist.
│
├── infra/                        ← AWS CDK (TypeScript) — deploys all AWS resources.
│   ├── bin/app.ts                ← CDK app entry point.
│   ├── lib/step-up-auth-stack.ts ← Main stack: Cognito, Lambda, DynamoDB, IAM.
│   ├── package.json
│   ├── tsconfig.json
│   └── cdk.json
│
├── lambdas/                      ← Lambda trigger functions (Node.js 22.x).
│   ├── define-auth-challenge/    ← State machine: decides challenge vs. issue tokens.
│   ├── create-auth-challenge/    ← Generates OTP, stores in DynamoDB, sends via SES.
│   ├── verify-auth-challenge/    ← Validates OTP answer, deletes consumed OTP.
│   └── pre-token-generation/     ← Injects step_up custom claim into JWT.
│
├── app/                          ← Sample Node.js application demonstrating the flow.
│   ├── src/setup.js              ← One-time: creates a test user in Cognito.
│   ├── src/demo.js               ← Main demo: sign-in → step-up → verify tokens.
│   ├── src/auth.js               ← Cognito auth helpers (reusable).
│   ├── package.json
│   └── .env.example              ← Required environment variables.
│
└── docs/
    ├── architecture.md           ← Sequence diagrams, component descriptions, data flow.
    └── porting-guide.md          ← How to adapt this pattern to loyalty-tier and concierge flows.
```

---

## Document Index

| File | Type | Purpose |
|------|------|---------|
| README.md | Navigation | Project overview, structure, quick start |
| PROGRESS.md | Status | Task tracker for delivery work |
| DECISIONS.md | ADR | Why each major choice was made (including AWS behavior gaps) |
| SECURITY_COMPLIANCE.md | Governance | Security posture, risk register, production checklist |
| NEXT_STEPS.md | Roadmap | Post-delivery optimizations and handoff checklist |
| docs/architecture.md | Technical | Deep-dive on the auth flow with sequence diagrams |
| docs/porting-guide.md | Guide | Instructions for porting to loyalty-tier and concierge flows |

---

## Prerequisites

- AWS CLI configured with credentials for a non-production account
- Node.js >= 18
- AWS CDK v2: `npm install -g aws-cdk`
- An SES-verified sender email address — or use `OTP_DELIVERY_MODE=console` to skip SES setup

---

## Quick Start

### 1. Deploy Infrastructure

```bash
cd infra
npm install
cdk bootstrap          # first time only, per account/region
cdk deploy --outputs-file ../app/.cdk-outputs.json
```

### 2. Set Up the Sample App

```bash
cd app
npm install
cp .env.example .env
# Fill in USER_POOL_ID and CLIENT_ID from the CDK outputs file
```

### 3. Create a Test User

```bash
node src/setup.js
```

### 4. Run the End-to-End Demo

```bash
node src/demo.js
```

When prompted for the OTP, retrieve it from CloudWatch Logs (if using `console` delivery mode):

```bash
aws logs tail /aws/lambda/StepUpAuthStack-CreateAuthChallenge --since 1m
```

The demo prints each step of the auth flow with timing, and displays the decoded JWT claims at the end — including the `step_up`, `step_up_at`, and `step_up_booking_amount` claims.

---

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `BOOKING_THRESHOLD` | Hotel booking amount (USD) that triggers step-up | `5000` |
| `OTP_EXPIRY_SECONDS` | OTP validity window in seconds | `300` |
| `OTP_DELIVERY_MODE` | `email` (SES) or `console` (CloudWatch Logs — demo only) | `console` |
| `FROM_EMAIL` | SES-verified sender address | required if mode=`email` |

---

## Tearing Down

```bash
cd infra
cdk destroy
```

> **Note:** The DynamoDB table and Cognito User Pool use `RemovalPolicy.DESTROY` intentionally for non-production use. Change to `RemovalPolicy.RETAIN` before any production promotion. See `SECURITY_COMPLIANCE.md`.
