# Architecture

## Overview

This implementation uses Amazon Cognito's **Custom Authentication Challenge** flow (`CUSTOM_AUTH`) to enforce a second factor when a booking exceeds a configured dollar threshold. Three Lambda triggers implement a simple state machine. A fourth trigger (Pre-Token Generation) injects a `step_up` claim into the resulting JWT.

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       AWS Account                               │
│                                                                 │
│  ┌──────────────┐     ┌─────────────────────────────────────┐  │
│  │  Booking App │────▶│       Amazon Cognito User Pool       │  │
│  │  (sample)    │◀────│                                     │  │
│  └──────────────┘     │  Triggers:                          │  │
│                       │  ┌────────────────────────────────┐ │  │
│                       │  │ DefineAuthChallenge  (Lambda)   │ │  │
│                       │  │ CreateAuthChallenge  (Lambda)   │─┼──┼──▶ DynamoDB (OTP)
│                       │  │ VerifyAuthChallenge  (Lambda)   │─┼──┼──▶ DynamoDB (OTP)
│                       │  │ PreTokenGeneration   (Lambda)   │ │  │
│                       │  └────────────────────────────────┘ │  │
│                       └─────────────────────────────────────┘  │
│                                         │                       │
│                                         ▼                       │
│                                ┌─────────────────┐             │
│                                │   Amazon SES    │─────▶ Email │
│                                └─────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sequence Diagram — Step-Up Authentication

```
App                    Cognito               DefineAuth   CreateAuth   VerifyAuth   PreTokenGen   DynamoDB   SES
 │                        │                      │            │            │             │            │        │
 │── InitiateAuth ────────▶                      │            │            │             │            │        │
 │   CUSTOM_AUTH           │                      │            │            │             │            │        │
 │   clientMetadata:       │                      │            │            │             │            │        │
 │   { bookingAmount:8000 }│                      │            │            │             │            │        │
 │                         │── DefineAuth ────────▶            │            │             │            │        │
 │                         │                      │ session=[] │            │             │            │        │
 │                         │                      │ amount>5000│            │             │            │        │
 │                         │                      │ ──────────▶ CHALLENGE  │             │            │        │
 │                         │◀─ challengeName ─────│            │            │             │            │        │
 │                         │   CUSTOM_CHALLENGE   │            │            │             │            │        │
 │                         │── CreateAuth ─────────────────────▶            │             │            │        │
 │                         │                                   │ generate   │             │            │        │
 │                         │                                   │ OTP+UUID   │             │            │        │
 │                         │                                   │────────────────────────────────────────▶ PutItem
 │                         │                                   │            │             │            │        │
 │                         │                                   │────────────────────────────────────────────────▶ SendEmail
 │                         │                                   │ { otpId }  │             │            │        │
 │                         │◀─ CUSTOM_CHALLENGE ───────────────│            │             │            │        │
 │◀── ChallengeName ───────│                                   │            │             │            │        │
 │    CUSTOM_CHALLENGE      │                                   │            │             │            │        │
 │    { email: j***@... }  │                                   │            │             │            │        │
 │                                                              │            │             │            │        │
 │  [user checks email, enters OTP]                            │            │             │            │        │
 │                                                              │            │             │            │        │
 │── RespondToChallenge ───▶                                   │            │             │            │        │
 │   ANSWER: 482931         │                                   │            │             │            │        │
 │   clientMetadata:        │                                   │            │             │            │        │
 │   { stepUp: "true" }     │                                   │            │             │            │        │
 │                         │── VerifyAuth ──────────────────────────────────▶             │            │        │
 │                         │                                   │            │ GetItem(otpId)           │        │
 │                         │                                   │            │────────────────────────────▶      │
 │                         │                                   │            │◀─ { otp, expiresAt }──────│        │
 │                         │                                   │            │ timingSafeEqual OK        │        │
 │                         │                                   │            │ DeleteItem(otpId)          │        │
 │                         │                                   │            │────────────────────────────▶      │
 │                         │◀─ answerCorrect=true ─────────────────────────│             │            │        │
 │                         │── DefineAuth ────────▶            │            │             │            │        │
 │                         │                      │ lastResult │            │             │            │        │
 │                         │                      │ =true      │            │             │            │        │
 │                         │                      │ issueTokens│            │             │            │        │
 │                         │◀─ issueTokens=true ──│            │            │             │            │        │
 │                         │── PreTokenGen ─────────────────────────────────────────────▶│            │        │
 │                         │                                   │            │             │ inject     │        │
 │                         │                                   │            │             │ step_up    │        │
 │                         │◀─ claimsOverride ─────────────────────────────────────────│             │        │
 │◀── AuthenticationResult │                                   │            │             │            │        │
 │    { AccessToken,       │                                   │            │             │            │        │
 │      IdToken+step_up,  │                                   │            │             │            │        │
 │      RefreshToken }    │                                   │            │             │            │        │
```

