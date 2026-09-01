# ProtoShield Security Analysis Report

**Analysis Timestamp:** 2026-09-01 06:42:28 UTC<br>
**Project:** cognito-step-up-auth-demo<br>
**Scan ID:** 1788244507219720425<br>
**ProtoShield Version:** 9c5e9606


> ⚠️ **INCOMPLETE COVERAGE: One or more scanners could not fully analyze this project**
>
> - **CDK NAG**: cdk.out for CDK project 'infra' contains no CDK NAG reports (*NagReport.csv); apply cdk-nag Aspects (e.g. AwsSolutionsChecks) to your CDK app and re-synth for CDK NAG coverage.
>
> These scanners ran but could not analyze part of the project (for example a dependency manifest with no lock file), so the affected areas were NOT scanned and issues there may go undetected — this is not a clean pass. See "Incomplete Scan Coverage" below.

# Security Analysis Report - Executive Summary

## Overview

The cognito-step-up-auth-demo project is an AWS CDK-based reference implementation for Cognito-based multi-factor authentication with step-up authentication flows. The security scan analyzed infrastructure code, application code, dependencies, and compliance requirements across the project.

## Key Findings

### Critical Issues: 1
### High Severity Issues: 11
### Medium Severity Issues: 1
### Low Severity Issues: 0

## Summary by Tool


| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| [License Headers](#license-headers) | 0 | 10 | 0 | 0 | 0 | 0 |
| [Semgrep](#semgrep) | 0 | 0 | 0 | 0 | 0 | 0 |
| [CDK NAG](#cdk-nag) | 1 | 0 | 0 | 0 | 0 | 0 |
| [CVE Scan](#cve-scan) | 0 | 0 | 1 | 0 | 0 | 0 |
| [Checkov](#checkov) | 0 | 0 | 0 | 0 | 0 | 0 |
| [Secrets](#secrets) | 0 | 0 | 0 | 0 | 0 | 0 |
| [IAM Least Privilege](#iam-least-privilege) | 0 | 1 | 0 | 0 | 0 | 0 |
## Recommendations by Priority

### Immediate Actions (Critical/High)

1. **CDK NAG Analysis Gap (Critical):** The CDK infrastructure project was not synthesized with CDK NAG Aspects applied. Add `AwsSolutionsChecks` to your CDK app and re-synthesize to enable security analysis of infrastructure code.

2. **License Header Compliance (10 High):** All 9 source files are missing required Apache 2.0 license headers, and no project-root license file exists. Add a LICENSE file to the project root and license headers to all source files using appropriate comment syntax for each file type.

3. **IAM Least Privilege - SES Wildcard Resource (1 High):** The CreateAuthChallenge Lambda has SES SendEmail/SendRawEmail permissions scoped to wildcard resources (`*`). Scope this to the specific verified email identity ARN to prevent unauthorized email sending.

### Short-term Actions (Medium)

1. **esbuild CORS Vulnerability (1 Medium):** Upgrade esbuild from version 0.21.5 to 0.25.0 or later to address a development server CORS vulnerability (GHSA-67mh-4wv8-2f99). Update both `package.json` and `infra/package.json`, then run `npm install`.

### Long-term Improvements (Low)

No low-severity issues identified. Continue maintaining current security practices and integrate security scanning into your CI/CD pipeline.

## Positive Findings

The following scanners found zero issues:

- **Semgrep:** No code security policy violations detected
- **Checkov:** No infrastructure misconfigurations detected
- **Secrets:** No hardcoded credentials or secrets detected

## Conclusion

The project demonstrates a solid security foundation with clean code analysis and no infrastructure misconfigurations. The primary focus should be on resolving the critical CDK NAG analysis gap, addressing license compliance, and fixing the IAM least-privilege violation for SES permissions. The medium-severity esbuild vulnerability should be addressed as part of routine dependency maintenance.

---

## Remediation Response

**Response Date:** 2026-09-01<br>
**Reviewer:** Project Owner

The following table documents the disposition of every finding from this scan.

| # | Finding | Severity | Disposition | Notes |
|---|---------|----------|-------------|-------|
| 1 | CDK NAG Analysis Gap | Critical | **Resolved** | Integrated `cdk-nag` with `AwsSolutionsChecks` Aspect in `infra/bin/app.ts`. Commit `7967184`. |
| 2 | Missing LICENSE file | High | **Resolved** | Added Apache 2.0 LICENSE to project root. Commit `dfdea4d`. |
| 3 | Missing license headers (9 files) | High | **Resolved** | Added SPDX-License-Identifier headers to all 9 source files. Commit `dfdea4d`. |
| 4 | SES SendEmail/SendRawEmail wildcard resource (`*`) | High | **Accepted — Not Applicable** | This demo project uses `otpDeliveryMode=console` (OTP printed to CloudWatch Logs). The SES policy is only attached when `otpDeliveryMode=email`, which is not the active configuration. Furthermore, the `ses:SendEmail` and `ses:SendRawEmail` actions require a wildcard resource when the specific SES verified identity ARN is not known at CDK synth time — the ARN depends on the operator's SES domain/email verification setup and cannot be hardcoded in a reusable reference implementation. The code includes an inline comment documenting this decision and noting that production deployments must scope the resource to a specific identity ARN. See `infra/lib/step-up-auth-stack.ts` line 94. |
| 5 | esbuild CORS vulnerability (GHSA-67mh-4wv8-2f99) | Medium | **Accepted — Risk Acknowledged** | This CVE affects only the esbuild development server (`--serve` mode), which is never used in this project. esbuild is used solely as a CDK bundling tool at synth/deploy time and does not run a dev server. The vulnerability requires both network access (AV:N) and user interaction (UI:R) against a running dev server, a scenario that does not apply here. No runtime or production exposure exists. |

---
---


## License Headers

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| license_headers | 0 | 10 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Compliance Summary

The project has **0% license header compliance**. Out of 9 source files scanned, **0 files** carry the required Apache 2.0 license header, and **9 files** are missing it. Additionally, no project-root license file was found.

**Compliance Metrics:**
- Files scanned: 9
- Files with Apache 2.0 header: 0
- Files missing header: 9
- Compliance rate: 0%
- License file found: No

### High Severity Issues

#### Missing Project-Root License File
The project is missing a license file at the root directory. A LICENSE, LICENSE.txt, LICENSE.md, or COPYING file should be present to document the Apache 2.0 license for the entire project.

#### Missing License Headers in Source Files
All 9 source files are missing the required Apache 2.0 license header. Each file should begin with an appropriate license header comment using the correct syntax for its file type.

**Affected Files/Locations:**

**JavaScript/Node.js Files (5 files):**
- app/src/auth.js
- app/src/demo.js
- app/src/setup.js
- lambdas/create-auth-challenge/index.js
- lambdas/define-auth-challenge/index.js
- lambdas/pre-token-generation/index.js
- lambdas/verify-auth-challenge/index.js

**TypeScript Files (2 files):**
- infra/bin/app.ts
- infra/lib/step-up-auth-stack.ts

### Recommendations

1. **Add Project-Root License File**
   - Create a LICENSE file in the project root containing the full Apache 2.0 license text
   - This establishes the default license for the entire project

2. **Add License Headers to All Source Files**
   - Add the Apache 2.0 license header to every source file missing it
   - Use the correct comment syntax for each file type:
     - **JavaScript/TypeScript files:** Use `/* */` block comments
     - **Python files:** Use `#` line comments
     - **Shell scripts:** Use `#` line comments
   - Example header for JavaScript/TypeScript:
     ```javascript
     /*
      * Copyright [YEAR] [Your Organization]
      * Licensed under the Apache License, Version 2.0 (the "License");
      * you may not use this file except in compliance with the License.
      * You may obtain a copy of the License at
      *
      *     http://www.apache.org/licenses/LICENSE-2.0
      *
      * Unless required by applicable law or agreed to in writing, software
      * distributed under the License is distributed on an "AS IS" BASIS,
      * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
      * See the License for the specific language governing permissions and
      * limitations under the License.
      */
     ```

3. **Keep Copyright Years Current**
   - Use the current year in copyright notices rather than copying older years from existing files
   - Update copyright years annually as needed

4. **Establish a Pre-Commit Hook**
   - Consider implementing a pre-commit hook to automatically check for license headers on new files
   - This prevents future compliance violations

</details>

---


## Semgrep

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| semgrep | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Scan Summary

The Semgrep scan completed successfully with no findings or errors detected.

**Scan Results:**
- Total Findings: 0
- Critical Issues: 0
- High Severity Issues: 0
- Medium Severity Issues: 0
- Low Severity Issues: 0
- Info Level Issues: 0
- Suppressed Findings: 0
- Scan Errors: 0

### Analysis

The Semgrep security analysis found no security issues in the scanned codebase. This indicates that:

1. **No Policy Violations**: The code does not violate any of the Semgrep rules that were configured for this scan
2. **No Coverage Gaps**: The scan completed without errors, meaning all files were successfully analyzed
3. **Clean Baseline**: The codebase appears to be free of the security patterns that Semgrep is configured to detect

### Recommendations

- **Maintain Current Standards**: Continue following secure coding practices that have resulted in this clean scan
- **Regular Scanning**: Integrate Semgrep into your CI/CD pipeline to catch any new issues as code is added or modified
- **Rule Updates**: Periodically review and update Semgrep rules to ensure coverage of emerging security threats
- **Code Review**: While Semgrep found no issues, continue performing manual code reviews as part of your security process

</details>

### Suppression Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| semgrep_suppressions | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Finding Summary

After a comprehensive search of the project at `/project`, **no Semgrep suppressions were found** in the codebase.

### Search Methodology

The following deterministic search patterns were applied across all source files:

1. **Inline suppression markers:**
   - `nosemgrep` — No matches
   - `# nosemgrep:` — No matches
   - `semgrep-disable` — No matches
   - `nosec` — No matches

2. **Configuration files:**
   - `.semgrep.yml` — Not found
   - `.semgrep.yaml` — Not found
   - `semgrep.yml` — Not found

3. **Files analyzed:**
   - `app/src/auth.js` — No suppressions
   - `app/src/demo.js` — No suppressions
   - `app/src/setup.js` — No suppressions
   - `lambdas/create-auth-challenge/index.js` — No suppressions
   - `lambdas/define-auth-challenge/index.js` — No suppressions
   - `lambdas/verify-auth-challenge/index.js` — No suppressions
   - `lambdas/pre-token-generation/index.js` — No suppressions
   - `infra/lib/step-up-auth-stack.ts` — No suppressions
   - `infra/bin/app.ts` — No suppressions
   - All configuration files (package.json, tsconfig.json, cdk.json) — No suppressions

### Conclusion

The project contains **zero Semgrep suppressions**. All code is analyzed without any inline or configuration-based suppression directives.

**Positive Implications:**
- No hidden or undocumented suppressions masking potential security issues
- Full transparency in the codebase regarding security scanning
- No need to evaluate suppression justifications or scope
- Clean security posture with respect to suppression governance

### Severity Assessment

| Severity | Count | Rationale |
|----------|-------|-----------|
| Critical | 0 | No suppressions found; suppressions are not themselves critical findings |
| High | 0 | No questionable suppressions hiding potentially real issues |
| Medium | 0 | No broadly-scoped or undocumented suppressions |
| Low | 0 | No minor/ambiguous suppression cases |
| Info | 0 | No acceptable, well-justified suppressions to document |
| Suppressed | 0 | No suppressed findings |

</details>

---


## CDK NAG

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| cdknag | 1 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Coverage Gap - Critical Issue

**Status:** ⚠️ **CDK NAG ANALYSIS INCOMPLETE**

CDK NAG was unable to analyze the CDK infrastructure project. The scanner detected a critical coverage gap:

**Issue:** The CDK project 'infra' was not synthesized with CDK NAG Aspects applied. The `cdk.out` directory contains no CDK NAG reports (`*NagReport.csv` files), which are required for security analysis.

**Root Cause:** CDK NAG Aspects (such as `AwsSolutionsChecks`) must be explicitly added to your CDK application and the project must be re-synthesized to generate the necessary reports.

**Affected Project:**
- `infra` - CDK infrastructure project

### Resolution Steps

To enable CDK NAG analysis, follow these steps:

1. **Add CDK NAG to your CDK app** (`infra/bin/app.ts`):
   ```typescript
   import { AwsSolutionsChecks } from 'cdk-nag';
   import { Aspects } from 'aws-cdk-lib';
   
   const app = new cdk.App();
   new StepUpAuthStack(app, 'StepUpAuthStack');
   
   // Add CDK NAG checks
   Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
   ```

2. **Re-synthesize the CDK project:**
   ```bash
   cd infra
   cdk synth
   ```

3. **Re-run the security scan:**
   ```bash
   cdk-nag scan
   ```

### Recommendations

- **Immediate Action:** Apply CDK NAG Aspects to your CDK application and re-synthesize to generate the required reports
- **Best Practice:** Integrate CDK NAG checks into your CI/CD pipeline to catch security issues early
- **Documentation:** Refer to the [CDK NAG documentation](https://github.com/cdklabs/cdk-nag) for available checks and configuration options
- **Suppression:** Once analysis is enabled, use CDK NAG suppression rules for any findings that are intentional or require exceptions

</details>

### Suppression Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| cdknag_suppressions | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Finding Summary

After a comprehensive search of the project at `/project`, **no CDK NAG suppressions were found**.

The project structure includes:
- **Infrastructure**: TypeScript CDK stack (`infra/lib/step-up-auth-stack.ts`) defining Cognito User Pool, Lambda functions, and DynamoDB table
- **Application**: Node.js demo app with authentication flows
- **Lambda Functions**: Four Cognito trigger functions for custom authentication

**Search Results:**
- No matches for `NagSuppressions.addResourceSuppressions`, `NagSuppressions.addStackSuppressions`, `addResourceSuppressionsByPath`, or related suppression APIs
- No CDK NAG package (`@aws-cdk-lib/aws-nag` or `cdk-nag`) in `infra/package.json` dependencies
- No suppression configuration in `cdk.json`
- No suppression comments or markers in any TypeScript or JavaScript files

**Conclusion:**
The project does not currently use CDK NAG or contain any suppressions to review. The CDK stack is implemented without NAG integration, meaning no suppressions are present to evaluate for least-privilege or justification quality.

### Recommendations

1. **Consider enabling CDK NAG** for infrastructure security scanning if not already planned
2. **If CDK NAG is enabled in the future**, ensure all suppressions include:
   - Specific, documented justifications
   - Narrowly-scoped resource targeting (avoid blanket suppressions)
   - References to architectural decisions or compliance requirements
3. **Review the existing CDK stack** for potential security best practices:
   - The stack uses reasonable defaults (encryption, least-privilege IAM, removal policies)
   - Consider adding explicit security group rules if Lambda functions need network isolation
   - Verify SES permissions are scoped appropriately when email delivery is enabled

</details>

---


## CVE Scan

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| cve | 0 | 0 | 1 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Medium Severity Issues

**GHSA-67mh-4wv8-2f99: esbuild Development Server CORS Vulnerability**

esbuild versions prior to 0.25.0 contain a vulnerability that enables any website to send requests to the development server and read the response. This is a cross-origin request forgery (CORS) issue that could allow attackers to access sensitive information from the development server.

- **Affected Package:** esbuild
- **Installed Version:** 0.21.5
- **Fixed Version:** 0.25.0
- **CVSS Score:** 5.3 (Medium)
- **CVSS Vector:** CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:N/A:N
- **CWE:** CWE-346 (Origin Validation Error)

**Affected Files/Locations:**
- infra/package-lock.json
- package-lock.json

**References:**
- https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99
- https://github.com/evanw/esbuild/commit/de85afd65edec9ebc44a11e245fd9e9a2e99760d

### Affected Packages

- **esbuild** (0.21.5) - Development build tool with CORS vulnerability in development server

### Recommendations

1. **Immediate Action:** Upgrade esbuild to version 0.25.0 or later across all dependency files:
   - Update `infra/package.json` and `package.json` to require esbuild >= 0.25.0
   - Run `npm install` to update both `infra/package-lock.json` and `package-lock.json`

2. **Development Server Security:** While upgrading, ensure the development server is not exposed to untrusted networks. The vulnerability requires user interaction (UI:R) and has high complexity (AC:H), so it primarily affects development environments.

3. **Verification:** After upgrading, verify the new version is installed:
   ```
   npm list esbuild
   ```

4. **Lock File Management:** Ensure both lock files are committed to version control to maintain consistent dependency versions across the team.

</details>

---


## Checkov

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| checkov | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Scan Summary

The Checkov infrastructure security scan completed successfully with **no findings** reported.

**Scan Results:**
- Total Findings: 0
- Critical Issues: 0
- High Severity Issues: 0
- Medium Severity Issues: 0
- Low Severity Issues: 0
- Informational Issues: 0
- Suppressed Issues: 0
- Scan Errors: 0

### Analysis

The Checkov scan of the infrastructure code found no security violations or misconfigurations. This indicates that:

1. **Infrastructure as Code Compliance**: The CDK infrastructure definitions appear to follow security best practices
2. **No Coverage Gaps**: The scan completed without errors, indicating full coverage of the infrastructure code
3. **Security Posture**: The current infrastructure configuration meets Checkov's security policy requirements

### Recommendations

While no issues were detected:

1. **Maintain Security Standards**: Continue following infrastructure security best practices
2. **Regular Scanning**: Perform regular Checkov scans as part of your CI/CD pipeline to catch any regressions
3. **Policy Updates**: Review and update Checkov policies periodically to align with evolving security standards
4. **Code Review**: Maintain code review practices to ensure security considerations are addressed during development

</details>

### Suppression Analysis

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

---


## Secrets

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| secrets | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Scan Summary

The Gitleaks secret scan completed successfully with no findings. The scan identified zero secrets across all severity levels.

**Key Findings:**
- No critical secrets detected
- No high-severity secrets detected
- No medium-severity secrets detected
- No low-severity secrets detected
- No informational findings
- No suppressed findings
- No scan errors or coverage gaps

### Recommendations

The codebase appears to be clean with respect to hardcoded secrets and credentials. Continue to maintain security best practices:

1. **Maintain Secret Management Practices**: Continue using environment variables, secure vaults, or configuration management systems for sensitive credentials
2. **Pre-commit Hooks**: Consider implementing Gitleaks as a pre-commit hook to prevent accidental secret commits
3. **Regular Scanning**: Periodically run secret scanning as part of your CI/CD pipeline
4. **Code Review**: Maintain code review practices to catch any potential secrets before they reach the repository

</details>

### Suppression Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| secrets_suppressions | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Summary

After a comprehensive search of the project at `/project`, **no Secrets suppressions were found** in the codebase.

### Search Methodology

I performed the following deterministic searches to locate all Secrets suppressions:

1. **Direct suppression markers**: Searched for `gitleaks:allow` pattern — no matches found
2. **Configuration files**: Checked for `.gitleaksignore`, `.gitleaks.toml`, and `gitleaks.toml` — none present in the project
3. **Inline suppressions**: Searched for common suppression patterns including:
   - `gitleaks` (any context)
   - `secret.*suppress|suppress.*secret`
   - `nosec|noqa.*secret|secret.*noqa`
   - `#.*gitleaks|gitleaks.*#`

4. **Source code review**: Examined all source files in the project:
   - Application code (`app/src/auth.js`, `app/src/demo.js`, `app/src/setup.js`)
   - Lambda functions (all four Cognito triggers: `create-auth-challenge`, `define-auth-challenge`, `pre-token-generation`, `verify-auth-challenge`)
   - Infrastructure code (`infra/lib/step-up-auth-stack.ts`, `infra/bin/app.ts`)
   - Configuration files (`.env.example`, `cdk.json`, `package.json`, `.gitignore`)

### Findings

The project contains **zero Secrets suppressions**. All code is either:
- Non-sensitive (application logic, infrastructure definitions, documentation)
- Properly handled (credentials in `.env` files which are in `.gitignore`)
- Documented (example credentials in `.env.example` for reference)

### Conclusion

No Secrets suppressions were found to evaluate. The project does not use `gitleaks:allow` markers or configuration-based suppressions. Therefore, there are no questionable or acceptable suppressions to report.

**Result**: All-zero severity counts — no suppressions to analyze.

</details>

---


## IAM Least Privilege

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

---

## Scanners Not Run

The following scanners were not run because they were not relevant to this project. This is an intentional selection decision, not a failure. Scanner failures, when they occur, are reported in each scanner's own detail section.

| Scanner | Reason |
|---------|--------|
| bandit | no project files matched trigger patterns [*.py **/*.py] |
| cfnnag | no project files matched trigger patterns [*.template **/*.template template.json template.yaml] |

---

## Incomplete Scan Coverage

> ⚠️ **Coverage gap:** the following scanners ran but could not analyze part of the project, so those areas were left unscanned. Their sections reflect only what could be analyzed — treat the unscanned areas as unknown, not clean.

A common cause is a dependency manifest with no lock file, so its dependency tree cannot be resolved. Add and commit the appropriate lock file and re-run the scan for full coverage.

| Scanner | Coverage gap |
|---------|--------------|
| CDK NAG | cdk.out for CDK project 'infra' contains no CDK NAG reports (*NagReport.csv); apply cdk-nag Aspects (e.g. AwsSolutionsChecks) to your CDK app and re-synth for CDK NAG coverage. |
