# Porting Guide

How to adapt the step-up auth pattern from this reference implementation to the other two custom auth flows: **loyalty-tier gating** and **concierge desk override**.

The three Lambda trigger functions (Define / Create / Verify) plus the Pre-Token Generation trigger are the only code that changes between flows. The Cognito User Pool, app client, and DynamoDB OTP table structure remain the same.

---

## Pattern Summary

Every custom auth flow follows the same structure:

```
DefineAuthChallenge  → decides WHETHER a challenge is needed and WHICH type
CreateAuthChallenge  → generates the challenge artifact (OTP, token, redirect URL, etc.)
VerifyAuthChallenge  → validates the user's response against the artifact
PreTokenGeneration   → injects a custom claim into the token when auth succeeds
```

The step-up implementation uses booking amount as the signal. The other two flows use different signals and artifacts, but the wiring is identical.

---

## Flow 1: Loyalty-Tier Gating (Silver / Gold / Platinum)

### Purpose
After a user signs in, route them to the correct experience based on their loyalty tier. Tiers may be stored as a Cognito custom attribute (`custom:loyalty_tier`) or in an external CRM.

### Changes Required

#### `DefineAuthChallenge`
Replace the `bookingAmount > BOOKING_THRESHOLD` check with a tier lookup:

```javascript
// Instead of checking bookingAmount, check the user's tier
const tier = event.request.userAttributes['custom:loyalty_tier'] || 'NONE';

if (session.length === 0) {
  if (['SILVER', 'GOLD', 'PLATINUM'].includes(tier)) {
    // Tier found in user attributes — issue tokens with the tier claim
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
  } else {
    // Tier unknown — issue a challenge to trigger a CRM lookup in CreateAuthChallenge
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
  }
  return event;
}
// ...rest of state machine unchanged
```

If the tier is always in Cognito attributes (synced from CRM at sign-up), `DefineAuthChallenge` can skip the challenge entirely and just check the attribute. No `CreateAuthChallenge` call is needed.

#### `CreateAuthChallenge`
Only needed if the tier must be resolved at auth time (e.g., from an external API):

```javascript
// Call CRM API to look up tier
const tier = await lookupTierFromCrm(event.request.userAttributes.email);

// Store tier in a DynamoDB record keyed by a session token
const sessionToken = crypto.randomUUID();
await ddb.send(new PutItemCommand({
  TableName: TIER_LOOKUP_TABLE,
  Item: {
    sessionToken: { S: sessionToken },
    tier: { S: tier },
    expiresAt: { N: (Math.floor(Date.now() / 1000) + 60).toString() },
  },
}));

event.response.privateChallengeParameters = { sessionToken };
event.response.publicChallengeParameters = { tierResolved: 'true' };
// No OTP to present to the user — this is a silent server-side check
event.response.challengeMetadata = sessionToken;
```

#### `VerifyAuthChallenge`
Validate the tier resolution:

```javascript
const { sessionToken } = event.request.privateChallengeParameters;
// Look up tier from DynamoDB
const result = await ddb.send(new GetItemCommand({ ... }));
const tier = result.Item?.tier?.S;

// The "answer" in this flow is empty string or a known sentinel
// — the app just needs to acknowledge the challenge
event.response.answerCorrect = !!tier;
event.response.claimsToAddOrOverride = { 'custom:resolved_tier': tier };
```

#### `PreTokenGeneration`
Inject the tier claim:

```javascript
if (clientMetadata?.loyaltyTierResolved === 'true') {
  event.response.claimsOverrideDetails.claimsToAddOrOverride = {
    loyalty_tier: clientMetadata.resolvedTier || 'NONE',
  };
}
```

#### App-side changes
In `initiateStepUp`, replace `bookingAmount` with:
```javascript
ClientMetadata: { loyaltyTierCheck: 'true' }
```

---

## Flow 2: Concierge Desk Override

### Purpose
A staff member at the concierge desk (not the end user) approves a customer action (e.g., waiving a cancellation fee, applying a discount). The override must be:
- Time-bounded (expires in minutes)
- Attributed to the staff member (audit trail)
- Scoped to the specific action

