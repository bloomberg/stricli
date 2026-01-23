# E2E Test Report: Alias Runtime Tests
Generated: 2025-01-22

## Overall Status: PASSED

## Environment
- URL: N/A (internal library tests)
- Test Runner: vitest v4.0.13
- Platform: Node.js v20.17.0, darwin

## Test Summary
| Scenario | Status | Duration |
|----------|--------|----------|
| Valid aliases work at runtime | PASS | 16ms |
| Invalid alias targets handled gracefully | PASS | 12ms |
| Aliases with different flag types | PASS | 5ms |
| Multiple aliases pointing to same flag | PASS | 6ms |
| Aliases with negated boolean flags | PASS | 8ms |
| Aliases in nested commands/route maps | PASS | 5ms |
| Aliases with variadic flags | PASS | 3ms |
| Edge cases and special characters | PASS | 2ms |
| Aliases with optional flags | PASS | 2ms |
| Aliases with default values | PASS | 2ms |
| Combining aliases with positional arguments | PASS | 2ms |

**Total Tests:** 30 passed, 0 failed
**Full Test Suite:** 1310 tests passed across all test files

## Scenario Results

### PASS: Scenario 1 - Valid aliases work at runtime
**Steps executed:**
1. Single character alias expands to full flag name (`-v` -> `--verbose`)
2. Parsed flag alias works (`-o value` -> `--output value`)
3. Alias with equals syntax (`-o=value` -> `--output=value`)
4. Batch multiple boolean aliases (`-abc` -> `--alpha --bravo --charlie`)

**Duration:** 16ms total

### PASS: Scenario 2 - Invalid alias targets handled gracefully
**Steps executed:**
1. Alias pointing to non-existent flag throws `FlagNotFoundError` at runtime
2. Unknown alias at runtime shows helpful error message

**Duration:** 12ms total

### PASS: Scenario 3 - Aliases work with different flag types
**Steps executed:**
1. Boolean flag alias (`-q` -> `--quiet`)
2. Parsed flag alias with number parser (`-n 42` -> `--number 42`)
3. Counter flag alias (`-vvv` -> verbose count of 3)
4. Enum/choice flag alias (`-l debug` -> `--logLevel debug`)

**Duration:** 5ms total

### PASS: Scenario 4 - Multiple aliases pointing to the same flag
**Steps executed:**
1. Multiple aliases (`-v` and `-V`) both point to same flag
2. Both aliases work correctly

**Duration:** 6ms total

### PASS: Scenario 5 - Aliases with negated boolean flags
**Steps executed:**
1. Alias with boolean flag (`-c` -> `--colorOutput`)
2. Negated form using full flag (camelCase: `--noColorOutput`)
3. Negated form using kebab-case with `allow-kebab-for-camel` (`--no-color-output`)

**Duration:** 8ms total

### PASS: Scenario 6 - Aliases in nested commands/route maps
**Steps executed:**
1. Alias works in nested route maps (`sub -v`)
2. Alias works at different nesting levels (`inner leaf -v -d`)

**Duration:** 5ms total

### PASS: Scenario 7 - Aliases with variadic flags
**Steps executed:**
1. Variadic parsed flags via alias (`-f file1.txt -f file2.txt`)
2. Variadic flags with custom separator (`-n 1,2,3`)

**Duration:** 3ms total

### PASS: Scenario 8 - Edge cases and special characters
**Steps executed:**
1. Reserved alias `-h` is rejected at build time
2. Reserved alias `-H` is rejected at build time
3. Reserved alias `-v` is rejected when version info is provided
4. `-v` alias allowed when no version info
5. Uppercase alias works (`-V`)
6. Single character aliases are case-sensitive

**Duration:** 2ms total

### PASS: Scenario 9 - Aliases with optional flags
**Steps executed:**
1. Optional parsed flag via alias (`-o value`)
2. Works when optional flag alias is not provided

**Duration:** 2ms total

### PASS: Scenario 10 - Aliases with default values
**Steps executed:**
1. Default value used when alias is not provided
2. Default value overridden when alias is provided

**Duration:** 2ms total

### PASS: Scenario 11 - Combining aliases with positional arguments
**Steps executed:**
1. Aliases before positional arguments (`-v arg1 arg2`)
2. Aliases after positional arguments (`arg1 arg2 -v`)

**Duration:** 2ms total

## Key Findings

1. **Alias resolution happens at runtime**, not at build time. When an alias points to a non-existent flag, the error is thrown during argument scanning (when the command is run), not during command construction.

2. **Negation syntax depends on caseStyle configuration:**
   - With `original` caseStyle (default): use `--noFlagName` (camelCase)
   - With `allow-kebab-for-camel` caseStyle: use `--no-flag-name` (kebab-case)

3. **Reserved aliases are validated at build time:**
   - `-h` and `-H` are reserved for help flags
   - `-v` is reserved for version when version info is provided

4. **All flag types support aliases:** boolean, parsed, counter, and enum flags all work correctly with single-character aliases.

5. **Batch alias syntax works:** Multiple boolean aliases can be combined (e.g., `-abc` for `--alpha --bravo --charlie`)

## Artifacts
- Test file: `/Users/nickita/storage/stricli/packages/core/tests/alias-runtime.spec.ts`
- All 30 alias runtime tests passing
- Full test suite: 1310 tests passing

## Recommendations

### None - All scenarios passing

All requested test scenarios are passing. The alias functionality in stricli works correctly for:
- Valid alias expansion
- Invalid alias error handling
- All flag types (boolean, parsed, counter, enum)
- Multiple aliases per flag
- Negated boolean flags
- Nested route maps
- Variadic flags
- Reserved alias enforcement
- Optional flags
- Default values
- Combined with positional arguments
