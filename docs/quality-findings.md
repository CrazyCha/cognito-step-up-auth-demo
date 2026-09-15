# Quality Findings — Holmes Scan Record

Written record of the Holmes quality scans run against this repository, satisfying the
D7/D8 written-evidence path for reviewers who want findings + rationale without relying
on the recording alone.

---

## Scan 1 (baseline): `254c1210-09a8-4802-9619-587f29801ed2`

- **Template:** HolmesCDE
- **Rubric:** CDE Evaluation Rubric v2 (12 dimensions)
- **Objects scanned:** 56
- **Findings:** 3 (all severity: high)

| # | Dimension | File | Finding | Fix commit |
|---|-----------|------|---------|-------------|
| 1 | Deployment and Operational Guide | `README.md` | No post-deploy verification procedure — Quick Start deployed infra and ran the demo, but gave a non-author no way to confirm the deployment itself succeeded (stack outputs present, Lambdas created, User Pool active, DynamoDB table active). | `aa22e22` — added a dedicated Post-Deploy Verification section with CLI checks for each resource. |
| 2 | README Completeness | `README.md` | No consolidated "Known Limitations" section — a new engineer reading top-to-bottom would not learn what's prototype-only (e.g. `USER_PASSWORD_AUTH`, `RemovalPolicy.DESTROY`, wildcard SES resource, console OTP mode) without jumping to `SECURITY_COMPLIANCE.md`. | `aa22e22` — added a Known Limitations table directly in the README, linking out to `SECURITY_COMPLIANCE.md` for full detail. |
| 3 | Code Readability and Style | `app/src/demo.js` | Dead code — `USER_POOL_ID` was read from `process.env` but never referenced anywhere in the file; the required-env guard checked `CLIENT_ID`/`EMAIL`/`PASSWORD` but omitted it too. | `72c6672` — removed the unused variable. |

## Scan 2 (rescan): `fe1635c0`

- **Template:** HolmesCDE
- **Rubric:** CDE Evaluation Rubric v2 (12 dimensions)
- **Result:** 0 findings — 10/12 dimensions scored *exemplary*, 2/12 scored *acceptable*
- Run after the three fixes above (and the earlier cdk-nag remediation, see below) were committed and pushed.

**Read on the two "acceptable" (not "exemplary") dimensions:** the scan report did not break down
which two dimensions landed at "acceptable" rather than "exemplary" — the rescan summary reported
counts, not a per-dimension breakdown. Given the fix history, the most likely candidates are
**Test Coverage and Quality** (17 unit tests across the four Lambda handlers, but no integration
test against a live Cognito User Pool) and **Cost Analysis Documentation** (pilot/production
estimates exist in `DECISIONS.md` but are not broken out by AWS service line item). Neither was
flagged as a finding, so no further action was required to clear the scan — this is noted here for
completeness, not as an open item.

---

## Related: cdk-nag (AWS Solutions security scan)

Run separately from Holmes, via `cdk-nag`'s `AwsSolutionsChecks` pack on `cdk synth`/`cdk deploy`.
Findings and disposition (commit `d987869`):

**Fixed directly:**
- `AwsSolutions-DDB3` — enabled Point-in-Time Recovery on the OTP DynamoDB table.
- `AwsSolutions-L1` — upgraded all four Lambda functions from Node.js 22.x to 24.x.
- `AwsSolutions-COG1` — password policy now requires special characters.

**Suppressed, with justification (`NagSuppressions`):**
- `AwsSolutions-IAM4` — the CDK-auto-attached `AWSLambdaBasicExecutionRole` grants only CloudWatch
  Logs write access; scoping a custom role would not reduce privilege.
- `AwsSolutions-COG2` — the CUSTOM_AUTH OTP challenge *is* the second factor this project
  implements. Turning on Cognito-level MFA as well would conflict with the demo's purpose.
- `AwsSolutions-COG8` — Cognito Plus tier is not required for this prototype; standard tier covers
  everything the step-up flow needs.

Full risk register (including risks accepted for non-production use, e.g. `USER_PASSWORD_AUTH`,
`RemovalPolicy.DESTROY`, no WAF) lives in [`SECURITY_COMPLIANCE.md`](../SECURITY_COMPLIANCE.md).
