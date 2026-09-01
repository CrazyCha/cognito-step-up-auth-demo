# ProtoShield Security Analysis Report

**Analysis Timestamp:** 2026-09-01 08:03:51 UTC<br>
**Project:** cognito-step-up-auth-demo<br>
**Scan ID:** 1788249483237814515<br>
**ProtoShield Version:** 9c5e9606

# Security Analysis Report - Executive Summary

## Overview

This security analysis covers the cognito-step-up-auth-demo project, an AWS CDK-based step-up authentication prototype for a booking system. The scan evaluated infrastructure-as-code, dependencies, IAM policies, and security configurations across multiple security domains including CVE vulnerabilities, IAM least privilege, infrastructure compliance, and code quality.

## Key Findings

### Critical Issues: 0
### High Severity Issues: 1
### Medium Severity Issues: 1
### Low Severity Issues: 0
### Info Observations: 1

## Summary by Tool


| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| [License Headers](#license-headers) | 0 | 0 | 0 | 0 | 0 | 0 |
| [Semgrep](#semgrep) | 0 | 0 | 0 | 0 | 0 | 0 |
| [CDK NAG](#cdk-nag) | 0 | 0 | 0 | 0 | 0 | 6 |
| [CVE Scan](#cve-scan) | 0 | 0 | 1 | 0 | 0 | 0 |
| [Checkov](#checkov) | 0 | 0 | 0 | 0 | 0 | 0 |
| [Secrets](#secrets) | 0 | 0 | 0 | 0 | 0 | 0 |
| [IAM Least Privilege](#iam-least-privilege) | 0 | 1 | 0 | 0 | 1 | 0 |
## Recommendations by Priority

### Immediate Actions (Critical/High)

1. **SES Wildcard Resource Permission (High):** The CreateAuthChallenge Lambda function has overly broad SES permissions using a wildcard resource (`*`). This violates the principle of least privilege for a sensitive service. Scope the SES permission to the specific verified identity ARN before production deployment.

2. **Upgrade esbuild Dependency (Medium):** Update esbuild from version 0.21.5 to 0.25.0 or later to remediate a CORS bypass vulnerability (GHSA-67mh-4wv8-2f99) that could allow attackers to access sensitive information from the development server.

### Short-term Actions (Medium)

- Run `npm install` to update package-lock.json files in both the root directory and infra/ directory after upgrading esbuild
- Test the development server after the upgrade to ensure CORS policies are properly enforced
- Ensure all developers update their local dependencies to the patched version

### Long-term Improvements (Low)

- Review and document the transition plan from prototype to production, particularly regarding IAM policy refinements
- Evaluate whether Cognito-level MFA should be enabled alongside the custom OTP flow for production deployments
- Consider replacing AWS managed policies with custom inline policies for Lambda execution roles in production environments

## Positive Findings

The following security scanners completed analysis with zero findings:

- **License Headers:** No license header violations detected
- **Semgrep:** No code quality or security pattern violations detected
- **Checkov:** No infrastructure compliance violations detected
- **Secrets:** No exposed secrets or credentials detected

Additionally, **CDK NAG** identified 6 issues that were appropriately suppressed with documented justifications for this prototype project. All suppressions are well-reasoned and align with the project's purpose as a step-up authentication demo.

## Conclusion

The cognito-step-up-auth-demo project demonstrates a well-structured prototype with generally sound security practices. The identified issues are primarily prototype-specific limitations that require remediation before production deployment. The high-severity IAM finding and medium-severity dependency vulnerability should be addressed immediately, while the infrastructure and code quality remain solid across all other security domains.

---

## Remediation Response

**Response Date:** 2026-09-01<br>
**Reviewer:** Project Owner<br>
**Scan History:** This is the 4th ProtoShield scan. All Critical and Medium findings from prior scans have been resolved.

| # | Finding | Severity | Disposition | Notes |
|---|---------|----------|-------------|-------|
| 1 | SES SendEmail/SendRawEmail wildcard resource (`*`) | High | **Accepted — Not Applicable** | This demo uses `otpDeliveryMode=console` (OTP printed to CloudWatch Logs); the SES policy is only attached when `otpDeliveryMode=email`, which is not the active configuration. The `ses:SendEmail` action requires a wildcard resource when the specific SES verified identity ARN is not known at CDK synth time — the ARN depends on the operator's SES domain/email verification setup. See inline comment in `infra/lib/step-up-auth-stack.ts` line 94. Production must scope to a specific identity ARN. |
| 2 | esbuild CORS vulnerability (GHSA-67mh-4wv8-2f99) | Medium | **Accepted — Risk Acknowledged** | This CVE affects only the esbuild development server (`--serve` mode), which is never used in this project. esbuild is used solely as a CDK bundling tool at synth/deploy time. The vulnerability requires network access (AV:N) and user interaction (UI:R) against a running dev server — a scenario that does not apply here. No runtime or production exposure exists. |
| 3 | CDK NAG suppressions (6 rules) | Suppressed | **Documented in code** | IAM4 x4: CDK auto-attached `AWSLambdaBasicExecutionRole` grants only CloudWatch Logs write. COG2: step-up OTP flow IS the second factor; Cognito MFA would conflict. COG8: Plus tier not required for prototype. All suppressions include justification in `NagSuppressions.addResourceSuppressions()`. |

### Previously Resolved (scans 1–3)

| Finding | Severity | Resolution |
|---------|----------|------------|
| CDK NAG not integrated | Critical | Integrated `cdk-nag` with `AwsSolutionsChecks` Aspect. Commit `7967184`. |
| CDK NAG coverage gap (no NagReport.csv) | Critical | Fixed dependency resolution; `cdk synth` now generates reports. Commit `c1feba4`. |
| Missing LICENSE file + 9 source file headers | High (x10) | Added Apache 2.0 LICENSE and SPDX headers. Commit `dfdea4d`. |
| DynamoDB PITR not enabled | Medium | Enabled `pointInTimeRecoverySpecification`. Commit `d987869`. |
| Lambda runtime not latest | Medium (x4) | Upgraded from Node.js 22.x to 24.x. Commit `d987869`. |
| Cognito password policy missing special chars | Medium | Set `requireSymbols: true`. Commit `d987869`. |

---


## License Headers

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| license_headers | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Compliance Summary

**Excellent compliance achieved:** All source files in the project carry the required Apache 2.0 license header.

- **Files Scanned:** 9
- **Files with Header:** 9
- **Files Missing Header:** 0
- **Compliance Rate:** 100%
- **Project LICENSE File:** Present ✓

### Findings

No compliance issues detected. All source files properly include the Apache 2.0 license header as required by the project.

### Recommendations

- **Maintain compliance:** Continue to include the Apache 2.0 license header in all new source files
- **Use correct comment syntax:** Ensure new files follow the established comment conventions:
  - `/* */` for C/Go/Java files
  - `#` for Python/Shell scripts
- **Keep copyright year current:** When adding new files, use the current year in the copyright notice rather than copying older years from existing files

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

After a comprehensive search of the project at `/project`, I found **no Semgrep suppressions** in the codebase.

**Search Methodology:**
- Searched for all Semgrep suppression markers: `nosemgrep`, `# nosemgrep:`, `semgrep-disable`
- Checked for Semgrep configuration files: `.semgrep.yml`, `.semgrep.yaml`, `semgrep.yml`
- Scanned all source files (JavaScript, TypeScript, JSON, YAML)
- Examined all 28 source files in the project

**Result:**
The project contains no explicit Semgrep suppressions. All code comments mentioning "suppress", "skip", or "disable" refer to application logic (e.g., suppressing Cognito welcome emails, skipping user creation if user exists) rather than Semgrep rule suppressions.

### Conclusion

No Semgrep suppressions were found in the project. This indicates either:
1. The project has not yet been scanned with Semgrep, or
2. All Semgrep findings have been remediated rather than suppressed

This is a positive finding from a security perspective, as it means there are no hidden or undocumented suppressions masking potential security issues.

</details>

---


## CDK NAG

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| cdknag | 0 | 0 | 0 | 0 | 0 | 6 |

<details>
<summary>View Details</summary>

### Summary

CDK NAG analysis completed successfully with **no active findings**. All 6 identified issues have been appropriately suppressed with documented justifications.

**Coverage Status:** ✅ Complete
- No synthesis errors detected
- All CDK stacks analyzed successfully
- No coverage gaps

### Suppressed Findings

All findings are suppressed with valid justifications for this prototype project:

**Cognito Configuration (2 suppressions)**
- **AwsSolutions-COG2** (MFA requirement): Suppressed because this project is specifically a step-up authentication demo where the CUSTOM_AUTH OTP challenge flow provides the second factor. Enabling Cognito-level MFA would conflict with the demo's purpose.
- **AwsSolutions-COG8** (Cognito Plus tier): Suppressed because the standard tier provides all features needed for the step-up auth demo flow. Plus tier is not required for this prototype.

**IAM Managed Policies (4 suppressions)**
- **AwsSolutions-IAM4** (AWS managed policies): Suppressed for all four Lambda function service roles (CreateAuthChallenge, DefineAuthChallenge, PreTokenGeneration, VerifyAuthChallenge). The AWSLambdaBasicExecutionRole is auto-attached by CDK and grants only CloudWatch Logs write access, which is required for operational visibility.

### Recommendations

1. **Maintain Current Suppressions**: All suppressions are well-documented and appropriate for a prototype project. The justifications align with the project's purpose as a step-up authentication demo.

2. **Production Readiness**: When transitioning to production:
   - Evaluate whether Cognito-level MFA should be enabled alongside the custom OTP flow
   - Consider upgrading to Cognito Plus tier if advanced features are needed
   - Review Lambda execution roles to ensure they follow least-privilege principles with custom inline policies instead of managed policies

3. **Documentation**: The suppression reasons are clear and maintainable. Continue this practice when adding new resources.

</details>

### Suppression Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| cdknag_suppressions | 0 | 0 | 0 | 0 | 3 | 0 |

<details>
<summary>View Details</summary>

### Overview
This analysis reviews CDK NAG suppressions in the StepUpAuth prototype to assess their justification quality and scope appropriateness. All suppressions are located in `infra/lib/step-up-auth-stack.ts`.

### Suppressions Identified

#### 1. Lambda Functions - AwsSolutions-IAM4 (Lines 189-194)
**File:** `infra/lib/step-up-auth-stack.ts`
**Line:** 189
**Resources:** DefineAuthChallenge, CreateAuthChallenge, VerifyAuthChallenge, PreTokenGeneration Lambda functions
**Rule ID:** AwsSolutions-IAM4
**Justification:** "AWSLambdaBasicExecutionRole is auto-attached by CDK and grants only CloudWatch Logs write access, which is required for operational visibility."

**Assessment:** ✅ ACCEPTABLE
- Specific and documented reason explaining why the managed policy is necessary
- Acknowledges that CDK auto-attaches the role
- Clearly states the purpose (CloudWatch Logs visibility)
- Narrowly scoped to a single rule ID
- Demonstrates understanding of the trade-off between convenience and least privilege

#### 2. Cognito User Pool - AwsSolutions-COG2 (Lines 197-201)
**File:** `infra/lib/step-up-auth-stack.ts`
**Line:** 197
**Resource:** Cognito User Pool
**Rule ID:** AwsSolutions-COG2
**Justification:** "This project IS a step-up (MFA) authentication demo. The CUSTOM_AUTH OTP challenge flow provides the second factor. Enabling Cognito-level MFA would conflict with the demo purpose."

**Assessment:** ✅ ACCEPTABLE
- Clear architectural justification explaining why the finding is not applicable
- Explicitly states that the OTP challenge flow serves as the second factor
- Acknowledges the conflict between Cognito-level MFA and the demo's custom auth flow
- Narrowly scoped to a single rule ID
- Demonstrates intentional design decision, not an oversight

#### 3. Cognito User Pool - AwsSolutions-COG8 (Lines 202-205)
**File:** `infra/lib/step-up-auth-stack.ts`
**Line:** 202
**Resource:** Cognito User Pool
**Rule ID:** AwsSolutions-COG8
**Justification:** "Cognito Plus tier is not required for this prototype. The standard tier provides all features needed for the step-up auth demo flow."

**Assessment:** ✅ ACCEPTABLE
- Reasonable justification for a prototype/demo context
- Explicitly acknowledges the tier limitation
- Explains why standard tier is sufficient for the demo scope
- Narrowly scoped to a single rule ID
- Appropriate for a non-production prototype

### Additional Context
The codebase demonstrates good security practices beyond suppressions:
- Inline comments explain design decisions (e.g., SES wildcard resource usage for email delivery mode)
- References to DECISIONS.md for architectural rationale
- Explicit warnings about demo-only features (USER_PASSWORD_AUTH)
- Proper use of least-privilege IAM policies where applicable (DynamoDB grants, SES conditional policy)

### Findings Summary
- **Total Suppressions:** 3
- **Acceptable:** 3
- **Questionable:** 0
- **Blanket/Over-broad:** 0
- **Undocumented:** 0

All suppressions are well-justified, narrowly scoped, and demonstrate intentional architectural decisions appropriate for a prototype/demo context.

</details>

---


## CVE Scan

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| cve | 0 | 0 | 1 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Medium Severity Issues

**GHSA-67mh-4wv8-2f99: esbuild CORS Bypass Vulnerability**

esbuild versions prior to 0.25.0 contain a vulnerability that enables any website to send requests to the development server and read the response. This is a CORS (Cross-Origin Resource Sharing) bypass vulnerability that could allow attackers to access sensitive information from the development server.

- **Affected Package:** esbuild
- **Installed Version:** 0.21.5
- **Fixed Version:** 0.25.0
- **CVSS Score:** 5.3 (Medium)
- **CVSS Vector:** CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:N/A:N
- **CWE:** CWE-346 (Origin Validation Error)
- **References:**
  - https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99
  - https://github.com/evanw/esbuild/commit/de85afd65edec9ebc44a11e245fd9e9a2e99760d

**Affected Files/Locations:**
- infra/package-lock.json
- package-lock.json

### Affected Packages

- **esbuild** (0.21.5) - Used in infrastructure and root package dependencies

### Recommendations

1. **Immediate Action Required:** Upgrade esbuild to version 0.25.0 or later to remediate the CORS bypass vulnerability.

2. **Update Steps:**
   - Update package.json files to specify esbuild >= 0.25.0
   - Run `npm install` to update package-lock.json files
   - Verify the upgrade in both the root directory and infra/ directory

3. **Testing:** After upgrading, test the development server to ensure it functions correctly and that CORS policies are properly enforced.

4. **Development Environment:** This vulnerability primarily affects development environments. Ensure all developers update their local dependencies.

</details>

---


## Checkov

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| checkov | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Scan Summary

The Checkov infrastructure security scan completed successfully with **no findings** detected.

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

The infrastructure code has passed all Checkov security checks. This indicates that:

1. **Infrastructure as Code Compliance**: The CDK infrastructure definitions meet Checkov's security policy requirements
2. **No Policy Violations**: No infrastructure misconfigurations were detected
3. **Security Best Practices**: The infrastructure appears to follow AWS security best practices as validated by Checkov

### Recommendations

- **Maintain Security Posture**: Continue following infrastructure security best practices
- **Regular Scanning**: Perform regular Checkov scans as part of your CI/CD pipeline to catch any future misconfigurations
- **Policy Updates**: Review and update Checkov policies periodically to align with evolving security standards
- **Manual Review**: While automated scanning is valuable, consider supplementing with manual security reviews for complex infrastructure patterns

</details>

### Suppression Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| checkov_suppressions | 0 | 0 | 0 | 0 | 3 | 0 |

<details>
<summary>View Details</summary>

### Overview
This analysis reviews Checkov suppressions (CDK NAG) in the ProtoShield project. CDK NAG is the AWS CDK equivalent of Checkov for infrastructure-as-code security scanning.

### Suppressions Identified

**Total Suppressions Found: 3**

All suppressions are located in `infra/lib/step-up-auth-stack.ts` and use the CDK NAG `NagSuppressions.addResourceSuppressions()` API.

---

### Detailed Findings

#### Finding 1: AwsSolutions-IAM4 (Lambda Functions)
**File:** `infra/lib/step-up-auth-stack.ts`  
**Lines:** 189-194  
**Resources:** DefineAuthChallenge, CreateAuthChallenge, VerifyAuthChallenge, PreTokenGeneration Lambda functions  
**Suppression ID:** AwsSolutions-IAM4  
**Reason:** "AWSLambdaBasicExecutionRole is auto-attached by CDK and grants only CloudWatch Logs write access, which is required for operational visibility."

**Analysis:**
- ✅ **ACCEPTABLE** — This is a well-justified suppression
- The reason is specific and technically accurate: CDK automatically attaches the managed policy `AWSLambdaBasicExecutionRole` to all Lambda functions
- AwsSolutions-IAM4 flags the use of AWS managed policies (which can be overly broad), but in this case the managed policy is limited to CloudWatch Logs write access
- The justification explains the operational necessity (logging for visibility)
- The scope is narrowly applied to only the four Lambda functions that require it
- This is a standard, documented pattern in AWS CDK deployments
- **Severity:** Info (acceptable, well-justified)

---

#### Finding 2: AwsSolutions-COG2 (Cognito User Pool)
**File:** `infra/lib/step-up-auth-stack.ts`  
**Lines:** 198-201  
**Resource:** Cognito User Pool  
**Suppression ID:** AwsSolutions-COG2  
**Reason:** "This project IS a step-up (MFA) authentication demo. The CUSTOM_AUTH OTP challenge flow provides the second factor. Enabling Cognito-level MFA would conflict with the demo purpose."

**Analysis:**
- ✅ **ACCEPTABLE** — This is a well-justified suppression
- AwsSolutions-COG2 requires MFA to be enabled on the Cognito User Pool
- The reason is specific and architecturally sound: the project implements MFA via a custom authentication challenge (OTP-based), not Cognito's built-in MFA
- Enabling Cognito-level MFA would create a conflict with the demo's custom auth flow design
- The architectural decision is documented in DECISIONS.md (ADR-001) and SECURITY_COMPLIANCE.md
- The suppression is narrowly scoped to the User Pool resource
- The project is explicitly a reference implementation and demo, not production code
- **Severity:** Info (acceptable, well-justified)

---

#### Finding 3: AwsSolutions-COG8 (Cognito User Pool)
**File:** `infra/lib/step-up-auth-stack.ts`  
**Lines:** 202-205  
**Resource:** Cognito User Pool  
**Suppression ID:** AwsSolutions-COG8  
**Reason:** "Cognito Plus tier is not required for this prototype. The standard tier provides all features needed for the step-up auth demo flow."

**Analysis:**
- ✅ **ACCEPTABLE** — This is a well-justified suppression
- AwsSolutions-COG8 recommends using Cognito Plus tier for enhanced security features
- The reason is specific and appropriate for a prototype/reference implementation
- The standard tier is sufficient for the demo's requirements (custom auth challenge, OTP delivery, token generation)
- The suppression acknowledges this is a non-production prototype, making the cost-optimization decision appropriate
- The suppression is narrowly scoped to the User Pool resource
- Production promotion checklist in SECURITY_COMPLIANCE.md does not require Cognito Plus tier
- **Severity:** Info (acceptable, well-justified)

---

### Quality Assessment

**Suppression Quality: EXCELLENT**

All three suppressions demonstrate best practices:

1. **Specificity:** Each suppression includes a specific, non-generic reason tied to the project's architecture or requirements
2. **Narrowness:** Suppressions are applied only to the specific resources that require them, not blanket suppressions
3. **Documentation:** Reasons are clear and cross-referenced to design documentation (DECISIONS.md, SECURITY_COMPLIANCE.md)
4. **Appropriateness:** Suppressions do not hide potentially real security issues; they suppress known, acceptable findings for this specific use case
5. **Context:** The project is explicitly a non-production reference implementation, making the suppression decisions appropriate

**No questionable suppressions were found.**

---

### Recommendations

1. **Continue current practice:** The suppression strategy is sound and should be maintained
2. **Production promotion:** When promoting this code to production, review suppressions against production requirements:
   - AwsSolutions-COG2: Evaluate whether production requires Cognito-level MFA in addition to the custom OTP challenge
   - AwsSolutions-COG8: Evaluate whether production requires Cognito Plus tier for advanced security features (ASF, etc.)
   - AwsSolutions-IAM4: Consider scoping the Lambda execution role to specific CloudWatch Logs resources if stricter least-privilege is required
3. **Documentation:** The SECURITY_COMPLIANCE.md production promotion checklist should be reviewed before any production deployment

---

### Affected Files/Locations

- `infra/lib/step-up-auth-stack.ts` (lines 189-206)

### Summary Table

| Suppression ID | Resource | Status | Justification Quality |
|---|---|---|---|
| AwsSolutions-IAM4 | Lambda Functions (4x) | Acceptable | Specific, well-documented, standard pattern |
| AwsSolutions-COG2 | Cognito User Pool | Acceptable | Specific, architecturally sound, documented |
| AwsSolutions-COG8 | Cognito User Pool | Acceptable | Specific, appropriate for prototype, documented |

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

### Finding Summary

After a comprehensive search of the project at `/project`, I found **no Secrets suppressions** in the codebase.

**Search Results:**
- Searched for `gitleaks:allow` markers: No matches found
- Searched for `.gitleaksignore`, `.gitleaks.toml`, and `gitleaks.toml` configuration files: No files found
- Searched for general suppression patterns (`nosec`, `suppress`, `allow`, `skip`): Found only non-Secrets-related comments (e.g., "skips FORCE_CHANGE_PASSWORD state", "skip SES setup", "skips email verification")
- Searched for `gitleaks` references: No matches found

### Project Context

The project is a Cognito step-up authentication demo for AWS. It contains:
- Node.js application code (auth helpers, demo script, setup script)
- AWS Lambda functions (4 Cognito triggers)
- AWS CDK infrastructure code (TypeScript)
- Configuration files (.env.example, cdk.json)
- Documentation files

The codebase does not contain any hardcoded secrets, API keys, or credentials that would require Secrets scanner suppressions. The `.env.example` file contains placeholder values (e.g., `USER_POOL_ID=us-east-1_XXXXXXXXX`), which are intentionally masked and do not represent actual secrets.

### Conclusion

No Secrets suppressions were found in the project. The codebase appears to follow security best practices by:
- Using environment variables for sensitive configuration
- Providing `.env.example` with placeholder values
- Not committing actual credentials or secrets to the repository

### Recommendations

- Continue following the current practice of using `.env` files for sensitive configuration
- Maintain the `.env.example` pattern with placeholder values for documentation
- Ensure `.env` files remain in `.gitignore` (verified in project)
- No action required regarding Secrets suppressions

</details>

---


## IAM Least Privilege

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

---

## Scanners Not Run

The following scanners were not run because they were not relevant to this project. This is an intentional selection decision, not a failure. Scanner failures, when they occur, are reported in each scanner's own detail section.

| Scanner | Reason |
|---------|--------|
| bandit | no project files matched trigger patterns [*.py **/*.py] |
| cfnnag | no project files matched trigger patterns [*.template **/*.template template.json template.yaml] |
