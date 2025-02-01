import { Position, XYPosition } from "@xyflow/react";
import { immerable } from "immer";
import { GraphHandle, GraphHandleId, GraphJson } from ".";
import { IoEntry, Recipe, RecipeId, RECIPES } from "../gamedata";
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

type ExtendedIoEntry = IoEntry & {
    handle: GraphHandleId;
    rate: number;
    totalRate: number;
    connectedTo: GraphHandle | null;
};

export class RecipeGraphNode extends GraphNode {
    [immerable] = true;

    recipeId: RecipeId;
    buildingsCount: number = 1;
    overclock: number = 1;

    type() { return "recipe" as const; }

    constructor(recipe: RecipeId, pos: XYPosition) {
        super(pos);
        this.recipeId = recipe;
    }


    inputs(): GraphHandleId[] {
        return this.recipe().inputs.map((_, idx) => recipeHandleIdFor(idx, "input"));
    }
    outputs(): GraphHandleId[] {
        return this.recipe().outputs.map((_, idx) => recipeHandleIdFor(idx, "output"));
    }

    multiplier(): number {
        return this.buildingsCount * this.overclock;
    }
    recipe(): Recipe {
        return RECIPES[this.recipeId];
    }

    inputEntries(): ExtendedIoEntry[] {
        return this.inputs().map(handle => this.entry(handle));
    }
    outputEntries(): ExtendedIoEntry[] {
        return this.outputs().map(handle => this.entry(handle));
    }
    entry(handle: GraphHandleId): ExtendedIoEntry {
        const recipe = this.recipe();
        const [xputs, edges, idx] = handle < 4
            ? [recipe.inputs, this.incomingEdges, handle]
            : [recipe.outputs, this.outgoingEdges, handle - 4];

        const entry = notNullish(xputs[idx]);
        const rate = entry.amount / recipe.duration * 60;
        return {
            ...entry,
            handle,
            rate,
            totalRate: rate * this.multiplier(),
            connectedTo: edges.get(handle) ?? null,
        };
    }

    toJSON(): GraphJson["nodes"][number] {
        const { incomingEdges: _0, outgoingEdges: _1, recipeId: _2, ...rest } = this;
        return {
            type: this.type(),
            recipe: this.recipeId,
            ...rest,
        };
    }
}
