// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { EmittedFiles } from "../TypeScriptPlayground/impl";

type Exports = Record<string, unknown>;
type RegisterCallback = (require: (mod: string) => unknown, exports: Exports) => void;

export function evaluateFiles(
    files: EmittedFiles,
    entrypoint: string,
    externalImport: (mod: string) => unknown,
): Exports {
    const modules: Record<string, RegisterCallback> = {};
    const exportsByModule: Record<string, Exports> = {};

    function _register(file: string, load: RegisterCallback) {
        modules[file] = load;
    }

    function _evaluate(file: string) {
        const load = modules[file];
        if (!load) {
            throw new Error(`Failed to evaluate ${file}`);
        }
        const exports = {};
        exportsByModule[file] = exports;
        load((target) => {
            if (target.startsWith(".")) {
                let targetFile = new URL(target, new URL(file)).href.replace(".ts", ".js");
                if (!targetFile.endsWith(".js")) {
                    targetFile = `${targetFile}.js`;
                }
                if (targetFile in exportsByModule) {
                    return exportsByModule[targetFile];
                }
                return _evaluate(targetFile);
            } else {
                return externalImport(target);
            }
        }, exports);
        return exports;
    }

    const wrappedFiles = Object.entries(files).map(([name, content]) => {
        return `register(${JSON.stringify(name)}, function (require, exports) {\n${content}\n});`;
    });

    try {
        const code = `${wrappedFiles.join("\n")}\nevaluate(${JSON.stringify(entrypoint)});`;
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        Function("register", "evaluate", code)(_register, _evaluate);
    } catch (exc) {
        console.error("Error evaluating JS code:", exc);
        return;
    }

    return exportsByModule[entrypoint];
}
