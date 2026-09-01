```json
{
  "tool": "cdknag",
  "critical": 1,
  "high": 0,
  "medium": 0,
  "low": 0,
  "info": 0,
  "suppressed": 0
}
```

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