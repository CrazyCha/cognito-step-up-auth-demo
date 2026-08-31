# Video Recording Script (English)

**Suggested duration:** 6-8 minutes  
**Suggested layout:** Terminal on the left, AWS Console on the right (optional)

---

## Introduction (0:00 - 0:45)

**Narration:**

> Hi everyone. Today I'm going to walk through a step-up authentication implementation built on Amazon Cognito.
>
> Here's the context: a hotel group is rebuilding their guest sign-in system using Amazon Cognito. They have a security requirement — when a guest books a room worth more than $5,000, they need an additional identity verification step to confirm the action is intentional.
>
> This demo is a complete reference implementation of that requirement, covering AWS infrastructure, Lambda business logic, a sample application, and full documentation.

---

## Part 1: Project Structure (0:45 - 2:00)

**Command:**
```bash
cd /home/ec2-user/cognito-step-up-auth-demo
ls
```

**Narration:**

> Let's start with the project structure.
>
> The `infra` directory contains CDK infrastructure code that deploys all AWS resources to any account with a single command.
>
> The `lambdas` directory holds the core business logic — four Lambda functions that implement the entire authentication flow.
>
> The `app` directory is a sample application that demonstrates the end-to-end flow.
>
> On the documentation side, we have an architecture guide, a security and compliance document, architecture decision records, and a porting guide that explains how the customer's engineering team can adapt this pattern to their other two authentication flows.

**Command:**
```bash
ls lambdas/
```

**Narration:**

> These four Lambda functions implement Cognito's Custom Auth Challenge mechanism.
>
> `define-auth-challenge` is the state machine — it decides whether to issue a challenge or issue tokens.
>
> `create-auth-challenge` generates the OTP, persists it in DynamoDB, and delivers it to the guest's email via SES.
>
> `verify-auth-challenge` validates the guest's answer and prevents replay attacks by deleting the OTP immediately after use.
>
> `pre-token-generation` injects a `step_up` claim into the JWT before it's issued, so downstream services can verify the step-up locally without making an additional Cognito API call.

---

## Part 2: Core Code (2:00 - 3:30)

**Command:**
```bash
cat lambdas/define-auth-challenge/index.js
```

**Narration:**

> This is the state machine. When the session is empty, it issues a CUSTOM_CHALLENGE. When the challenge passes, it issues tokens. After three failed attempts, it rejects the authentication. Clean and simple.

**Command:**
```bash
cat lambdas/create-auth-challenge/index.js
```

**Narration:**

> Here we generate a 6-digit OTP using Node.js's built-in `crypto.randomInt` — cryptographically secure. The OTP is stored in DynamoDB with a 5-minute TTL for automatic expiry. It's then delivered via SES. In demo mode, we log it to CloudWatch instead of sending an email, which makes it easier to demonstrate.

**Command:**
```bash
cat lambdas/pre-token-generation/index.js
```

**Narration:**

> This Lambda runs just before Cognito issues the tokens. It injects three custom claims: the `step_up` flag, the timestamp of when verification completed, and the booking amount. The hotel's booking engine and payment processor can read these claims directly from the JWT — no round-trip to Cognito required.

---

## Part 3: Running the Demo (3:30 - 6:30)

**Terminal 1:**
```bash
cd /home/ec2-user/cognito-step-up-auth-demo/app
node src/demo.js
```

**Narration after Step 1 output:**

> Step 1 — the guest signs in with their username and password. Notice the initial token has no `step_up` field. This is a standard sign-in token.

**Narration after Step 2 output:**

> Step 2 — the application checks the booking amount. $8,000 exceeds the $5,000 threshold, so step-up authentication is required.

**Narration after Step 3 output:**

> Step 3 — we initiate Cognito's CUSTOM_AUTH flow. Cognito invokes our Lambda, returns a challenge, and the OTP has been sent.

**When the program pauses at the OTP prompt, switch to Terminal 2:**
```bash
aws logs tail /aws/lambda/StepUpAuthStack-CreateAuthChallenge --since 2m --follow
```

**Narration:**

> Now let's check CloudWatch Logs for the verification code. In production, this code would go to the guest's registered email inbox. For this demo, we're reading it directly from the Lambda logs.

**After the OTP appears, switch back to Terminal 1 and enter it:**

**Narration:**

> Got the code. Entering it now.

**Narration after Step 6 output:**

> Verification passed. Let's look at the new token. We now have three additional claims: `step_up` is true, `step_up_at` is the timestamp of when the verification completed, and `step_up_booking_amount` is 8,000.
>
> When the hotel's booking system receives this token, it can verify the signature locally and read these claims directly — confirming that step-up authentication was completed, without making any additional call to Cognito.

---

## Part 4: Below-Threshold Comparison (6:30 - 7:30)

**Operation:** Edit `.env`, change `BOOKING_AMOUNT=3000`, then run again:
```bash
node src/demo.js
```

**Narration:**

> Let's compare with a booking below the threshold — $3,000 this time.
>
> At Step 2, the application immediately determines no step-up is needed. The entire CUSTOM_AUTH flow is skipped, no Lambda is invoked, and the guest experience is completely unaffected.
>
> That's the core principle of step-up authentication: add friction only when it's necessary, not on every transaction.

---

## Closing (7:30 - 8:00)

**Narration:**

> This reference implementation demonstrates the full Cognito Custom Auth Challenge pattern.
>
> The same pattern can be directly ported to the hotel's other two authentication flows: loyalty-tier gating and concierge desk override. The step-by-step porting instructions are in `docs/porting-guide.md`.
>
> All infrastructure is managed with CDK and can be deployed to any AWS account. Thanks for watching.

---

## Pre-Recording Checklist

```bash
# 1. Verify .env is correct (BOOKING_AMOUNT=8000)
cat /home/ec2-user/cognito-step-up-auth-demo/app/.env

# 2. Confirm test user exists
cd /home/ec2-user/cognito-step-up-auth-demo/app
node src/setup.js

# 3. Do a full dry run first to confirm the flow works
node src/demo.js
```
