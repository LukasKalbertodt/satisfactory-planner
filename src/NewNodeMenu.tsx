import { useState } from "react";
import { ITEMS, Recipe, RecipeId, RECIPES } from "./gamedata";
import { itemIcon, match } from "./util";
import { useReactFlow } from "@xyflow/react";

export type NewNodeMenuPos = {
    css: {
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
    };
    mouse: {
        x: number;
        y: number;
    };
};

const WIDTH = 250;
const HEIGHT = 320;

export const calcNewNodeMenuPos = (
    e: React.MouseEvent | MouseEvent, 
    bounds: DOMRect,
): NewNodeMenuPos => {
    // Set just one property per dimension. The menu defaults to opening to the right bottom of 
    // the mouse, but if that would it to overflow, we position it differently.
    return ({
        css: {
            ...e.clientY < bounds.height - HEIGHT 
                ? { top: e.clientY }
                : { bottom: bounds.bottom - e.clientY },
            ...e.clientX < bounds.width - WIDTH
                ? { left: e.clientX }
                : { right: bounds.right - e.clientX },
        },
        mouse: {
            x: e.clientX,
            y: e.clientY,
        },
    });
};

export type NewNodeMenuProps = {
    pos: NewNodeMenuPos;
    close: () => void;
};

export const NewNodeMenu = ({ pos, close }: NewNodeMenuProps) => {
    const { addNodes, screenToFlowPosition } = useReactFlow();
    const [query, setQuery] = useState("");
    
    const results = filterRecipes(query);
    const addRecipe = (id: RecipeId) => {
        addNodes({
            id: Math.round(Math.random() * 1000000).toString(36), // TODO
            position: screenToFlowPosition(pos.mouse),
            type: "recipe",
            data: { recipeId: id },
        });
        close();
    };

    return (
        <div css={{
            position: "absolute",
            ...pos.css,
            width: WIDTH,
            height: HEIGHT,
            zIndex: 100,

            display: "flex",
            flexDirection: "column",
            gap: 4,

            padding: 8,
            borderRadius: 8,
            background: "#f4f4f4",
            border: "1px solid #bbb",
            boxShadow: "0 0 16px rgba(0, 0, 0, 0.3)",
        }}>
            <input 
                type="text" 
                placeholder="Add recipe"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                css={{ 
                    width: "100%", 
                    boxSizing: "border-box",
                    fontSize: 16,
                    fontFamily: "inherit",
                    border: "1px solid #999",
                    borderRadius: 4,
                    padding: "4px 8px"
                }} 
            />

            <ul css={{
                overflowY: "scroll",
                listStyle: "none",
                margin: 0,
                padding: 0,
                li: {
                    padding: "4px 8px",
                    margin: "4px 0",
                    background: "white",
                    borderRadius: 4,
                    cursor: "pointer",
                    "&:hover": {
                        outline: "2px solid #aaa",
                        outlineOffset: -2,
                    },
                },
            }}>
                {results.map(([id, recipe]) => <li key={id}>
                    <div onClick={() => addRecipe(id)} css={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 4,
                        width: "100%",
                    }}>
                        <div css={{
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            img: {
                                height: "100%",
                            }
                        }}>
                            {recipe.inputs.map(i => <img key={i.item} src={itemIcon(i.item)} loading="lazy" />)}
                            {"→"}
                            {recipe.outputs.map(o => <img key={o.item} src={itemIcon(o.item)} loading="lazy" />)}
                        </div>

                        {recipe.alternative && <div css={{
                            borderRadius: 4,
                            background: "#fad8b6",
                            color: "#444",
                            padding: "1px 4px",
                            fontSize: 12,
                            marginLeft: 4,
                        }}>Alt</div>}
                    </div>

                    <div css={{
                        width: "100%",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: 1.1,
                        fontStretch: "95%",
                    }}>{recipe.name}</div>
                </li>)}
            </ul>
        </div>
    )
};

type RecipeEntries = [RecipeId, Recipe][];
const filterRecipes = (query: string): RecipeEntries => {
    // Sort recipes to roughly match "simpler recipes first".
    const sort = (arr: RecipeEntries) => arr.sort((a, b) => {
        const score = (r: Recipe): number => {
            // The building has the highest impact on the score.
            const buildingScore = match(r.producedIn, {
                "smelter": () => 0,
                "foundry": () => 400,
                "constructor": () => 100,
                "assembler": () => 200,
                "manufacturer": () => 500,
                "refinery": () => 500,
                "packager": () => 500,
                "blender": () => 600,
                "nuclear-reactor": () => 800,
                "particle-accelerator": () => 1000,
                "converter": () => 1200,
                "quantum-encoder": () => 1200,
            });

            const numInputs = Math.max(1, r.inputs.length);
            const numOutputs = Math.max(1, r.outputs.length);

            return buildingScore + numInputs * 10 + numOutputs * 20 +  r.duration;
        };

        return score(a[1]) - score(b[1]);
    });

    const nameMatches: RecipeEntries = [];
    const outputMatches: RecipeEntries = [];

    const q = query.toLowerCase();
    for (const [id, recipe] of Object.entries(RECIPES) as RecipeEntries) {
        if (recipe.name.toLowerCase().includes(q)) {
            nameMatches.push([id, recipe]);
        } else if (recipe.outputs.some(o => ITEMS[o.item].name.toLowerCase().includes(q))) {
            outputMatches.push([id, recipe]);
        }
    }
    sort(nameMatches);
    sort(outputMatches);
    return nameMatches.concat(outputMatches);
};
