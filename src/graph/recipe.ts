import { Position, XYPosition } from "@xyflow/react";
import { immerable } from "immer";
import { GraphHandleId, GraphJson } from ".";
import { IoEntry, RecipeId, RECIPES } from "../gamedata";
import { match, notNullish } from "../util";
import { GraphNode } from "./node";


// We try to use low numbers for inputs and outputs. There is no recipes that has more than
// 4 inputs or outputs. So 0-3 are for inputs, 4-7 are for outputs.
export const recipeHandleIdFor = (idx: number, kind: "input" | "output"): GraphHandleId => {
    return match(kind, {
        "input": () => idx as GraphHandleId,
        "output": () => 4 + idx as GraphHandleId,
    });
};
export const recipeHandlePos = (handle: GraphHandleId): Position => {
    return handle < 4 ? Position.Left : Position.Right;
};

export class RecipeGraphNode extends GraphNode {
    [immerable] = true;

    recipe: RecipeId;
    buildingsCount: number = 1;
    overclock: number = 1;

    type() { return "recipe" as const; }

    constructor(recipe: RecipeId, pos: XYPosition) {
        super(pos);
        this.recipe = recipe;
    }


    inputs(): GraphHandleId[] {
        return RECIPES[this.recipe].inputs.map((_, idx) => recipeHandleIdFor(idx, "input"));
    }
    outputs(): GraphHandleId[] {
        return RECIPES[this.recipe].outputs.map((_, idx) => recipeHandleIdFor(idx, "output"));
    }

    entry(handle: GraphHandleId): IoEntry {
        const [xputs, idx] = handle < 4
            ? [RECIPES[this.recipe].inputs, handle]
            : [RECIPES[this.recipe].outputs, handle - 4];

        return notNullish(xputs[idx]);
    }

    toJSON(): GraphJson["nodes"][string] {
        const { incomingEdges: _0, outgoingEdges: _1, ...rest } = this;
        return {
            type: this.type(),
            ...rest,
        };
    }
}