---

## Lambda Trigger State Machine

`DefineAuthChallenge` is the state machine controller. It runs at the beginning of each auth round-trip.

```
InitiateAuth(CUSTOM_AUTH)
        │
        ▼
  session.length == 0 ?
        │
   ─────┴─────
   │         │
  yes        no
   │         │
   ▼         ▼
bookingAmount >      lastChallenge.result == true ?
BOOKING_THRESHOLD ?  ──────────────────────────────
   │                      │                  │
 ──┴──                   yes                no
 │    │                   │                  │
yes  no             issueTokens      failedAttempts >= MAX ?
 │    │                                    │           │
 ▼    ▼                                   yes         no
CUSTOM_ issueTokens                        │           │
CHALLENGE                            failAuth    CUSTOM_CHALLENGE
                                              (retry)
```

---

## Token Claims

After a successful step-up challenge, the ID token contains:

```json
{
  "sub": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "email": "user@example.com",
  "token_use": "id",
  "exp": 1720000000,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXX",

  "step_up": "true",
  "step_up_at": "1720000000",
  "step_up_booking_amount": "8000"
}
```

A booking that is **below** the threshold goes through `DefineAuthChallenge` and gets tokens issued immediately without calling `CreateAuthChallenge`. The resulting tokens do **not** contain `step_up` claims.

### How Downstream Services Use the Claim

```javascript
// Booking API (example — not part of this repo)
function authorizeHighValueBooking(idTokenPayload, bookingAmount) {
  if (bookingAmount <= BOOKING_THRESHOLD) return true; // no step-up needed

  if (idTokenPayload.step_up !== 'true') {
    throw new Error('Step-up authentication required');
  }

  const stepUpAge = Date.now() / 1000 - parseInt(idTokenPayload.step_up_at);
  if (stepUpAge > 900) { // 15 minutes
    throw new Error('Step-up token expired — please re-authenticate');
  }

  const claimedAmount = parseFloat(idTokenPayload.step_up_booking_amount);
  if (claimedAmount < bookingAmount) {
    throw new Error('Step-up was authorized for a lower amount');
  }

  return true;
}
```

---

## DynamoDB Schema

Table: `StepUpAuth-OtpStore-<StackName>`

| Attribute | Type | Description |
|-----------|------|-------------|
| `otpId` (PK) | String | UUID v4, opaque reference stored in Cognito session |
| `otp` | String | 6-digit CSPRNG OTP |
| `userId` | String | Cognito `userName` — binds OTP to a specific user |
| `expiresAt` | Number | Unix epoch (TTL attribute) |
| `createdAt` | Number | Unix epoch (for audit/debugging) |

Records are deleted immediately on successful verification. TTL handles cleanup of unconsumed/failed records.

---

## Key Design Constraints

1. **`privateChallengeParameters` is not a secrets store.** It appears in CloudTrail. Only the opaque `otpId` is stored there.
2. **`DefineAuthChallenge` is called twice per attempt** — once before the challenge (to decide what challenge to issue) and once after (to evaluate the result). The session array grows by one entry per round-trip.
3. **`clientMetadata` does not persist across Lambda calls** within a single auth session. The app must re-send `bookingAmount` and `stepUp` in each `RespondToAuthChallenge` call.
4. **Pre-Token Generation runs once**, just before tokens are issued. It cannot inspect individual session entries — it relies on `clientMetadata` from the final `RespondToAuthChallenge` call.
