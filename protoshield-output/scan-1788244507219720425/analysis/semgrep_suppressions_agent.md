```json
{
  "tool": "semgrep_suppressions",
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