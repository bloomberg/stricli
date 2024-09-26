// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.

// Adapted from monaco-react/src/MonacoContainer/MonacoContainer.tsx
import React, { CSSProperties, ReactNode, RefObject } from "react";

const styles: Record<string, CSSProperties> = {
    wrapper: {
        display: "flex",
        position: "relative",
        textAlign: "initial",
    },
    fullWidth: {
        width: "100%",
    },
    hide: {
        display: "none",
    },
};

// import Loading from '../Loading';
export type ContainerProps = {
    width: number | string;
    height: number | string;
    isEditorReady: boolean;
    loading: ReactNode | string;
    _ref: RefObject<HTMLDivElement>;
    className?: string;
    wrapperProps?: object;
};

// ** forwardref render functions do not support proptypes or defaultprops **
// one of the reasons why we use a separate prop for passing ref instead of using forwardref

export default function MonacoContainer({
    width,
    height,
    isEditorReady,
    loading,
    _ref,
    className,
    wrapperProps,
}: ContainerProps) {
    return (
        <section
            style={{ ...styles.wrapper, width, height, transition: "height var(--ifm-transition-fast) ease-out" }}
            {...wrapperProps}
        >
            {!isEditorReady && <div>{loading}</div>}
            <div ref={_ref} style={{ ...styles.fullWidth, ...(!isEditorReady && styles.hide) }} className={className} />
        </section>
    );
}
