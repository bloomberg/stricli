// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { riffle } from "@site/src/util/array";
import { ansiToJson } from "anser";
import React from "react";

export interface AnsiProps {
    children?: string;
    className?: string;
}

export default function Ansi({ children = "", className = "" }: AnsiProps) {
    const json = ansiToJson(children, { use_classes: true });
    const classes = ["ansi-block"];
    if (className) {
        classes.push(className);
    }
    return (
        <div className={classes.join(" ")}>
            {json.flatMap((entry, i) => {
                const classes: string[] = [];
                if (entry.fg) {
                    classes.push(entry.fg);
                }
                if (entry.bg) {
                    classes.push(entry.bg);
                }
                if (entry.decorations) {
                    classes.push(...entry.decorations.map((decoration) => `ansi-${decoration}`));
                }
                const lines = entry.content.split("\n").map((part, j) => {
                    const className = classes.join(" ") || void 0;
                    return (
                        <span className={className} key={`line-${i}-${j}`}>
                            {part}
                        </span>
                    );
                });
                return riffle(lines, (k) => <br key={`linebreak-${i}-${k}`} />);
            })}
        </div>
    );
}
