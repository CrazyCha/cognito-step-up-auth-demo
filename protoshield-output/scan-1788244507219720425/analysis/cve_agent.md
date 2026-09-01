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