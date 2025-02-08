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

/** Items that can be a source, i.e. extracted from the environment. */
const SOURCE_ITEMS = [
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
];


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
    for (const item of Object.values(items)) {
        const iconPath = `../public/icons/parts/${item.id}.avif`;
        if (!await exists(iconPath)) {
            console.log(`Icon for '${item.name}' is missing: ${iconPath}`);
        }
    }


    // ----- Code generation -------------------------------------
    console.log("Generating output TS files...");
    const tsRecipes = genRecipesTs(recipes);
    await Deno.writeTextFile("../src/gamedata/recipes.ts", tsRecipes);
    const tsItems = genItemsTs(items);
    await Deno.writeTextFile("../src/gamedata/items.ts", tsItems);

    console.log("Generating output Rust files...");
    const rustRecipes = genRecipesRs(Object.values(recipes).map(recipe => recipe.id));
    await Deno.writeTextFile("../src/gamedata/recipes.rs", rustRecipes);
    const rustItems = genItemsRs(Object.values(items).map(item => item.id), SOURCE_ITEMS);
    await Deno.writeTextFile("../src/gamedata/items.rs", rustItems);
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
        // Unfortunately, there are some recipes not marked with `seasons`, but which have these
        // FICSMAS items as input.
        const dependOnFicsmas = [
            "Recipe_Fireworks_01_C",
            "Recipe_Fireworks_02_C",
            "Recipe_Fireworks_03_C",
        ];
        if (dependOnFicsmas.includes(rawKey)) {
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


// ------- Code generation ------------------------------------------------------------------------

const FILE_HEADER = `\
    // This file is generated by 'data/gen.ts'!
    //
    // The data in this file is not licensed under the same license as the rest of the
    // project. It is derived from the Satisfactory Wiki, which in turn took it from the
    // game. See the main README for more information.
`.replaceAll(/^    /gm, "");


// ----- Typescript code

const stringifyObj = (key: string, obj: object & { id?: string }) => {
    const out = { ...obj };
    delete out.id;
    return JSON.stringify(out, null, 4)
        .replace(/^{/, `{ // ${key}`)
        .replaceAll("\n", "\n        ");
};

const genRecipesTs = (recipes: Recipes) => `\
    ${FILE_HEADER}
    import type { Recipe } from ".";

    export const RECIPES = {${Object.entries(recipes).map(([key, recipe]) => `
        "${recipe.id}": ${stringifyObj(key, recipe)},`).join("")}
    } as const satisfies Record<string, Recipe>;
`.replaceAll(/^    /gm, "");

const genItemsTs = (items: Items) => `\
    ${FILE_HEADER}
    import type { Item } from ".";

    export const RESOURCE_ITEMS = [${SOURCE_ITEMS.map(id => `
        "${id}",`).join("")}
    ] as const;

    export const ITEMS = {${Object.entries(items).map(([key, item]) => `
        "${item.id}": ${stringifyObj(key, item)},`).join("")}
    } as const satisfies Record<string, Item>;
`.replaceAll(/^    /gm, "");


// ----- Rust code

const toPascalCase = (str: string) => str.replace(/(?:^|-)([a-z0-9])/g, (_, c) => c.toUpperCase());

const genRecipesRs = (recipes: string[]) => `\
    ${FILE_HEADER}

    #[derive(Debug, Clone, Copy, serde::Deserialize, serde::Serialize)]
    #[repr(u16)]
    pub enum RecipeKind {${recipes.map((id, idx) => `
        #[serde(rename = "${id}")]
        ${toPascalCase(id)} = ${idx},`).join("")}
    }

    impl TryFrom<u16> for RecipeKind {
        type Error = ();
        fn try_from(value: u16) -> Result<Self, Self::Error> {
            match value {${recipes.map((id, idx) => `
                ${idx} => Ok(Self::${toPascalCase(id)}),`).join("")}
                _ => Err(()),
            }
        }
    }
`.replaceAll(/^    /gm, "");

const genItemsRs = (items: string[], sourceItems: string[]) => `\
    ${FILE_HEADER}

    #[derive(Debug, Clone, Copy, serde::Deserialize, serde::Serialize)]
    #[repr(u8)]
    pub enum ItemKind {${items.map((id, idx) => `
        #[serde(rename = "${id}")]
        ${toPascalCase(id)} = ${idx},`).join("")}
    }

    impl TryFrom<u8> for ItemKind {
        type Error = ();
        fn try_from(value: u8) -> Result<Self, Self::Error> {
            match value {${items.map((id, idx) => `
                ${idx} => Ok(Self::${toPascalCase(id)}),`).join("")}
                _ => Err(()),
            }
        }
    }

    #[derive(Debug, Clone, Copy, serde::Deserialize, serde::Serialize)]
    #[repr(u8)]
    pub enum SourceItemKind {${sourceItems.map((id, idx) => `
        #[serde(rename = "${id}")]
        ${toPascalCase(id)} = ${idx},`).join("")}
    }

    impl TryFrom<u8> for SourceItemKind {
        type Error = ();
        fn try_from(value: u8) -> Result<Self, Self::Error> {
            match value {${sourceItems.map((id, idx) => `
                ${idx} => Ok(Self::${toPascalCase(id)}),`).join("")}
                _ => Err(()),
            }
        }
    }

    impl TryFrom<ItemKind> for SourceItemKind {
        type Error = ();
        fn try_from(value: ItemKind) -> Result<Self, Self::Error> {
            match value {${sourceItems.map(id => `
                ItemKind::${toPascalCase(id)} => Ok(Self::${toPascalCase(id)}),`).join("")}
                _ => Err(()),
            }
        }
    }

    impl From<SourceItemKind> for ItemKind {
        fn from(value: SourceItemKind) -> Self {
            match value {${sourceItems.map(id => `
                SourceItemKind::${toPascalCase(id)} => Self::${toPascalCase(id)},`).join("")}
            }
        }
    }
`.replaceAll(/^    /gm, "");




main();
