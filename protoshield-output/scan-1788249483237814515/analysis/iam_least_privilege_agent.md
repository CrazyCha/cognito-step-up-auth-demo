```json
{
  "tool": "iam_least_privilege",
  "critical": 0,
  "high": 1,
  "medium": 0,
  "low": 0,
  "info": 1,
  "suppressed": 0
}
```

## Iam Least Privilege

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| iam_least_privilege | 0 | 1 | 0 | 0 | 1 | 0 |

<details>
<summary>View Details</summary>

# IAM Least Privilege Analysis

## Project Overview
This is an AWS CDK-based step-up authentication prototype for a booking system. It uses:
- 4 Lambda functions (DefineAuthChallenge, CreateAuthChallenge, VerifyAuthChallenge, PreTokenGeneration)
- 1 DynamoDB table (OTP storage)
- 1 Cognito User Pool
- Optional SES integration for OTP delivery

## Findings

### High Severity

#### Finding 1: SES Wildcard Resource on CreateAuthChallenge Lambda
**File:** infra/lib/step-up-auth-stack.ts (lines 100–108)
**Severity:** High

**Policy Statement:**
```typescript
if (otpDeliveryMode === 'email') {
  createAuthChallengeFn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: 'AllowSESSend',
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    })
  );
}
```

**Issue:**
The policy grants `ses:SendEmail` and `ses:SendRawEmail` on `Resource: "*"`. SES is a sensitive service that can be used to send emails from any verified identity in the account. Although the Lambda code only sends from the configured `FROM_EMAIL` environment variable, the IAM policy does not enforce this restriction at the service boundary.

**Why High Severity:**
- SES is a sensitive service (can send phishing emails, spam, or impersonate other identities)
- Wildcard resource (`*`) allows the Lambda to send from any verified SES identity, not just the intended one
- IAM policy should enforce the boundary, not rely on code logic alone
- This violates the principle of least privilege for sensitive services

**Recommendation:**
Scope the SES permission to the specific verified identity ARN:
```typescript
resources: [`arn:aws:ses:${this.region}:${this.account}:identity/${fromEmail}`]
```

This requires knowing the verified identity ARN at synth time. If the identity is managed outside CDK, pass it as a stack property. The code comment already acknowledges this is a prototype limitation that must be fixed before production.

---

### Info Observations

#### Finding 2: DynamoDB Permissions via CDK Grant Methods
**File:** infra/lib/step-up-auth-stack.ts (lines 94, 121–122)
**Severity:** Info

**Code:**
```typescript
this.otpTable.grantWriteData(createAuthChallengeFn);
this.otpTable.grantReadData(verifyAuthChallengeFn);
this.otpTable.grantWriteData(verifyAuthChallengeFn);
```

**Observation:**
The stack uses CDK's `grantWriteData()` and `grantReadData()` methods to grant DynamoDB permissions. These methods generate scoped inline policies with specific actions (`dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:DeleteItem`) and the table ARN as the resource. This is a best practice and requires no changes.

---

## Policies Reviewed and Approved

### DefineAuthChallenge Lambda
- **File:** infra/lib/step-up-auth-stack.ts (lines 68–77)
- **Status:** ✓ Least-privilege
- **Rationale:** No AWS API permissions required. The function only performs session state machine logic (no external API calls).

### CreateAuthChallenge Lambda
- **File:** infra/lib/step-up-auth-stack.ts (lines 79–108)
- **Status:** ✓ Least-privilege (except SES wildcard noted above)
- **Rationale:** DynamoDB `PutItem` is scoped to the OTP table via `grantWriteData()`. SES permissions are conditional on email delivery mode.

### VerifyAuthChallenge Lambda
- **File:** infra/lib/step-up-auth-stack.ts (lines 110–122)
- **Status:** ✓ Least-privilege
- **Rationale:** DynamoDB `GetItem` and `DeleteItem` are scoped to the OTP table via `grantReadData()` and `grantWriteData()`.

### PreTokenGeneration Lambda
- **File:** infra/lib/step-up-auth-stack.ts (lines 124–130)
- **Status:** ✓ Least-privilege
- **Rationale:** No AWS API permissions required. The function only modifies JWT claims (no external API calls).

### AWSLambdaBasicExecutionRole
- **File:** infra/lib/step-up-auth-stack.ts (lines 190–194)
- **Status:** ✓ Acceptable for prototype
- **Rationale:** CDK automatically attaches this managed policy to all Lambda functions for CloudWatch Logs write access. The stack suppresses the cdk-nag check `AwsSolutions-IAM4` with documented rationale. This is a CDK-generated default policy that cannot be tightened further without custom code. For a prototype, this is acceptable.

---

## Summary

**Total Findings:** 2
- **High:** 1 (SES wildcard resource)
- **Info:** 1 (DynamoDB grant methods observation)

**Action Items:**
1. Before production promotion, scope the SES permission to the specific verified identity ARN.
2. No other IAM policy changes required. DynamoDB and Lambda execution permissions are already least-privilege.

**Prototype Posture:**
The SES wildcard is documented as a known limitation in the code comments and `SECURITY_COMPLIANCE.md` production checklist. For a prototype, this is acceptable with the understanding that it must be fixed before production deployment.

</details>