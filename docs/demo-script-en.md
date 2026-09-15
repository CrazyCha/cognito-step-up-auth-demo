# Video Recording Script (English) v2

**Suggested duration:** 10-13 minutes
**Suggested layout:** Terminal on the left, editor/docs on the right (switchable)

Changes from v1: added "deployment demo" and "security scan walkthrough" sections, and
strengthened the "decision rationale" and "extension path" narration — covering the 8
rubric-scored points.

**On D8 (Holmes quality scan):** taking the evaluator's option (b) — `docs/quality-findings.md`
already documents the baseline findings, the fix commits, and the clean rescan, so this isn't
narrated on camera; the written record stands as the evidence.

---

## Pre-recording setup (off camera — do this before you hit record)

To show a **genuine** `cdk deploy` on camera (not an already-running app that proves nothing about
reproducibility), destroy the current stack first so the recorded deploy creates it from scratch:

```bash
cd /home/ec2-user/cognito-step-up-auth-demo/infra
cdk destroy      # confirm — this deletes Cognito/DynamoDB/Lambda
```

Confirm it's gone:

```bash
aws cloudformation describe-stacks --stack-name StepUpAuthStack
# should return "does not exist"
```

Other checks, same as v1:

```bash
cat /home/ec2-user/cognito-step-up-auth-demo/app/.env
```

---

## Opening: the customer's business problem (0:00 - 0:45) — Point 1

**Narration:**

> Hi everyone. Today I'm walking through a step-up authentication reference implementation built
> on Amazon Cognito.
>
> Context: a hotel group is rebuilding their guest sign-in system on Amazon Cognito, and needs
> three custom auth flows — loyalty-tier gating, step-up auth, and a concierge desk override. All
> three were stalled on competing architecture proposals.
>
> I own the second flow: when a guest's booking exceeds $5,000, the system requires an additional
> identity verification step before confirming it — making sure that high-value action is genuinely
> the account owner, not a compromised-account anomaly.
>
> This demo is the full reference implementation of that flow, built so the customer's team can
> port the same pattern to the other two flows themselves.

---

## Part 1: Architecture and key decisions — the "why" (0:45 - 2:30) — Point 2

**Action:** Open `DECISIONS.md` (no need to scroll the whole file on camera).

**Narration:**

> A few of the key architecture decisions, and why — all recorded as ADRs in `DECISIONS.md`.
>
> **First, why Cognito's native CUSTOM_AUTH flow instead of a separate identity service?**
> CUSTOM_AUTH follows AWS's documented Define/Create/Verify Lambda trigger pattern, and tokens
> issued after a successful challenge carry a custom claim any downstream service can verify
> without another Cognito call. More importantly, this three-trigger shape is structurally
> identical to the other two flows — loyalty-tier and concierge override — just with different
> decision logic, which makes it the lowest-friction pattern to port. That's ADR-001.
>
> **Second, why email OTP instead of TOTP or SMS?**
> Email needs no extra device, SES is already in the customer's stack, and OTP-by-email is a
> familiar pattern in travel. The trade-off is higher latency and weaker security than TOTP — so I
> made the mechanism pluggable: swapping `CreateAuthChallenge` and `VerifyAuthChallenge` is enough
> to move to TOTP or WebAuthn, which is what I recommend for production, tiered by loyalty level.
> That's ADR-002.
>
> **Third, why is the threshold check in the application layer, not in a Lambda?**
> This came out of a real gap I hit during implementation: AWS docs say `InitiateAuth`'s
> `ClientMetadata` reaches the Lambda triggers — testing showed it doesn't. So the original
> design, checking the booking amount inside a trigger, wasn't viable. I moved that decision to
> the application layer instead: Cognito only handles the authentication mechanics, and the
> business rule doesn't depend on undocumented behavior. This gap is written up in ADR-007
> specifically so the customer's team doesn't rediscover it while porting.

---

## Part 2: Deployment demo (2:30 - 6:00) — Point 5

