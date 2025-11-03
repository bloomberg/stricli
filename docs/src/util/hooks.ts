// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { useEffect, useRef, EffectCallback, DependencyList } from "react";

export function useMount(effect: EffectCallback) {
    useEffect(effect, []);
}

export function usePrevious<T>(value: T) {
    const ref = useRef<T>();

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
}

export function useUpdate(effect: EffectCallback, deps: DependencyList, applyChanges = true) {
    const isInitialMount = useRef(true);

    useEffect(
        isInitialMount.current || !applyChanges
            ? () => {
                  isInitialMount.current = false;
              }
            : effect,
        deps,
    );
}
