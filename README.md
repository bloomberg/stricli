# Stricli

Build complex CLIs with type safety and no dependencies.

👉 See **[bloomberg.github.io/stricli](https://bloomberg.github.io/stricli/)** for documentation about this framework.

## Contents

-   [Rationale](#rationale)
-   [Quick Start](#quick-start)
-   [Building](#building)
-   [Installation](#installation)
-   [Contributions](#contributions)
-   [License](#license)
-   [Code of Conduct](#code-of-conduct)
-   [Security Vulnerability Reporting](#security-vulnerability-reporting)

## Rationale

This framework was developed by Bloomberg after evaluating the [available alternatives](https://bloomberg.github.io/stricli/docs/getting-started/alternatives) and developing a set of [guiding principles](https://bloomberg.github.io/stricli/docs/getting-started/principles).

## Quick Start

Check out [the tutorial](https://bloomberg.github.io/stricli/docs/tutorial) to learn how to generate a new Stricli application.

## Building

Run `npm ci` to initialize the repo. We use Nx to manage tasks, so you can run the following to build it:

```
npx nx@latest run-many -t build
```

## Installation

The core Stricli framework is available on npmjs.com, and can be installed with the following command:

```
npm i -P @stricli/core
```

## Contributions

We :heart: contributions.

Have you had a good experience with this project? Why not share some love and contribute code, or just let us know about any issues you had with it?

We welcome issue reports [here](../../issues); be sure to choose the proper issue template for your issue, so that we can be sure you're providing the necessary information.

Before sending a [Pull Request](../../pulls), please make sure you read our [Contribution Guidelines](./.github/CONTRIBUTING.md).

## License

Please read the [LICENSE](LICENSE) file.

## Code of Conduct

This project has adopted a [Code of Conduct](https://github.com/bloomberg/.github/blob/main/CODE_OF_CONDUCT.md).
If you have any concerns about the Code, or behavior which you have experienced in the project, please
contact us at opensource@bloomberg.net.

## Security Vulnerability Reporting

Please refer to the project [Security Policy](https://github.com/bloomberg/.github/blob/main/SECURITY.MD).
