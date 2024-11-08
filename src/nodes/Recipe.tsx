import { type Node, Handle, NodeProps, Position, useUpdateNodeInternals } from "@xyflow/react";
import { ItemId, ITEMS, RecipeId, RECIPES } from "../gamedata";
import { useEffect } from "react";
import { handleId, itemIcon } from "../util";
import { handleCss } from "./util";
import { useStore } from "../store";
import { LuMinus, LuPlus } from "react-icons/lu";


export type RecipeNodeData = {
    recipeId: RecipeId;
    buildingsCount: number;
};
export type RecipeNode = Node<RecipeNodeData, "recipe">;

export const RecipeNode = ({ id, data, selected }: NodeProps<RecipeNode>) => {
    const setData = useStore(state => state.setRecipeNodeData);
    const updateData = (update: Partial<RecipeNodeData>) => setData(id, { ...data, ...update });

    // We need to tell react-flow to update handle information once after mounting everything.
    const updateNodeInternals = useUpdateNodeInternals();
    useEffect(() => updateNodeInternals(id));

    const recipe = RECIPES[data.recipeId];
    const amountToRate = (amount: number) => amount / recipe.duration * 60;

    return (
        <div css={{
            "--active-background": "#f8f8f8",
            width: 250,
            fontSize: 12,
            borderRadius: 4,
            textAlign: "center",
            border: "1px solid #777",
            background: "white",
            "&:hover": {
                background: "var(--active-background)",
            },
            ...selected && {
                background: "var(--active-background)",
                outline: "2px solid #efc74f",
            },
        }}>
            <div css={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: 2,
            }}>
                <BuildingsCount 
                    count={data.buildingsCount} 
                    setCount={count => updateData({ buildingsCount: count })} 
                />
                <div />
            </div>
            <div css={{
                fontFamily: "Hubot Sans",
                fontWeight: "bold",
            }}>{recipe.name}</div>
            <hr css={{
                border: "none",
                borderTop: "1px solid #e0e0e0",
            }} />
            <div css={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
                padding: "0 8px",
                fontSize: 10,
                gap: 8,
                "> div": {
                    flex: "1 1 100%", 
                }
            }}>
                <div>
                    {recipe.inputs.map((input, idx) => (
                        <IoEntry 
                            key={idx}
                            idx={idx}
                            itemId={input.item} 
                            rate={amountToRate(input.amount)} 
                            kind="input" 
                        />
                    ))}
                </div>
                <div>
                    {recipe.outputs.map((output, idx) => (
                        <IoEntry 
                            key={idx} 
                            idx={idx}
                            itemId={output.item} 
                            rate={amountToRate(output.amount)} 
                            kind="output" 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

type IoEntryProps = {
    idx: number;
    itemId: ItemId;
    rate: number;
    kind: "input" | "output";
};

const IoEntry = ({ idx, itemId, kind, rate }: IoEntryProps) => (
    <div css={{
        position: "relative",
        height: 22,
        display: "flex",
        flexDirection: kind === "input" ? "row" : "row-reverse",
        gap: 8,
        margin: "2px 0",
        alignItems: "center",
    }}>
        <Handle 
            id={handleId(idx, kind)}
            type={kind === "input" ? "target" : "source"} 
            position={kind === "input" ? Position.Left : Position.Right}
            css={{ 
                [kind === "input" ? "left" : "right"]: -8.5,
                ...handleCss
            }}
        />
        <img 
            src={itemIcon(itemId)} 
            css={{ height: "100%"}}
        />
        <div css={{
            fontFamily: "Hubot Sans",
            fontWeight: "bold",
            minWidth: 20,
            flex: "0 0 auto",
            textAlign: "right",
        }}>{rate.toString().slice(0, 6)}</div>
        <div css={{
            textAlign: kind === "input" ? "left" : "right",
            lineHeight: "1.1",
            flexShrink: 1,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            textOverflow: "ellipsis",
            fontStretch: "90%",
        }}>{ITEMS[itemId].name}</div>
    </div>
);

type BuildingsCountProps = {
    count: number;
    setCount: (count: number) => void;
};

const BuildingsCount = ({ count, setCount }: BuildingsCountProps) => {
    const updateFromInput = (value: string) => {
        const num = Number(value);
        if (isNaN(num)) {
            setCount(1);
        }
        setCount(Math.min(999, Math.max(1, num)));
    };
    
    return (
        <div css={{
            "--border-color": "#bbb",
            fontFamily: "Hubot Sans",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            height: 18,
            lineHeight: 1,
            marginLeft: -10,
            "& > button": {
                visibility: "hidden",
                background: "none",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                padding: 0,
                height: "100%",
                fontSize: "inherit",
                "&:hover": {
                    background: "#ddd",
                },
                "&:first-of-type": {
                    borderTopLeftRadius: 4,
                    borderBottomLeftRadius: 4,
                },
                "&:last-of-type": {
                    borderTopRightRadius: 4,
                    borderBottomRightRadius: 4,
                },
            },
            "&:hover, &:focus-within": {
                zIndex: 10,
                background: "var(--active-background)",
                "& > button": {
                    visibility: "visible",
                },
                "& > div": {
                    border: "1px solid var(--border-color)",
                    borderLeft: "none",
                    borderRight: "none",
                },
            },
        }}>
           
            <button onClick={() => setCount(count - 1)} disabled={count === 1}>
                <LuMinus />
            </button>
            <div css={{  height: "100%", display: "flex", alignItems: "center", minWidth: 28 }}>
                {/* We auto-size the `input` field by having a hidden span, which influence the 
                    size of the parent div */}
                <div css={{ 
                    position: "relative", 
                    height: "100%",
                    display: "inline-block",
                    "& > *": {
                        padding: "0 2px",
                    },
                }}>
                    <input 
                        type="text"
                        value={count} 
                        maxLength={3}
                        onBeforeInput={(e: React.CompositionEvent<HTMLInputElement>) => {
                            const v = e.data;
                            if (v !== "" && isNaN(Number(v))) {
                                e.preventDefault();
                            }
                        }}
                        onChange={e => updateFromInput(e.currentTarget.value)}
                        css={{
                            position: "absolute",
                            inset: 0,
                            border: "none",
                            height: "100%",
                            background: "none",
                        }}
                    />
                    <span css={{ visibility: "hidden" }}>{count}</span>
                </div>
                {"×"}
            </div>
            <button onClick={() => setCount(count + 1)}>
                <LuPlus />
            </button>
        </div>
    );
};
