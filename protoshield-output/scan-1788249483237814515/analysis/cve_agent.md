```json
{
  "tool": "cve",
  "critical": 0,
  "high": 0,
  "medium": 1,
  "low": 0,
  "info": 0,
  "suppressed": 0
}
```

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