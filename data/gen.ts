/**
 * This script generates the game data structures required for the app from satisfactory.wiki.gg.
 * Specifically, it uses these two sources:
 * - https://satisfactory.wiki.gg/wiki/Template:DocsRecipes.json?action=edit
 * - https://satisfactory.wiki.gg/wiki/Template:DocsItems.json?action=edit
 * 
 * The script expects them as `raw-recipes.json` and `raw-items.json` in the same directory. It 
 * generates `src/gamedata/{items,recipes}.ts`.    
 * 
 * Run as `deno run --allow-read --allow-write data/gen.ts`.
 */


type RawItemId = string;
type OurItemId = string;
type RawRecipeId = string;
type OurRecipeId = string;

type Items = Record<RawItemId, Item>;
type Item = {
    id: OurItemId;
    name: string;
    description: string;
};

type Recipes = Record<RawRecipeId, Recipe>;
type Recipe = {
    id: OurRecipeId,
    name: string;
    duration: number;
    producedIn: ProductionBuilding;
    alternative: boolean;
    powerRequirements?: [number, number];
    inputs: {
        item: OurItemId;
        amount: number;
    }[],
    outputs: {
        item: OurItemId;
        amount: number;
    }[],
};

type ProductionBuilding = typeof BUILDING_MAPPING[keyof typeof BUILDING_MAPPING]

// Buildings names inside the JSON are not that nice, so we map them to nicer names.
const BUILDING_MAPPING = {
    "Desc_SmelterMk1_C": "smelter",
    "Desc_FoundryMk1_C": "foundry",
    "Desc_ConstructorMk1_C": "constructor",
    "Desc_AssemblerMk1_C": "assembler",
    "Desc_ManufacturerMk1_C": "manufacturer",
    "Desc_OilRefinery_C": "refinery",
    "Desc_Packager_C": "packager",
    "Desc_Blender_C": "blender",
    "Desc_GeneratorNuclear_C": "nuclear-reactor",
    "Desc_HadronCollider_C": "particle-accelerator",
    "Desc_Converter_C": "converter",
    "Desc_QuantumEncoder_C": "quantum-encoder",
} as const;



const main = async () => {
    console.log("Reading input JSON files...");
    const rawItems = await Deno.readTextFile('raw-items.json');
    const items = readItems(rawItems);
    const rawRecipes = await Deno.readTextFile('raw-recipes.json');
    const recipes = readRecipes(rawRecipes, items);

    // Remove items that are not used in any recipes.
    for (const [rawKey, item] of Object.entries(items)) {
        const isUsed = Object.values(recipes).some(recipe => {
            return recipe.inputs.some(input => input.item === item.id)
                || recipe.outputs.some(output => output.item === item.id);
        });
        if (!isUsed) {
            delete items[rawKey];
        }
    }


    // Check if icons for all parts are available
    const exists = async (path: string): Promise<boolean> => {
        try {
            const stat = await Deno.stat(path);
            return stat.isFile;
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                return false;
            }
            throw error;
        }
    };
    for (const [key, item] of Object.entries(items)) {
        const iconPath = `../public/icons/parts/${item.id}.avif`;
        if (!await exists(iconPath)) {
            console.log(`Icon for '${item.name}' is missing: ${iconPath}`);
        }
    }


    // ----------------------------------
    console.log("Generating output TS files...");
    const stringifyObj = (key: string, obj: unknown) => {
        delete obj.id;
        return JSON.stringify(obj, null, 4)
            .replace(/^{/, `{ // ${key}`)
            .replaceAll("\n", "\n    ");
    };
    const fileHeader = "// This file is generated by 'data/gen.ts'!\n"
        + "// \n"
        + "// The data in this file is not licensed under the same license as the rest of the\n"
        + "// project. It is derived from the Satisfactory Wiki, which in turn took it from the\n"
        + "// game. See the main README for more information.\n";

    let itemsDef = fileHeader;
    itemsDef += `import type { Item } from ".";\n\n`;
    itemsDef += "export const ITEMS = {\n";
    for (const [key, item] of Object.entries(items)) {
        itemsDef += `    "${item.id}": ${stringifyObj(key, item)},\n`;
    }
    itemsDef += "} as const satisfies Record<string, Item>;\n";
    await Deno.writeTextFile("../src/gamedata/items.ts", itemsDef);

    let recipesDef = fileHeader;
    recipesDef += `import type { Recipe } from ".";\n\n`;
    recipesDef += "export const RECIPES = {\n";
    for (const [key, recipe] of Object.entries(recipes)) {
        recipesDef += `    "${recipe.id}": ${stringifyObj(key, recipe)},\n`;
    }
    recipesDef += "} as const satisfies Record<string, Recipe>;\n";
    await Deno.writeTextFile("../src/gamedata/recipes.ts", recipesDef);
};

const readItems = (rawText: string): Items => {
    const raw = JSON.parse(rawText);

    const out = Object.create(null);
    for (const [rawKey, value] of Object.entries(raw)) {
            // It seems that all values are arrays of length 1.
            if (!Array.isArray(value) || value.length !== 1) {
            throw new Error("value in map is not an array of length 1");
        }
        const info = value[0];

        // Skip all recipes that are not available on the stable branch
        if (info.stable !== true) {
            continue;
        }

        out[rawKey] = {
            id: info.name.toLowerCase().replace(/ /g, '-'),
            name: info.name,
            description: info.description,
        };
    }

    return out;
};

const readRecipes = (rawText: string, items: Items): Recipes => {
    const raw = JSON.parse(rawText);
    const recipes = Object.create(null);

    for (const [rawKey, value] of Object.entries(raw)) {
        // It seems that all values are arrays of length 1.
        if (!Array.isArray(value) || value.length !== 1) {
            throw new Error("value in map is not an array of length 1");
        }
        const info = value[0];

        // Other facts about the JSON:
        // - `className` is always the same as the key in the object.
        // - The objects in `ingredients` always look like `{ item: string; amount: number }`.

        // Skip all recipes that cannot be automated. Also unpack the array that's 
        // always of length 0 or 1.
        if (info.producedIn.length === 0) {
            continue;
        }
        const producedIn = info.producedIn[0];

        // Skip all limited-time recipes (e.g. FICSMAS) for now
        if (info.seasons.length > 0) {
            continue;
        }

        // Skip all recipes that are not available on the stable branch
        if (info.stable !== true) {
            continue;
        }
        

        const building = BUILDING_MAPPING[producedIn];
        if (building == null) {
            throw new Error(`Unknown building: ${producedIn}`);
        }

        // Generate nice ID for our usages. The ID from the JSON is ugly and contains useless 
        // information.
        const customMapping = {
            "TempRecipe_NuclearWaste_C": "nuclear-waste",
            "TempRecipe_PlutoniumWaste_C": "plutonium-waste",
            "Recipe_CartridgeChaos_Packaged_C": "turbo-rifle-ammo-packaged",
        };
        const id = customMapping[rawKey]
            ?? info.name.toLowerCase().replace(/ /g, '-').replace(/[()]/g, '');
        
        const mapItemId = (item: { item: RawItemId; amount: number }) => ({
            item: items[item.item].id,
            amount: item.amount,
        });

        recipes[rawKey] = {
            id,
            name: info.name,
            duration: info.duration,
            producedIn: building,
            alternative: info.alternate,
            ...info.minPower != null && info.maxPower != null && { 
                powerRequirements: [info.minPower, info.maxPower],
            },
            inputs: info.ingredients.map(mapItemId),
            outputs: info.products.map(mapItemId),
        };
    }

    return recipes;
};

main();
