import { ITEMS as ITEMS_ } from "./items";
import { RECIPES as RECIPES_ } from "./recipes";

export const ITEMS: Record<ItemId, Item> = ITEMS_;
export const RECIPES: Record<RecipeId, Recipe> = RECIPES_;

export type ItemId = keyof typeof ITEMS_;
export type Item = {
    /** Human-readable name of the item. */
    name: string;
    /** Human-readable description of the item. */
    description: string;
};

export type RecipeId = keyof typeof RECIPES_;
export type RecipeEntry = {
    id: RecipeId;
    info: Recipe;
};

export const recipeEntries = (): RecipeEntry[] => (
    Object.entries(RECIPES).map(([id, info]) => ({ id: id as RecipeId, info }))
);

/** Information about a recipe. */
export type Recipe = {
    /** Human-readable name of the recipe. */
    name: string;
    /** Crafting duration in seconds, at 100%. */
    duration: number;
    /** Building this recipe is produced in. */
    producedIn: ProductionBuilding;
    /** Whether this is an alternative recipe. */
    alternative: boolean;
    /** For recipes inside fluctuating power buildings, the min and max power requirement. */
    powerRequirements?: [number, number];
    /** Inputs for the recipe. */
    inputs: IoEntry[];
    /** Outputs for the recipe. */
    outputs: IoEntry[];
};

export type IoEntry = {
    item: ItemId;
    amount: number;
};

/** All buildings that can run recipes. */
type ProductionBuilding = 
    | "smelter"
    | "foundry"
    | "constructor"
    | "assembler"
    | "manufacturer"
    | "refinery"
    | "packager"
    | "blender"
    | "nuclear-reactor"
    | "particle-accelerator"
    | "converter"
    | "quantum-encoder"
    ;

export const RESOURCE_ITEMS = [
    "iron-ore",
    "copper-ore",
    "limestone",
    "coal",
    "water",
    "raw-quartz",
    "sulfur",
    "crude-oil",
    "caterium-ore",
    "bauxite",
    "uranium",
    "sam",
] as const satisfies ItemId[];

export type ResourceItem = typeof RESOURCE_ITEMS[number];
