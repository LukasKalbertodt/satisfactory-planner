import { type Node, Handle, NodeProps, Position } from "@xyflow/react";
import { Item, ItemId, ITEMS, Recipe, RecipeId, RECIPES } from "../gamedata";


export type RecipeNodeData = {
    recipeId: RecipeId;
};
export type RecipeNode = Node<RecipeNodeData, "recipe">;

export const RecipeNode = ({ data }: NodeProps<RecipeNode>) => {
    const recipe = RECIPES[data.recipeId];
    const singleOutput = recipe.outputs.length === 1;
    
    return (
        <div css={{
            width: singleOutput ? 140 : 200,
            padding: 8,
            fontSize: 12,
            borderRadius: 4,
            textAlign: "center",
            border: "2px solid #444",
            background: "white",
        }}>
            <div>{recipe.name}</div>
            <hr css={{
                border: "none",
                borderTop: "1px solid #e0e0e0",
            }} />
            <div css={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
                fontSize: 10,
                "> div": {
                    flexShrink: 1,
                    minWidth: 0,
                }
            }}>
                <div>
                    {recipe.inputs.map((input, idx) => (
                        <IoEntry key={idx} itemId={input.item} kind="input" />
                    ))}
                </div>
                {!singleOutput && <>
                    <div css={{
                        borderLeft: "1px dashed #e0e0e0",
                        margin: 4,
                    }} />
                    <div>
                        {recipe.outputs.map((output) => (
                            <IoEntry itemId={output.item} kind="output" />
                        ))}
                    </div>
                </>}
            </div>
            <Handle type="source" position={Position.Left}  />
        </div>
    );
};

type IoEntryProps = {
    itemId: ItemId;
    kind: "input" | "output";
};

const IoEntry = ({ itemId, kind }: IoEntryProps) => (
    <div css={{
        height: 22,
        display: "flex",
        flexDirection: kind === "input" ? "row" : "row-reverse",
        gap: 8,
        margin: 2,
        alignItems: "center",
        whiteSpace: "nowrap",
    }}>
        <img 
            src={`/icons/parts/${itemId}.avif`} 
            css={{ height: "100%"}}
        />
        <div css={{
            flexShrink: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
        }}>{ITEMS[itemId].name}</div>
    </div>
);
