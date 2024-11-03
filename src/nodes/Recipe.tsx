import { type Node, Handle, NodeProps, Position, useUpdateNodeInternals } from "@xyflow/react";
import { ItemId, ITEMS, RecipeId, RECIPES } from "../gamedata";
import { useEffect } from "react";
import { handleId, itemIcon } from "../util";


export type RecipeNodeData = {
    recipeId: RecipeId;
};
export type RecipeNode = Node<RecipeNodeData, "recipe">;

export const RecipeNode = ({ id, data, selected }: NodeProps<RecipeNode>) => {
    // We need to tell react-flow to update handle information once after mounting everything.
    const updateNodeInternals = useUpdateNodeInternals();
    useEffect(() => updateNodeInternals(id));

    const recipe = RECIPES[data.recipeId];
    const amountToRate = (amount: number) => amount / recipe.duration * 60;

    return (
        <div css={{
            width: 250,
            padding: 8,
            fontSize: 12,
            borderRadius: 4,
            textAlign: "center",
            border: "1px solid #777",
            background: "white",
            "&:hover": {
                background: "#f8f8f8",
            },
            ...selected && {
                background: "#f8f8f8",
                outline: "2px solid #efc74f",
            },
        }}>
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
                width: 8,
                height: 8,
                background: "white",
                border: "2px solid #777",

                "&.connectingto": {
                    background: "#c0392b",
                    "&.valid": {
                        background: "#2ecc71",
                    },
                },

                // Increase clickable area
                "&::after": {
                    content: "''",
                    position: "absolute",
                    inset: -7,
                    borderRadius: "50%",
                },
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
