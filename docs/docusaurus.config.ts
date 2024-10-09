import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
    title: "Stricli",
    tagline: "Build complex CLIs with type safety and no dependencies",
    favicon: "img/S-logo.svg",

    // Set the production url of your site here
    url: "https://bloomberg.github.io",
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: "/stricli",

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: "bloomberg", // Usually your GitHub org/user name.
    projectName: "stricli", // Usually your repo name.

    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "throw",
    onDuplicateRoutes: "throw",
    trailingSlash: false,

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: "en",
        locales: ["en"],
    },

    plugins: [
        "docusaurus-plugin-sass",
        [
            "docusaurus-plugin-typedoc",
            {
                id: "typedoc-core",
                entryPoints: ["../packages/core/src/index.ts"],
                tsconfig: ["../packages/core/src/tsconfig.json"],
                out: "packages/core",
            },
        ],
        [
            "docusaurus-plugin-typedoc",
            {
                id: "typedoc-auto-complete",
                entryPoints: ["../packages/auto-complete/src/index.ts"],
                tsconfig: ["../packages/auto-complete/src/tsconfig.json"],
                out: "packages/auto-complete",
            },
        ],
        [
            "@docusaurus/plugin-content-docs",
            {
                id: "docs-packages",
                path: "packages",
                routeBasePath: "packages",
                sidebarPath: "packages/sidebars.ts",
            },
        ],
        () => {
            return {
                name: "webpack-source-map",
                configureWebpack() {
                    return {
                        devtool: "inline-source-map",
                    };
                },
            };
        },
        () => {
            return {
                name: "webpack-text-loader",
                configureWebpack(config, isServer, utils) {
                    return {
                        mergeStrategy: { "module.rules": "replace" },
                        module: {
                            rules: [
                                {
                                    test: /\.d\.ts$/i,
                                    type: "asset/source",
                                },
                                {
                                    test: /\.txt$/i,
                                    type: "asset/source",
                                },
                                ...config.module.rules.map((rule) => {
                                    if (
                                        typeof rule === "object" &&
                                        rule.test &&
                                        rule.test instanceof RegExp &&
                                        rule.test.test(".d.ts")
                                    ) {
                                        return {
                                            ...rule,
                                            exclude: [
                                                rule.exclude,
                                                // Must manually exclude .d.ts files from .ts loader so that they are only treated as text
                                                /\.d\.ts$/i,
                                            ],
                                        };
                                    }
                                    return rule;
                                }),
                            ],
                        },
                    };
                },
            };
        },
    ],

    presets: [
        [
            "@docusaurus/preset-classic",
            {
                docs: {
                    path: "docs",
                    routeBasePath: "docs",
                    sidebarPath: "./docs/sidebars.ts",
                },
                sitemap: {
                    filename: "sitemap.xml",
                },
                blog: {
                    showReadingTime: true,
                },
                theme: {
                    customCss: "./src/css/custom.scss",
                },
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        docs: {
            sidebar: {
                autoCollapseCategories: true,
            },
        },
        navbar: {
            title: "Stricli",
            logo: {
                alt: "Stricli",
                src: "img/S-logo.svg",
            },
            items: [
                {
                    type: "doc",
                    docId: "getting-started/overview",
                    position: "left",
                    label: "Documentation",
                },
                { to: "/packages", label: "API", position: "left" },
                { to: "/blog", label: "Blog", position: "left" },
                {
                    href: "https://github.com/bloomberg/stricli/",
                    label: "GitHub",
                    position: "right",
                },
            ],
        },
        footer: {
            links: [
                {
                    title: "Docs",
                    items: [
                        {
                            label: "Getting Started",
                            to: "/docs/category/getting-started",
                        },
                        {
                            label: "Tutorial",
                            to: "/docs/tutorial",
                        },
                        {
                            label: "Features",
                            to: "/docs/category/features",
                        },
                    ],
                },
                // {
                //   title: 'Community',
                //   items: [
                //     {
                //       label: 'Stack Overflow',
                //       href: 'https://stackoverflow.com/questions/tagged/docusaurus',
                //     },
                //     {
                //       label: 'Discord',
                //       href: 'https://discordapp.com/invite/docusaurus',
                //     },
                //     {
                //       label: 'Twitter',
                //       href: 'https://twitter.com/docusaurus',
                //     },
                //   ],
                // },
                {
                    title: "More",
                    items: [
                        {
                            label: "Blog",
                            to: "/blog",
                        },
                        {
                            label: "GitHub",
                            href: "https://github.com/bloomberg/stricli/",
                        },
                    ],
                },
            ],
            copyright: `Copyright © ${new Date().getFullYear()} Bloomberg Finance L.P. (Powered by Docusaurus)`,
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
            magicComments: [
                {
                    className: "theme-code-block-highlighted-line",
                    line: "highlight-next-line",
                    block: { start: "highlight-start", end: "highlight-end" },
                },
                {
                    className: "code-block-command-line-output",
                    line: "output-next-line",
                    block: { start: "output-start", end: "output-end" },
                },
                {
                    className: "code-block-command-line-error",
                    line: "error-next-line",
                    block: { start: "error-start", end: "error-end" },
                },
            ],
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
