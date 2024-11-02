import { ItemId } from "./gamedata";

export const itemIcon = (itemId: ItemId) => `/icons/parts/${itemId}.avif`;

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
    return fallback === undefined
      // Unfortunately, we haven't found a way to make the TS typesystem to
      // understand that in the case of `fallback === undefined`, `arms` is
      // not a partial map. But it is, as you can see from the two callable
      // signatures above.
      ? arms[value]!()
      : (arms[value] as (() => Out) | undefined ?? fallback)();
  }