**Action:**

```bash
cd /home/ec2-user/cognito-step-up-auth-demo/infra
npm install
cdk bootstrap
```

**Narration:**

> Now the deployment. Everything is managed with AWS CDK (TypeScript), deployable to any account
> with two commands.
>
> `cdk bootstrap` is the one-time per-account/region setup CDK needs — it creates the S3 bucket and
> IAM roles CDK itself uses. It's idempotent on an already-bootstrapped account.

**Action:**

```bash
cdk deploy --outputs-file ../app/.cdk-outputs.json
```

**Narration (while it runs):**

> This synthesizes a CloudFormation template and creates the real resources: a Cognito User Pool,
> a DynamoDB table for OTPs, four Lambda triggers, and their IAM roles. Takes a couple of minutes —
> let's let it finish.

**Once deployed:**

> Deployment's done. CDK printed the outputs we need — User Pool ID, App Client ID, OTP table name
> — and they're written to `app/.cdk-outputs.json`.

**Action (walk the README's Post-Deploy Verification section):**

```bash
cat ../app/.cdk-outputs.json

aws lambda list-functions \
  --query "Functions[?starts_with(FunctionName,'StepUpAuthStack')].FunctionName" \
  --output table

aws cognito-idp describe-user-pool \
  --user-pool-id "$(jq -r '.StepUpAuthStack.UserPoolId' ../app/.cdk-outputs.json)" \
  --query 'UserPool.Status'

aws dynamodb describe-table \
  --table-name "$(jq -r '.StepUpAuthStack.OtpTableName' ../app/.cdk-outputs.json)" \
  --query 'Table.TableStatus'
```

**Narration:**

> These four commands are the README's "Post-Deploy Verification" section — written for someone
> who isn't me, so they don't have to guess: confirm the four Lambdas exist, the User Pool is
> ACTIVE, the DynamoDB table is ACTIVE. This section is exactly what the last review round asked us
> to add, and it's now a dedicated part of the README.

**Action:**

```bash
cd ../app
npm install
cp .env.example .env
# edit .env — set CLIENT_ID / USER_POOL_ID to the fresh outputs above
node src/setup.js
```

**Narration:**

> Update the app's environment variables and create a test user with `setup.js`, ready for the
> end-to-end run.

---

## Part 3: Repository structure (6:00 - 7:00) — Point 4

**Action:**

```bash
cd /home/ec2-user/cognito-step-up-auth-demo
ls
```

**Narration:**

> Quick tour of the layout, so another SA can navigate this without me.
>
> `infra` is the CDK code we just used. `lambdas` holds the four business-logic functions. `app` is
> the sample app we're about to run.
>
> On docs: `README.md` is the entry point; `DECISIONS.md` is the ADR log we just covered;
> `SECURITY_COMPLIANCE.md` is the security design and risk register, coming up; `docs/quality-findings.md`
> is the full record of the Holmes quality scan findings and fixes — written up in enough detail
> that I won't repeat it on camera; `docs/porting-guide.md` covers reusing this pattern for the
> other two flows.

**Action:**

```bash
ls lambdas/
```

**Narration:**

> Four Lambdas: `define-auth-challenge` is the state machine deciding whether to challenge;
> `create-auth-challenge` generates the OTP, stores it in DynamoDB, and sends it; `verify-auth-challenge`
> validates the answer and prevents replay; `pre-token-generation` injects the `step_up` claims
> before tokens are issued.

---

## Part 4: End-to-end demo run (7:00 - 10:30) — Point 3

**Terminal 1:**

```bash
cd /home/ec2-user/cognito-step-up-auth-demo/app
node src/demo.js
```

**Narration (after Step 1):**

> Step 1, normal sign-in. No `step_up` claim in the initial token.

**Narration (after Step 2):**

> Step 2, the app checks the booking amount. $8,000 exceeds the $5,000 threshold, so step-up is
> required — this is the application-layer check from ADR-007.

**Narration (after Step 3):**

> Step 3, CUSTOM_AUTH kicks off. Cognito calls our Lambda, returns a challenge, and the OTP has
> already gone out.

**Switch to Terminal 2:**

```bash
aws logs tail /aws/lambda/StepUpAuthStack-CreateAuthChallenge --since 2m --follow
```

**Narration:**

> In production this goes to the guest's email; demo mode logs it to CloudWatch so it's visible on
> camera.

**After entering the OTP, once Step 6 prints:**

> Verified. The new token has three extra claims: `step_up` is true, `step_up_at` is the
> verification timestamp, `step_up_booking_amount` is 8,000. The booking and payment services check
> the signature and read these directly — no extra Cognito call.

**Action:** change `.env`'s `BOOKING_AMOUNT` to 3000, run again:

```bash
node src/demo.js
```

**Narration:**

> And the below-threshold case. $3,000 this time — Step 2 decides step-up isn't needed, CUSTOM_AUTH
> never triggers, and the user sees nothing extra. Friction only where it's needed.

---

## Part 5: Security scan walkthrough (10:30 - 12:15) — Point 6

**Action:** Open `infra/lib/step-up-auth-stack.ts` at the `NagSuppressions` block, and
`SECURITY_COMPLIANCE.md` alongside it.

**Narration:**

> The infrastructure code runs cdk-nag's AwsSolutionsChecks. Here's what it found and how each item
> was handled.
>
> **Fixed directly, three items:**
> `AwsSolutions-DDB3` — the DynamoDB table had no point-in-time recovery; I enabled it.
> `AwsSolutions-L1` — Lambda runtime was out of date; upgraded from Node.js 22.x to 24.x.
> `AwsSolutions-COG1` — password policy was missing a special-character requirement; added it.
>
> **Kept and accepted, with a documented reason, three items:**
> `AwsSolutions-IAM4` — the CDK-attached `AWSLambdaBasicExecutionRole` only grants CloudWatch Logs
> write access; scoping a custom role buys no real security benefit, so accepted.
> `AwsSolutions-COG2` — flags no Cognito-level MFA. But the whole project *is* a step-up/MFA
> pattern — the OTP challenge is the second factor. Turning on Cognito MFA as well would conflict
> with the demo's purpose, so not adopted.
> `AwsSolutions-COG8` — recommends Cognito Plus tier; this prototype doesn't need the advanced
> security features, standard tier is sufficient, so accepted as-is.
>
> Beyond cdk-nag, `SECURITY_COMPLIANCE.md` has a full risk register of things intentionally not
> fixed for non-production — `USER_PASSWORD_AUTH` instead of SRP, `RemovalPolicy.DESTROY`, no WAF —
> each with the trigger condition, impact, and why it's acceptable at this stage, plus a production
> promotion checklist at the end of the same file.

---

## Closing: how the customer's team extends this (12:15 - 13:00) — Point 8

**Action:** Open `docs/porting-guide.md`, scroll to the Flow 1 / Flow 2 headings — no need to read
code line by line.

**Narration:**

> Last thing — how the customer's team continues this after I'm gone.
>
> The Define/Create/Verify/Pre-Token-Generation pattern is generic. `docs/porting-guide.md` walks
> through adapting it: loyalty-tier gating just swaps the amount check for reading the
> `custom:loyalty_tier` attribute; the concierge override needs one extra entry point for a
> front-desk-initiated challenge — the architecture difference and an effort estimate for each flow
> are both in that document.
>
> What needs to happen before production is listed in `SECURITY_COMPLIANCE.md`'s Production
> Promotion Checklist — switching to SRP auth, enabling WAF, changing `RemovalPolicy` to `RETAIN`,
> and so on.
>
> Everything's CDK-managed, so the customer's team gets this repo and runs the same two commands I
> just ran — `cdk bootstrap` and `cdk deploy` — in their own account. Thanks.
