```json
{
  "tool": "checkov_suppressions",
  "critical": 0,
  "high": 0,
  "medium": 0,
  "low": 0,
  "info": 0,
  "suppressed": 0
}
```

## Suppression Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| checkov_suppressions | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Summary

After a comprehensive search of the project at `/project`, **no Checkov suppressions were found** in this codebase.

### Search Methodology

I performed deterministic searches for all common Checkov suppression markers:
- Inline suppressions: `checkov:skip=` and `checkov.io/skip`
- Configuration files: `.checkov.yaml`, `.checkov.yml`, `checkov.yaml`, `checkov.yml`
- General suppression patterns in context

### Project Structure

The project is a reference implementation of Cognito step-up authentication for hotel bookings, consisting of:

**Infrastructure (AWS CDK - TypeScript):**
- `infra/lib/step-up-auth-stack.ts` — Main CDK stack defining Cognito User Pool, Lambda triggers, DynamoDB table, and IAM roles
- `infra/bin/app.ts` — CDK app entry point
- `infra/cdk.json` — CDK configuration

**Lambda Functions (Node.js 22.x):**
- `lambdas/define-auth-challenge/index.js` — State machine for challenge flow
- `lambdas/create-auth-challenge/index.js` — OTP generation and delivery
- `lambdas/verify-auth-challenge/index.js` — OTP validation with constant-time comparison
- `lambdas/pre-token-generation/index.js` — JWT claim injection

**Application (Node.js):**
- `app/src/auth.js` — Cognito auth helpers
- `app/src/demo.js` — End-to-end demo script
- `app/src/setup.js` — Test user creation

**Documentation:**
- `DECISIONS.md` — Architecture decision records (ADRs)
- `SECURITY_COMPLIANCE.md` — Security design and risk register
- `NEXT_STEPS.md` — Production roadmap
- `docs/architecture.md` — Technical deep-dive
- `docs/porting-guide.md` — Porting instructions

### Findings

**No Checkov suppressions detected.** The codebase does not use Checkov suppression syntax or configuration files. All instances of words like "skip" or "suppress" found in the search were in non-suppression contexts (e.g., documentation, setup scripts, TypeScript compiler options).

### Conclusion

Since no Checkov suppressions exist in this project, there are no suppressions to evaluate for least-privilege, justification quality, or scope. The project does not currently use Checkov for infrastructure scanning, or if it does, no suppressions have been declared in the source code.

</details>