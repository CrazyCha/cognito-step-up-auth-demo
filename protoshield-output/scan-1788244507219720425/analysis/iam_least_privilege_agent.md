```json
{
  "tool": "iam_least_privilege",
  "critical": 0,
  "high": 1,
  "medium": 0,
  "low": 0,
  "info": 0,
  "suppressed": 0
}
```

## IAM Least Privilege Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| iam_least_privilege | 0 | 1 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Executive Summary

This AWS CDK-based step-up authentication reference implementation was analyzed for IAM least-privilege violations. The project implements Cognito-based multi-factor authentication with Lambda triggers, DynamoDB OTP storage, and SES email delivery.

**Severity Summary:**
- Critical: 0
- High: 1
- Medium: 0
- Low: 0
- Info: 0
- Suppressed: 0

---

### Detailed Findings

#### High Severity

**Finding 1: SES SendEmail/SendRawEmail with Wildcard Resource**

**Location:** `infra/lib/step-up-auth-stack.ts`, lines 92–98

**Policy Statement:**
```typescript
createAuthChallengeFn.addToRolePolicy(
  new iam.PolicyStatement({
    sid: 'AllowSESSend',
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  })
);
```

**Severity Justification:** HIGH
- SES is a sensitive service (email delivery can be abused for spam, phishing, or account takeover)
- Wildcard resource `["*"]` on a sensitive service action violates least privilege
- The Lambda code uses a specific `FROM_EMAIL` environment variable (line 82), but the IAM policy does not enforce this constraint
- An attacker who compromises this Lambda role could send emails from any verified SES identity in the account

**Actual Usage in Code:**
The `CreateAuthChallenge` Lambda (lines 82–99 in `lambdas/create-auth-challenge/index.js`) uses:
```javascript
const FROM_EMAIL = process.env.FROM_EMAIL || '';
// ...
await ses.send(new SendEmailCommand({
  Source: FROM_EMAIL,
  Destination: { ToAddresses: [email] },
  // ...
}));
```

The Lambda is correctly configured to send from a specific email address, but the IAM policy grants permission to send from *any* verified identity.

**Recommendation:**
Scope the SES resource to the specific verified identity being used. Replace the wildcard with the ARN of the verified email identity:

```typescript
if (otpDeliveryMode === 'email') {
  createAuthChallengeFn.addToRolePolicy(
    new iam.PolicyStatement({
      sid: 'AllowSESSend',
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: [
        `arn:aws:ses:${this.region}:${this.account}:identity/${fromEmail}`
      ],
    })
  );
}
```

This ensures the Lambda can only send from the specific verified email address configured for the deployment, preventing unauthorized email sending from other identities.

---

### Policies Reviewed and Approved

**DynamoDB Grants (Least-Privilege):**

1. **CreateAuthChallenge Lambda** (line 89):
   - `this.otpTable.grantWriteData(createAuthChallengeFn)`
   - Correctly scoped to `dynamodb:PutItem` on the specific OTP table only
   - Status: ✓ Least-privilege

2. **VerifyAuthChallenge Lambda** (lines 112–113):
   - `this.otpTable.grantReadData(verifyAuthChallengeFn)`
   - `this.otpTable.grantWriteData(verifyAuthChallengeFn)`
   - Correctly scoped to `dynamodb:GetItem` and `dynamodb:DeleteItem` on the specific OTP table only
   - Status: ✓ Least-privilege

3. **DefineAuthChallenge Lambda** (lines 68–75):
   - No AWS API permissions required; no role policies added
   - Status: ✓ Least-privilege

4. **PreTokenGeneration Lambda** (lines 116–123):
   - No AWS API permissions required; no role policies added
   - Status: ✓ Least-privilege

**Lambda Execution Roles:**
- CDK-generated default Lambda execution roles (CloudWatch Logs write access) are auto-generated and cannot be tightened by the author
- These are not flagged as findings per prototype posture guidance

---

### Recommendations

1. **Immediate (High Priority):** Scope the SES SendEmail/SendRawEmail permission to the specific verified email identity ARN (see Finding 1 above)

2. **Production Promotion:** The `SECURITY_COMPLIANCE.md` document already lists a production promotion checklist that includes:
   - Scope SES `SendEmail` permission to specific verified domain ARN (not `*`)
   - This finding aligns with that existing control requirement

---

### Conclusion

The project demonstrates good least-privilege discipline overall. The DynamoDB grants are appropriately scoped using CDK's `grantReadData()` and `grantWriteData()` helpers. The single high-severity issue is the SES wildcard resource, which is straightforward to fix by scoping to the verified identity ARN. This aligns with the production promotion checklist already documented in the project.

</details>