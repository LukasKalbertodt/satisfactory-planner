import { type Node, Handle, NodeProps, Position } from "@xyflow/react";
import { Item, ItemId, ITEMS, Recipe, RecipeId, RECIPES } from "../gamedata";

import "./recipe.css";

export type RecipeNodeData = {
    recipeId: RecipeId;
};
export type RecipeNode = Node<RecipeNodeData, "recipe">;

export const RecipeNode = ({ data }: NodeProps<RecipeNode>) => {
    const recipe = RECIPES[data.recipeId];
    
    return (
        <div className="react-flow__node-default recipe-node">
            <div>{recipe.name}</div>
            <hr />
            <div className="io">
                <div className="inputs">
                    {recipe.inputs.map((input, idx) => <div className="input" key={idx}>
                        <IoEntry itemId={input.item} kind="input" />
                    </div>)}
                </div>
                <div className="outputs">
                    {recipe.outputs.map((output) => (
                        <div key={output.item}>{output.item} x{output.amount}</div>
                    ))}
                </div>
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
    <div className="io-entry">
        <img src={`/icons/parts/${itemId}.avif`} />
        <div>{ITEMS[itemId].name}</div>
    </div>
);
