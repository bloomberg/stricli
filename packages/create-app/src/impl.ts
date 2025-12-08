// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { PackageJson, TsConfigJson } from "type-fest";
import self from "../package.json";
import type { LocalContext } from "./context";
import {
    binBashCompleteModuleText,
    binBashCompleteScriptText,
    binCliModuleText,
    binCliScriptText,
    buildMultiCommandAppWithAutoCompleteText,
    gitignoreText,
    localContextText,
    localContextWithAutoCompleteText,
    multiCommandAppText,
    multiCommandNestedCommandsText,
    multiCommandNestedImplText,
    multiCommandSubdirCommandText,
    multiCommandSubdirImplText,
    singleCommandAppText,
    singleCommandImplText,
} from "./files";
import srcTsconfig from "./tsconfig.json";

interface TsupConfig {
    entry?: string[];
    format?: ("cjs" | "esm" | "iife")[];
    tsconfig?: string;
    clean?: boolean;
    splitting?: boolean;
    minify?: boolean;
}

interface LocalPackageJson extends PackageJson.PackageJsonStandard, PackageJson.TypeScriptConfiguration {
    tsup?: TsupConfig;
}

function calculateBashCompletionCommand(command: string): string {
    return `__${command}_bash_complete`;
}

type PackageJsonTemplateValues = Pick<PackageJson.PackageJsonStandard, "name"> &
    Required<Pick<PackageJson.PackageJsonStandard, "author" | "description" | "license" | "type">>;

function buildPackageJson(
    values: PackageJsonTemplateValues,
    commandName: string,
    nodeMajorVersion: string | undefined,
): LocalPackageJson {
    return {
        ...values,
        version: "0.0.0",
        files: ["dist"],
        bin: {
            [commandName]: "dist/cli.js",
        },
        engines: {
            node: nodeMajorVersion && `>=${nodeMajorVersion}`,
        },
        scripts: {
            prebuild: "tsc -p src/tsconfig.json",
            build: "tsup --silent",
            prepublishOnly: "npm run build",
        },
        tsup: {
            entry: ["src/bin/cli.ts"],
            format: [values.type === "commonjs" ? "cjs" : "esm"],
            tsconfig: "src/tsconfig.json",
            clean: true,
            splitting: true,
            minify: true,
        },
        dependencies: {
            "@stricli/core": self.dependencies["@stricli/core"],
        },
        devDependencies: {
            "@types/node": nodeMajorVersion && `${nodeMajorVersion}.x`,
            tsup: self.devDependencies.tsup,
            typescript: self.devDependencies.typescript,
        },
    };
}

function addAutoCompleteBin(packageJson: LocalPackageJson, bashCompleteCommandName: string): LocalPackageJson {
    return {
        ...packageJson,
        dependencies: {
            ...packageJson.dependencies,
            "@stricli/auto-complete": self.dependencies["@stricli/auto-complete"],
        },
        bin: {
            ...(packageJson.bin as Record<string, string>),
            [bashCompleteCommandName]: "dist/bash-complete.js",
        },
        tsup: {
            ...packageJson.tsup,
            /* c8 ignore next */
            entry: [...(packageJson.tsup?.entry ?? []), "src/bin/bash-complete.ts"],
        },
    };
}

function addPostinstallScript(packageJson: LocalPackageJson, script: string): LocalPackageJson {
    return {
        ...packageJson,
        scripts: {
            ...packageJson.scripts,
            postinstall: script,
        },
    };
}

export interface CreateProjectFlags extends PackageJsonTemplateValues {
    readonly template: "single" | "multi";
    readonly autoComplete: boolean;
    readonly command?: string;
    readonly nodeVersion?: string;
}

export default async function (this: LocalContext, flags: CreateProjectFlags, directoryPath: string): Promise<void> {
    const { fs, path } = this;

    await fs.promises.mkdir(directoryPath, { recursive: true });

    const writeFile = async (relPath: string, text: string): Promise<void> => {
        const absPath = path.join(directoryPath, relPath);
        await fs.promises.writeFile(absPath, text);
    };

    const createDirectory = async (relPath: string): Promise<void> => {
        const absPath = path.join(directoryPath, relPath);
        await fs.promises.mkdir(absPath, { recursive: true });
    };

    await createDirectory("src");

    const packageName = flags.name ?? path.basename(directoryPath);
    const commandName = flags.command ?? packageName;

    const nodeMajorVersion = (
        typeof flags.nodeVersion === "string" ? flags.nodeVersion : this.process?.versions?.node
    )?.split(".")[0];

    let packageJson = buildPackageJson(
        {
            name: packageName,
            author: flags.author,
            description: flags.description,
            license: flags.license,
            type: flags.type,
        },
        commandName,
        nodeMajorVersion,
    );

    const bashCommandName = calculateBashCompletionCommand(commandName);

    if (flags.autoComplete) {
        packageJson = addAutoCompleteBin(packageJson, bashCommandName);
        if (flags.template === "multi") {
            packageJson = addPostinstallScript(packageJson, `${commandName} install`);
        } else {
            packageJson = addPostinstallScript(
                packageJson,
                `npx @stricli/auto-complete@latest install ${commandName} --bash ${bashCommandName}`,
            );
        }
        await writeFile("src/context.ts", localContextWithAutoCompleteText);
    } else {
        await writeFile("src/context.ts", localContextText);
    }

    await writeFile("package.json", JSON.stringify(packageJson, void 0, 4));

    await writeFile(".gitignore", gitignoreText);

    const sourceTsconfigJson: TsConfigJson = {
        compilerOptions: srcTsconfig.compilerOptions as TsConfigJson.CompilerOptions,
        include: srcTsconfig.include,
        exclude: srcTsconfig.exclude,
    };
    await writeFile("src/tsconfig.json", JSON.stringify(sourceTsconfigJson, void 0, 4));

    if (flags.template === "single") {
        await writeFile("src/impl.ts", singleCommandImplText);
        await writeFile("src/app.ts", singleCommandAppText);
    } else {
        await createDirectory("src/commands/subdir");
        await writeFile("src/commands/subdir/impl.ts", multiCommandSubdirImplText);
        await writeFile("src/commands/subdir/command.ts", multiCommandSubdirCommandText);
        await createDirectory("src/commands/nested");
        await writeFile("src/commands/nested/impl.ts", multiCommandNestedImplText);
        await writeFile("src/commands/nested/commands.ts", multiCommandNestedCommandsText);
        if (flags.autoComplete) {
            await writeFile("src/app.ts", buildMultiCommandAppWithAutoCompleteText(commandName, bashCommandName));
        } else {
            await writeFile("src/app.ts", multiCommandAppText);
        }
    }

    await createDirectory("src/bin");
    await writeFile("src/bin/cli.ts", flags.type === "module" ? binCliModuleText : binCliScriptText);
    if (flags.autoComplete) {
        await writeFile(
            "src/bin/bash-complete.ts",
            flags.type === "module" ? binBashCompleteModuleText : binBashCompleteScriptText,
        );
    }
}
