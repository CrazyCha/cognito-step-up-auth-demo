```json
{
  "tool": "license_headers",
  "critical": 0,
  "high": 10,
  "medium": 0,
  "low": 0,
  "info": 0,
  "suppressed": 0
}
```

## License Headers Compliance

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