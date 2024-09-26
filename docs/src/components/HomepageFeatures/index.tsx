// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import React from "react";
import clsx from "clsx";
import styles from "./styles.module.css";
import Link from "@docusaurus/Link";

type FeatureItem = {
    title: string;
    Svg?: React.ComponentType<React.ComponentProps<"svg">>;
    description: React.JSX.Element;
};

const FeatureList: FeatureItem[] = [
    {
        title: "Full TypeScript Support",
        description: (
            <>
                TypeScript types for command <Link to="docs/features/argument-parsing/flags">named flags</Link> and <Link to="docs/features/argument-parsing/positional">positional arguments</Link> are defined once and then flow through the entire
                application.
            </>
        ),
    },
    {
        title: "Zero Dependencies",
        description: (
            <>
                Stricli is a self-contained command line parser that has no runtime dependencies. This is due to the
                powerful, yet strictly <Link to="docs/features/out-of-scope">limited scope</Link> of supported features.
            </>
        ),
    },
    {
        title: "Dual ESM + CommonJS",
        description: (
            <>This package is published with support for both ESM and CJS consumers (although ESM is recommended).</>
        ),
    },
    {
        title: "Ready for Code Splitting",
        description: (
            <>
                Command implementations are defined separately from their parameters, allowing for async imports and
                code splitting with ESM build tools. Run <code>--help</code> without ever importing a single runtime
                dependency.
            </>
        ),
    },
    {
        title: "Optional Dependency Injection",
        description: (
            <>
                All system access is encapsulated in a single <Link to="docs/features/isolated-context">context object</Link> which allows for easier dependency
                injection and mocking for unit tests.
            </>
        ),
    },
    {
        title: "Dynamic Autocomplete",
        description: (
            <>
                Stricli has first class support for <Link to="docs/features/shell-autocomplete">shell autocomplete</Link>{" "}
                that can include custom dynamic suggestions at runtime.
            </>
        ),
    },
];

function Feature({ title, Svg, description }: FeatureItem) {
    return (
        <div className={clsx("col col--4")}>
            {Svg && (
                <div className="text--center">
                    <Svg className={styles.featureSvg} role="img" />
                </div>
            )}
            <div className="text--left padding-horiz--md">
                <h2 className="hero-font-header">{title}</h2>
                <p>{description}</p>
            </div>
        </div>
    );
}

export default function HomepageFeatures(): React.JSX.Element {
    return (
        <section className={styles.features}>
            <div className="container">
                <div className="row">
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
        </section>
    );
}
