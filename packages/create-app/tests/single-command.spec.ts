// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, it } from "vitest";
import { createNewApplication } from "./util/create";
import { buildAndRunApplication } from "./util/run";

describe("module [default]", () => {
    it("with default flags", async ({ expect }) => {
        // WHEN
        const { terminal, volume } = await createNewApplication(["test", "--template", "single"], {
            cwd: "/root",
        });

        // THEN
        expect(terminal).toMatchInlineSnapshot(``);
        expect(volume).toMatchSnapshot("file system");
        await buildAndRunApplication(volume, {
            pathToPackage: "root/test",
            binName: "test",
            commands: [["--help"]],
            expect,
        });
    });

    describe("package properties", () => {
        it("custom name", async ({ expect }) => {
            // WHEN
            const { terminal, volume } = await createNewApplication(
                ["test", "--template", "single", "--name", "@org/test-cli"],
                {
                    cwd: "/root",
                },
            );

            // THEN
            expect(terminal).toMatchInlineSnapshot(``);
            expect(volume).toMatchSnapshot("file system");
            await buildAndRunApplication(volume, {
                pathToPackage: "root/test",
                binName: "@org/test-cli",
                commands: [["--help"]],
                expect,
            });
        });

        it("custom bin command", async ({ expect }) => {
            // WHEN
            const { terminal, volume } = await createNewApplication(
                ["test", "--template", "single", "--command", "test-cli"],
                {
                    cwd: "/root",
                },
            );

            // THEN
            expect(terminal).toMatchInlineSnapshot(``);
            expect(volume).toMatchSnapshot("file system");
            await buildAndRunApplication(volume, {
                pathToPackage: "root/test",
                binName: "test-cli",
                commands: [["--help"]],
                expect,
            });
        });

        it("custom name and bin command", async ({ expect }) => {
            // WHEN
            const { terminal, volume } = await createNewApplication(
                ["test", "--template", "single", "--name", "@org/test-cli", "--command", "test-cli"],
                { cwd: "/root" },
            );

            // THEN
            expect(terminal).toMatchInlineSnapshot(``);
            expect(volume).toMatchSnapshot("file system");
            await buildAndRunApplication(volume, {
                pathToPackage: "root/test",
                binName: "test-cli",
                commands: [["--help"]],
                expect,
            });
        });

        it("custom metadata", async ({ expect }) => {
            // WHEN
            const { terminal, volume } = await createNewApplication(
                [
                    "test",
                    "--template",
                    "single",
                    "--description",
                    "Test CLI",
                    "--license",
                    "UNLICENSED",
                    "--author",
                    "Sample Author",
                ],
                { cwd: "/root" },
            );

            // THEN
            expect(terminal).toMatchInlineSnapshot(``);
            expect(volume).toMatchSnapshot("file system");
            await buildAndRunApplication(volume, {
                pathToPackage: "root/test",
                binName: "test",
                commands: [["--help"]],
                expect,
            });
        });
    });

    describe("additional features", () => {
        it("without auto-complete", async ({ expect }) => {
            // WHEN
            const { terminal, volume } = await createNewApplication(
                ["test", "--template", "single", "--no-auto-complete"],
                {
                    cwd: "/root",
                },
            );

            // THEN
            expect(terminal).toMatchInlineSnapshot(``);
            expect(volume).toMatchSnapshot("file system");
            await buildAndRunApplication(volume, {
                pathToPackage: "root/test",
                binName: "test",
                commands: [["--help"]],
                expect,
            });
        });
    });
});

describe("commonjs", () => {
    it("with default flags", async ({ expect }) => {
        // WHEN
        const { terminal, volume } = await createNewApplication(
            ["test", "--template", "single", "--type", "commonjs"],
            {
                cwd: "/root",
            },
        );

        // THEN
        expect(terminal).toMatchInlineSnapshot(``);
        expect(volume).toMatchSnapshot("file system");
        await buildAndRunApplication(volume, {
            pathToPackage: "root/test",
            binName: "test",
            commands: [["--help"]],
            expect,
        });
    });

    describe("package properties", () => {
        it("custom name", async ({ expect }) => {
            // WHEN
            const { terminal, volume } = await createNewApplication(
                ["test", "--template", "single", "--type", "commonjs", "--name", "@org/test-cli"],
                { cwd: "/root" },
            );

            // THEN
            expect(terminal).toMatchInlineSnapshot(``);
            expect(volume).toMatchSnapshot("file system");
            await buildAndRunApplication(volume, {
                pathToPackage: "root/test",
                binName: "@org/test-cli",
                commands: [["--help"]],
                expect,
            });
        });

        it("custom bin command", async ({ expect }) => {
            // WHEN
            const { terminal, volume } = await createNewApplication(
                ["test", "--template", "single", "--type", "commonjs", "--command", "test-cli"],
                { cwd: "/root" },
            );

            // THEN
            expect(terminal).toMatchInlineSnapshot(``);
            expect(volume).toMatchSnapshot("file system");
            await buildAndRunApplication(volume, {
                pathToPackage: "root/test",
                binName: "test-cli",
                commands: [["--help"]],
                expect,
            });
        });

        it("custom name and bin command", async ({ expect }) => {
            // WHEN
            const { terminal, volume } = await createNewApplication(
                [
                    "test",
                    "--template",
                    "single",
                    "--type",
                    "commonjs",
                    "--name",
                    "@org/test-cli",
                    "--command",
                    "test-cli",
                ],
                { cwd: "/root" },
            );

            // THEN
            expect(terminal).toMatchInlineSnapshot(``);
            expect(volume).toMatchSnapshot("file system");
            await buildAndRunApplication(volume, {
                pathToPackage: "root/test",
                binName: "test-cli",
                commands: [["--help"]],
                expect,
            });
        });

        it("custom metadata", async ({ expect }) => {
            // WHEN
            const { terminal, volume } = await createNewApplication(
                [
                    "test",
                    "--template",
                    "single",
                    "--type",
                    "commonjs",
                    "--description",
                    "Test CLI",
                    "--license",
                    "UNLICENSED",
                    "--author",
                    "Sample Author",
                ],
                { cwd: "/root" },
            );

            // THEN
            expect(terminal).toMatchInlineSnapshot(``);
            expect(volume).toMatchSnapshot("file system");
            await buildAndRunApplication(volume, {
                pathToPackage: "root/test",
                binName: "test",
                commands: [["--help"]],
                expect,
            });
        });
    });

    describe("additional features", () => {
        it("without auto-complete", async ({ expect }) => {
            // WHEN
            const { terminal, volume } = await createNewApplication(
                ["test", "--template", "single", "--type", "commonjs", "--no-auto-complete"],
                { cwd: "/root" },
            );

            // THEN
            expect(terminal).toMatchInlineSnapshot(``);
            expect(volume).toMatchSnapshot("file system");
            await buildAndRunApplication(volume, {
                pathToPackage: "root/test",
                binName: "test",
                commands: [["--help"]],
                expect,
            });
        });
    });
});
