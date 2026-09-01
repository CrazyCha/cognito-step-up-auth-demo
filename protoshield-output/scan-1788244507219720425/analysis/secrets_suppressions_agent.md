```json
{
  "tool": "secrets_suppressions",
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