// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { it } from "vitest";
import { createNewApplication } from "./util/create";
import { buildAndRunApplication } from "./util/run";

it("use major from process.versions.node", async ({ expect }) => {
    // WHEN
    const { terminal, volume } = await createNewApplication(["node-version-test"], {
        cwd: "/root",
        nodeVersion: "major.minor.patch",
    });

    // THEN
    expect(terminal).toMatchInlineSnapshot(``);
    expect(volume).toMatchSnapshot("file system");
    await buildAndRunApplication(volume, {
        pathToPackage: "root/node-version-test",
        binName: "node-version-test",
        commands: [["--help"], ["nested", "--help"]],
        expect,
    });
});

it("version discovery skipped when --node-version is provided", async ({ expect }) => {
    // WHEN
    const { terminal, volume } = await createNewApplication(
        ["node-version-test", "--node-version", "major.minor.patch"],
        { cwd: "/root", nodeVersion: "M.m.p" },
    );

    // THEN
    expect(terminal).toMatchInlineSnapshot(``);
    expect(volume).toMatchSnapshot("file system");
    await buildAndRunApplication(volume, {
        pathToPackage: "root/node-version-test",
        binName: "node-version-test",
        commands: [["--help"], ["nested", "--help"]],
        expect,
    });
});

it("skips node information in package.json if no node version available", async ({ expect }) => {
    // WHEN
    const { terminal, volume } = await createNewApplication(["node-version-test"], { cwd: "/root" });

    // THEN
    expect(terminal).toMatchInlineSnapshot(``);
    expect(volume).toMatchSnapshot("file system");
    await buildAndRunApplication(volume, {
        pathToPackage: "root/node-version-test",
        binName: "node-version-test",
        commands: [["--help"], ["nested", "--help"]],
        expect,
    });
});
