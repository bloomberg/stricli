## 1.2.6 (2026-02-20)

### 🚀 Features

- enhance site with multi-file playground ([8a3dc5b](https://github.com/bloomberg/stricli/commit/8a3dc5b))

### 🩹 Fixes

- add inputs to nx.json ([6258944](https://github.com/bloomberg/stricli/commit/6258944))
- add `inputs` to `nx.json` to fix `nx` cache invalidation ([7240891](https://github.com/bloomberg/stricli/commit/7240891))
- enable and fix new eslint rules ([7b185c2](https://github.com/bloomberg/stricli/commit/7b185c2))
- use cyan in help text ([041c2bc](https://github.com/bloomberg/stricli/commit/041c2bc))
- switch flags/commands to bold ([c9e290f](https://github.com/bloomberg/stricli/commit/c9e290f))
- switch help text headers to underline ([9af611f](https://github.com/bloomberg/stricli/commit/9af611f))
- switch keywords/hidden to dim ([05446d2](https://github.com/bloomberg/stricli/commit/05446d2))

### ❤️ Thank You

- Jeff Posnick
- jposnick1
- mmolisani

## 1.2.5 (2026-01-06)

### 🚀 Features

- expose fullDescription to DocumentedTarget ([3d0c547](https://github.com/bloomberg/stricli/commit/3d0c547))
- withNegated for bool flags ([2296154](https://github.com/bloomberg/stricli/commit/2296154))
- variadic defaults ([35821bb](https://github.com/bloomberg/stricli/commit/35821bb))
- default values for variadic flags ([956ea07](https://github.com/bloomberg/stricli/commit/956ea07))
- disable minifiy for @stricli/core ([aae0341](https://github.com/bloomberg/stricli/commit/aae0341))
- withNegated option for boolean flags ([a300cb2](https://github.com/bloomberg/stricli/commit/a300cb2))

### 🩹 Fixes

- start load after arguments parsed ([5d16238](https://github.com/bloomberg/stricli/commit/5d16238))
- simplify handling of node version for new package.json ([65c4bc0](https://github.com/bloomberg/stricli/commit/65c4bc0))
- reset flag when withNegated is false ([044e472](https://github.com/bloomberg/stricli/commit/044e472))
- more accurate error messages ([40684aa](https://github.com/bloomberg/stricli/commit/40684aa))
- update docs for withNegated ([6bc3800](https://github.com/bloomberg/stricli/commit/6bc3800))
- update linting and test baselines ([fc592a0](https://github.com/bloomberg/stricli/commit/fc592a0))
- always show all defaults ([0e486ab](https://github.com/bloomberg/stricli/commit/0e486ab))
- take variadic string separator into account ([77e804d](https://github.com/bloomberg/stricli/commit/77e804d))
- additional test coverage ([3478dc5](https://github.com/bloomberg/stricli/commit/3478dc5))

### ❤️ Thank You

- Jason Yu
- Jeff Posnick
- jposnick1
- mmolisani

## 1.2.4 (2025-10-14)

This was a version bump only, there were no code changes.

## 1.2.3 (2025-10-14)

### 🩹 Fixes

- run tsup with --silent to suppress unwanted stdout ([fc6636d](https://github.com/bloomberg/stricli/commit/fc6636d))

### ❤️ Thank You

- Michael Molisani

## 1.2.2 (2025-10-14)

This was a version bump only, there were no code changes.

## 1.2.1 (2025-10-13)

### 🩹 Fixes

- update type for exitCode to include null ([c85c18e](https://github.com/bloomberg/stricli/commit/c85c18e))

### ❤️ Thank You

- Kirk Eaton @kirkeaton

## 1.2.0 (2025-06-24)

### 🚀 Features

- custom separators for variadic flags ([bc4c369](https://github.com/bloomberg/stricli/commit/bc4c369))

### 🩹 Fixes

- make looseBooleanParser even more permissive ([07d4bc5](https://github.com/bloomberg/stricli/commit/07d4bc5))
- include separator in help text (suffix) ([68ff1d8](https://github.com/bloomberg/stricli/commit/68ff1d8))
- relax flag name pattern to allow alphanumeric (and more) ([beb8584](https://github.com/bloomberg/stricli/commit/beb8584))
- stricter types for `parameters.flags` when flags are a weak type ([f39be88](https://github.com/bloomberg/stricli/commit/f39be88))
- expose additional types for command module ([66aa66b](https://github.com/bloomberg/stricli/commit/66aa66b))

### ❤️ Thank You

- Mateusz Burzyński @Andarist
- Michael Molisani
- mmolisani

## 1.1.2 (2025-03-26)


### 🩹 Fixes

- make looseBooleanParser even more permissive ([07d4bc5](https://github.com/bloomberg/stricli/commit/07d4bc5))

### ❤️  Thank You

- Michael Molisani

## 1.1.1 (2025-01-13)


### 🩹 Fixes

- loosen character restrictons on flags ([2088ffd](https://github.com/bloomberg/stricli/commit/2088ffd))
- use exit code ([3ac7278](https://github.com/bloomberg/stricli/commit/3ac7278))
- use correct flag for postinstall auto-complete command ([b70bd39](https://github.com/bloomberg/stricli/commit/b70bd39))

### ❤️  Thank You

- Marty Jones
- Michael Molisani

## 1.1.0 (2024-11-04)


### 🚀 Features

- new option to display brief with custom usage ([d78fda3](https://github.com/bloomberg/stricli/commit/d78fda3))

### 🩹 Fixes

- verify @types/node version with registry ([1a762b0](https://github.com/bloomberg/stricli/commit/1a762b0))
- hidden --node-version flag to bypass version discovery ([f237e04](https://github.com/bloomberg/stricli/commit/f237e04))

### ❤️  Thank You

- Michael Molisani

## 1.0.1 (2024-10-22)


### 🩹 Fixes

- update auto-complete template to output completions ([a79e59f](https://github.com/bloomberg/stricli/commit/a79e59f))
- export constituent types of TypedCommandParameters individually ([09dfb8d](https://github.com/bloomberg/stricli/commit/09dfb8d))
- allow flags to parse arrays without variadic modifier ([ecc9099](https://github.com/bloomberg/stricli/commit/ecc9099))

### ❤️  Thank You

- Michael Molisani

# 1.0.0 (2024-10-01)


### 🩹 Fixes

- **create-app:** add process to context ([0c502f2](https://github.com/bloomberg/stricli/commit/0c502f2))

### ❤️  Thank You

- Kubilay Kahveci

## 0.0.1 (2024-09-30)

This was a version bump only, there were no code changes.
