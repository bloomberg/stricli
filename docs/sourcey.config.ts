import { readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, markdown } from "sourcey";

const docsRoot = fileURLToPath(new URL(".", import.meta.url));

function collectMarkdownPages(directory: string): string[] {
    const pages: string[] = [];

    function visit(currentDirectory: string): void {
        for (const entry of readdirSync(currentDirectory, {
            withFileTypes: true,
        })) {
            const entryPath = resolve(currentDirectory, entry.name);
            if (entry.isDirectory()) {
                visit(entryPath);
            } else if (entry.isFile() && entry.name.endsWith(".md")) {
                pages.push(relative(docsRoot, entryPath).replaceAll("\\", "/").replace(/\.md$/, ""));
            }
        }
    }

    visit(directory);
    return pages.sort((left, right) => left.localeCompare(right));
}

export default defineConfig({
    name: "Stricli Agent Docs",
    description:
        "Machine-readable Stricli API documentation generated from the same TypeScript source as the main documentation site.",
    siteUrl: "https://bloomberg.github.io",
    baseUrl: "/stricli/agent-docs",
    prettyUrls: "slash",
    repo: "https://github.com/bloomberg/stricli",
    navigation: {
        tabs: [
            {
                tab: "TypeScript API",
                slug: "api",
                source: markdown({
                    groups: [
                        {
                            group: "Overview",
                            pages: ["sourcey-overview"],
                        },
                        {
                            group: "@stricli/core",
                            pages: collectMarkdownPages(resolve(docsRoot, "packages/core")),
                        },
                        {
                            group: "@stricli/auto-complete",
                            pages: collectMarkdownPages(resolve(docsRoot, "packages/auto-complete")),
                        },
                    ],
                }),
            },
        ],
    },
    navbar: {
        links: [
            {
                type: "link",
                label: "Main documentation",
                href: "https://bloomberg.github.io/stricli/",
            },
        ],
    },
});
