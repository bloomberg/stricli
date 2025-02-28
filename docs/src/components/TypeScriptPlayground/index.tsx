// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import BrowserOnly from "@docusaurus/BrowserOnly";
import type { TypeScriptPlaygroundProps } from "./impl";

export default function StricliPlayground(props: TypeScriptPlaygroundProps): React.JSX.Element {
    return (
        <BrowserOnly>
            {() => {
                // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-unsafe-assignment
                const { default: Playground } = require("./impl") as import("./impl");
                return <Playground {...props} />;
            }}
        </BrowserOnly>
    );
}
