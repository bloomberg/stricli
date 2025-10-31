// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import BrowserOnly from "@docusaurus/BrowserOnly";
import type { StricliPlaygroundProps } from "./impl";

/**
 *
 * @param props.title
 * @returns
 */
export default function StricliPlayground(props: StricliPlaygroundProps): React.JSX.Element {
    return (
        <BrowserOnly>
            {() => {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { default: Playground } = require("./impl") as typeof import("./impl");
                return <Playground {...props} />;
            }}
        </BrowserOnly>
    );
}