### Architecture Difference
This flow has **two actors**: the customer (in the app) and the concierge (in an admin console). The challenge is initiated on the customer's session, but the approval happens via the concierge's admin tool.

```
Customer App      Cognito           Admin Console (concierge)
     │                │                      │
     │── initiate ────▶                       │
     │   override      │── CreateChallenge ──▶│
     │                 │                      │── look up override code ──▶ DynamoDB
     │                 │◀─ { overrideId } ────│
     │◀─ "awaiting     │                      │
     │   approval" ────│                      │
     │                 │      [concierge approves in admin console]
     │                 │                      │── approve(overrideId) ──▶ DynamoDB (status=APPROVED)
     │── poll / submit ▶                      │
     │   answer=       │── VerifyChallenge ──▶│
     │   overrideId    │                      │── GetItem(overrideId) ──▶ DynamoDB
     │                 │                      │◀─ { status: APPROVED } ──│
     │                 │◀─ answerCorrect=true ─│
     │◀── step-up ─────│                      │
     │    tokens        │                      │
```

### Changes Required

#### New: Override Approval Table
Add a DynamoDB table with:
- `overrideId` (PK)
- `status`: `PENDING` | `APPROVED` | `REJECTED`
- `approvedBy`: concierge staff ID
- `action`: what was approved (e.g., `WAIVE_CANCELLATION_FEE`)
- `customerId`: bound to specific customer session
- `expiresAt`: TTL (e.g., 5 minutes)

#### `CreateAuthChallenge`
Generate an override request (not an OTP):

```javascript
const overrideId = crypto.randomUUID();
await ddb.send(new PutItemCommand({
  TableName: OVERRIDE_TABLE,
  Item: {
    overrideId: { S: overrideId },
    customerId: { S: event.userName },
    action: { S: clientMetadata.overrideAction },
    status: { S: 'PENDING' },
    expiresAt: { N: (now + 300).toString() },
  },
}));

// Notify concierge (SNS topic, WebSocket, polling — depends on admin console design)
await notifyConcierge(overrideId, event.userName, clientMetadata.overrideAction);

event.response.publicChallengeParameters = {
  overrideId,
  message: 'A concierge override request has been submitted. Please wait for approval.',
};
event.response.privateChallengeParameters = { overrideId };
```

#### `VerifyAuthChallenge`
Check if the concierge approved the request:

```javascript
const { overrideId } = event.request.privateChallengeParameters;
const result = await ddb.send(new GetItemCommand({ ... }));
const status = result.Item?.status?.S;
const approvedBy = result.Item?.approvedBy?.S;

event.response.answerCorrect = status === 'APPROVED';

// The answer from the customer app can be the overrideId itself
// — the real verification is the concierge's approval in DynamoDB
```

#### `PreTokenGeneration`
Inject the override claim:

```javascript
if (clientMetadata?.overrideApproved === 'true') {
  event.response.claimsOverrideDetails.claimsToAddOrOverride = {
    concierge_override: 'true',
    override_action: clientMetadata.overrideAction,
    override_approved_by: clientMetadata.approvedBy,
    override_at: Math.floor(Date.now() / 1000).toString(),
  };
}
```

### Effort Estimate
- Lambda changes: 2–3 days
- Admin console integration (polling/WebSocket): 3–5 days
- Testing and documentation: 1–2 days
- **Total: 5–8 days**

---

## Common Porting Checklist

For each new flow:

- [ ] Identify the **signal** that triggers the challenge (booking amount, tier, override request)
- [ ] Identify the **artifact** (OTP, tier token, override ID)
- [ ] Identify the **verifier** (user enters code, server resolves tier, concierge approves)
- [ ] Identify the **claim** to inject into the token
- [ ] Update `DefineAuthChallenge` state machine
- [ ] Update or replace `CreateAuthChallenge` artifact generator
- [ ] Update or replace `VerifyAuthChallenge` validator
- [ ] Update `PreTokenGeneration` claim injection
- [ ] Update `clientMetadata` keys in the app
- [ ] Add any new DynamoDB tables to the CDK stack
- [ ] Update `SECURITY_COMPLIANCE.md` with new risk entries
- [ ] Update `DECISIONS.md` with new ADRs for flow-specific choices
- [ ] Update `PROGRESS.md`
