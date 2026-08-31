# Cognito Step-Up Auth Demo

Reference implementation of an Amazon Cognito custom auth challenge flow for **step-up authentication on high-value bookings**. Built as a CDE (Customer Delivery Engagement) deliverable.

## Background

A travel platform is rebuilding its hosted sign-in with Cognito and requires three custom auth flows:
1. **Loyalty-tier gating** — Silver/Gold/Platinum post-sign-in routing
2. **Step-up auth on high-value bookings** ← **this repo implements this flow**
3. **Concierge desk override**

This implementation serves as the reference pattern for all three flows. See [`docs/porting-guide.md`](docs/porting-guide.md) for instructions on adapting it to the other two.

---

## Directory Structure

```
cognito-step-up-auth-demo/
│
├── README.md                   ← You are here. Project overview and index.
├── PROGRESS.md                 ← Task tracking: completed, in-progress, remaining.
├── DECISIONS.md                ← Architecture decision records (ADRs).
├── SECURITY_COMPLIANCE.md      ← Security design rationale and accepted risk register.
├── NEXT_STEPS.md               ← Optimization roadmap and handoff checklist.
│
├── infra/                      ← AWS CDK (TypeScript) — deploys all AWS resources.
│   ├── bin/app.ts              ← CDK app entry point.
│   ├── lib/step-up-auth-stack.ts ← Main stack: Cognito, Lambda, DynamoDB, IAM.
│   ├── package.json
│   ├── tsconfig.json
│   └── cdk.json
│
├── lambdas/                    ← Lambda trigger functions (Node.js 20.x).
│   ├── define-auth-challenge/  ← State machine: decides challenge vs. issue tokens.
│   ├── create-auth-challenge/  ← Generates OTP, stores in DynamoDB, sends via SES.
│   ├── verify-auth-challenge/  ← Validates OTP answer, deletes consumed OTP.
│   └── pre-token-generation/   ← Injects step_up custom claim into JWT.
│
├── app/                        ← Sample Node.js application demonstrating the flow.
│   ├── src/setup.js            ← One-time: creates a test user in Cognito.
│   ├── src/demo.js             ← Main demo: sign-in → step-up → verify tokens.
│   ├── src/auth.js             ← Cognito auth helpers (reusable).
│   ├── package.json
│   └── .env.example            ← Required environment variables.
│
└── docs/
    ├── architecture.md         ← Sequence diagrams, component descriptions, data flow.
    └── porting-guide.md        ← How to adapt this pattern to loyalty-tier and concierge flows.
```

---

## Document Index

| File | Type | Purpose |
|------|------|---------|
| README.md | Navigation | Project overview, structure, quick start |
| PROGRESS.md | Status | Task tracker for delivery work |
| DECISIONS.md | ADR | Why each major choice was made |
| SECURITY_COMPLIANCE.md | Governance | Security posture, risk register |
| NEXT_STEPS.md | Roadmap | Post-delivery optimizations and handoff |
| docs/architecture.md | Technical | Deep-dive on the auth flow design |
| docs/porting-guide.md | Guide | Instructions for porting to other flows |

---

## Prerequisites

- AWS CLI configured with credentials for a non-production account
- Node.js >= 18
- AWS CDK v2: `npm install -g aws-cdk`
- An SES-verified email address (sender) — or use `OTP_DELIVERY_MODE=console` to skip SES

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
# Edit .env with values from ../.cdk-outputs.json
```

### 3. Create a Test User

```bash
node src/setup.js
```

### 4. Run the End-to-End Demo

```bash
node src/demo.js
```

The demo prints each step of the auth flow with timing information and displays the decoded JWT claims at the end.

---

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `BOOKING_THRESHOLD` | Booking amount (USD) that triggers step-up | `5000` |
| `OTP_EXPIRY_SECONDS` | OTP validity window in seconds | `300` |
| `OTP_DELIVERY_MODE` | `email` (SES) or `console` (CloudWatch Logs) | `email` |
| `FROM_EMAIL` | SES-verified sender address | required if mode=email |

---

## Tearing Down

```bash
cd infra
cdk destroy
```

> **Note:** The DynamoDB table and Cognito User Pool have `RemovalPolicy.DESTROY` set intentionally for non-production use. Do not change this before promoting to production without reading `SECURITY_COMPLIANCE.md`.
