import { useEffect } from "react";
import { ItemId } from "./gamedata";
import { GraphHandle, GraphHandleId, GraphNodeId } from "./graph";

export const itemIcon = (itemId: ItemId) => `${import.meta.env.BASE_URL}icons/parts/${itemId}.avif`;

export const useEventListener = <K extends keyof WindowEventMap>(
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => void,
) => {
    useEffect(() => {
        window.addEventListener(type, listener);
        return () => window.removeEventListener(type, listener);
    });
};

export const toFlowNodeId = (id: GraphNodeId): string => id.toString(16);
export const fromFlowNodeId = (id: string): GraphNodeId => parseInt(id, 16) as GraphNodeId;
export const toFlowHandleId = (id: GraphHandleId): string => id.toString();
export const fromFlowHandleId = (id: string): GraphHandleId => {
    const out = parseInt(id);
    if (isNaN(out)) {
        bug(`Invalid handle id '${id}'`);
    }
    return out as GraphHandleId;
};
export const connectionToHandles = (c: {
    source: string;
    sourceHandle?: string | null;
    target: string;
    targetHandle?: string | null;
}): [GraphHandle, GraphHandle] => [
    new GraphHandle(fromFlowNodeId(c.source), fromFlowHandleId(notNullish(c.sourceHandle))),
    new GraphHandle(fromFlowNodeId(c.target), fromFlowHandleId(notNullish(c.targetHandle))),
];
export const handlePairToEdgeId = (source: GraphHandle, target: GraphHandle) =>
    toFlowNodeId(source.node) + ":" + toFlowHandleId(source.handle)
        + "-" + toFlowNodeId(target.node) + ":" + toFlowHandleId(target.handle);
export const edgeIdToHandlePair = (id: string): [GraphHandle, GraphHandle] => {
    const [source, target] = id.split("-");
    const [sourceNode, sourceHandle] = source.split(":");
    const [targetNode, targetHandle] = target.split(":");
    return [
        new GraphHandle(fromFlowNodeId(sourceNode), fromFlowHandleId(sourceHandle)),
        new GraphHandle(fromFlowNodeId(targetNode), fromFlowHandleId(targetHandle)),
    ];
};


export const nodeColor = (kind: "splitter" | "merger") => {
    return match(kind, {
        splitter: () => ({ normal: "#e3efff", hover: "#cddff7" }),
        merger: () => ({ normal: "#faebdd", hover: "#efd9c4" }),
    });
};

/**
 * A switch-case-like expression with exhaustiveness check (or fallback value).
 * A bit like Rust's `match`, but worse.
 *
 * If the `fallback` is not given, the given match arms need to be exhaustive.
 * This helps a lot with maintanence as adding a new variant to a union type
 * will throw compile errors in all places that likely need adjustment. You can
 * also pass a fallback (default) value as third parameter, disabling the
 * exhaustiveness check.
 *
 * ```
 * type Animal = "dog" | "cat" | "fox";
 *
 * const animal = "fox" as Animal;
 * const awesomeness = match(animal, {
 *     "dog": () => 7,
 *     "cat": () => 6,
 *     "fox": () => 100,
 * });
 * ```
 */
export function match<T extends string | number, Out>(
    value: T,
    arms: Record<T, () => Out>,
): Out;
export function match<T extends string | number, Out>(
    value: T,
    arms: Partial<Record<T, () => Out>>,
    fallback: () => Out,
): Out;
export function match<T extends string | number, Out>(
    value: T,
    arms: Partial<Record<T, () => Out>>,
    fallback?: () => Out,
): Out {
    if (!(value in arms)) {
        throw new Error(`Non-exhaustive match: ${value} not inside ${Object.keys(arms)}`);
    }

    return fallback === undefined
        // Unfortunately, we haven't found a way to make the TS typesystem to
        // understand that in the case of `fallback === undefined`, `arms` is
        // not a partial map. But it is, as you can see from the two callable
        // signatures above.
        ? arms[value]!()
        : (arms[value] as (() => Out) | undefined ?? fallback)();
}

/**
 * A custom error type that represents bugs: errors that are not expected and
 * that cannot be handled. They are caused by a bug in our code and not by the
 * "world" (e.g. any input). Use the helper functions below to throw this error.
 */
export class Bug extends Error {
    public constructor(msg: string) {
        super(`${msg} (this is a bug in this application)`);
        this.name = "Bug";
    }
}

/** Throws a `Bug` error. Use this function to signal a bug in the code. */
export const bug = (msg: string): never => {
    throw new Bug(msg);
};

/** Like `bug`, but specifically for code paths that should be unreachable. */
export const unreachable = (msg?: string): never => {
    const prefix = "reached unreachable code";
    throw new Bug(msg === undefined ? prefix : `${prefix}: ${msg}`);
};

/**
 * Asserts that the given value is neither null nor undefined and throws an
 * exception otherwise.
 */
export const notNullish = <T, >(v: T | null | undefined, msg?: string): T => {
    if (v == null) {
        return bug(msg ?? "value was unexpectedly nullish");
    }

    return v;
};
