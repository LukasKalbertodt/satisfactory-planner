import { useEffect } from "react";
import { ItemId, RECIPES } from "./gamedata";
import { RecipeNode } from "./nodes/Recipe";
import { Position } from "@xyflow/react";

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

export const handleId = (idx: number, kind: "input" | "output") => 
    match(kind, { input: () => "i", output: () => "o" }) + ":" + idx;

export const recipeHandlePos = (handleId: string) => {
    const [kind,] = handleId.split(":");
    return match(kind, {
        "i": () => Position.Left,
        "o": () => Position.Right,
    });
};

export const handleToEntry = (node: RecipeNode, handle: string) => {
    // TODO: what if the handle is invalid?
    const [kind, idx] = handle.split(":");
    const field = match(kind, {
        "i": () => "inputs" as const,
        "o": () => "outputs" as const,
    });
    const io = RECIPES[node.data.recipeId][field];
    return io[Number(idx)];
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
