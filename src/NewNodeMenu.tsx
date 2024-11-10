import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useShallow } from "zustand/shallow";
import { LuArrowRightFromLine } from "react-icons/lu";

import { ITEMS, Recipe, recipeEntries, RecipeEntry, RecipeId } from "./gamedata";
import { itemIcon, match, nodeColor, useEventListener } from "./util";
import { useStore } from "./store";
import SplitterIcon from "./icons/splitter.svg?react";
import MergerIcon from "./icons/merger.svg?react";
import { GraphNode } from "./graph/node";
import { RecipeGraphNode } from "./graph/recipe";
import { SplitterGraphNode } from "./graph/splitter";
import { MergerGraphNode } from "./graph/merger";
import { SourceGraphNode } from "./graph/source";


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
            ...(e.clientY < bounds.height - HEIGHT || e.clientY < HEIGHT)
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
    const { addNodeInner } = useStore(useShallow(state => ({
        addNodeInner: state.addNode,
    })));

    const { screenToFlowPosition } = useReactFlow();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<RecipeEntry[]>(filterRecipes(query));
    const [selected, setSelected] = useState<RecipeId | null>(results[0]?.id ?? null);

    const nodePos = () => screenToFlowPosition(pos.mouse);
    const addNode = (n: GraphNode) => {
        addNodeInner(n);
        close();
    };
    const addRecipe = (recipe: RecipeId) => addNode(new RecipeGraphNode(recipe, nodePos()));
    const addSplitter = () => addNode(new SplitterGraphNode(nodePos()));
    const addMerger = () => addNode(new MergerGraphNode(nodePos()));
    const addSource = () => addNode(new SourceGraphNode("iron-ore", 60, nodePos()));

    // Keyboard control (arrow keys and enter).
    useEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setSelected((prev) => {
                const currentIndex = results.findIndex(({ id }) => id === prev);
                const nextIndex = e.key === "ArrowDown"
                    ? Math.min(currentIndex + 1, results.length - 1)
                    : Math.max(currentIndex - 1, 0);
                return results[nextIndex].id;
            });
        } else if (e.key === "Enter" && selected) {
            addRecipe(selected);
        }
    });

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
            <div css={{
                marginBottom: 4,
                display: "flex",
                gap: 8,
                "& > button": {
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #999",
                    fontSize: 24,
                    cursor: "pointer",
                }
            }}>
                <button onClick={addSource} css={{
                    borderRadius: "50%",
                    background: "#b6ffc9",
                    "&:hover": {
                        background: "#a5eeb8",
                    },
                }}>
                    <LuArrowRightFromLine />
                </button>
                <button onClick={addSplitter} css={{
                    background: nodeColor("splitter").normal,
                    borderRadius: 10,
                    "&:hover": {
                        background: nodeColor("splitter").hover,
                    },
                }}>
                    <SplitterIcon />
                </button>
                <button onClick={addMerger} css={{
                    background: nodeColor("merger").normal,
                    borderRadius: 10,
                    "&:hover": {
                        background: nodeColor("merger").hover,
                    },
                }}>
                    <MergerIcon />
                </button>
            </div>
            <input
                type="text"
                placeholder="Add recipe"
                autoFocus
                value={query}
                onChange={(e) => {
                    const q = e.target.value;
                    setQuery(q)
                    const newResults = filterRecipes(q);
                    setResults(newResults);
                    if (selected && !newResults.some(({ id }) => id === selected)) {
                        setSelected(newResults[0]?.id ?? null);
                    }
                }}
                css={{
                    width: "100%",
                    boxSizing: "border-box",
                    fontSize: 16,
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
                    "&:hover, &[data-selected=true]": {
                        outline: "2px solid #aaa",
                        outlineOffset: -2,
                    },
                },
            }}>
                {results.map((recipe) => (
                    <li
                        key={recipe.id}
                        data-selected={recipe.id === selected}
                        onClick={() => addRecipe(recipe.id)}
                    >
                        <div css={{
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
                                {recipe.info.inputs.map(i => <img key={i.item} src={itemIcon(i.item)} loading="lazy" />)}
                                {"→"}
                                {recipe.info.outputs.map(o => <img key={o.item} src={itemIcon(o.item)} loading="lazy" />)}
                            </div>

                            {recipe.info.alternative && <div css={{
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
                        }}>{recipe.info.name}</div>
                    </li>
                ))}
            </ul>
        </div>
    )
};

const filterRecipes = (query: string): RecipeEntry[] => {
    // Sort recipes to roughly match "simpler recipes first".
    const sort = (arr: RecipeEntry[]) => arr.sort((a, b) => {
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

        return score(a.info) - score(b.info);
    });

    const nameMatches: RecipeEntry[] = [];
    const outputMatches: RecipeEntry[] = [];

    const q = query.toLowerCase();
    for (const recipe of recipeEntries()) {
        if (recipe.info.name.toLowerCase().includes(q)) {
            nameMatches.push(recipe);
        } else if (recipe.info.outputs.some(o => ITEMS[o.item].name.toLowerCase().includes(q))) {
            outputMatches.push(recipe);
        }
    }
    sort(nameMatches);
    sort(outputMatches);
    return nameMatches.concat(outputMatches);
};
