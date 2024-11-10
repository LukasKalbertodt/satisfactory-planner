import { XYPosition } from "@xyflow/react";
import { match, notNullish, unreachable } from "../util";
import { immerable } from "immer";
import { type RecipeGraphNode } from "./recipe";
import { type MergerGraphNode } from "./merger";
import { type SplitterGraphNode } from "./splitter";
import { type SourceGraphNode } from "./source";
import { GraphHandle, GraphHandleId, NodeTypes } from ".";


export abstract class GraphNode {
    [immerable] = true;

    incomingEdges: Map<GraphHandleId, GraphHandle> = new Map();
    outgoingEdges: Map<GraphHandleId, GraphHandle> = new Map();
    pos: XYPosition;

    constructor(pos: XYPosition) {
        this.pos = pos;
    }

    abstract type(): NodeTypes;
    abstract inputs(): GraphHandleId[];
    abstract outputs(): GraphHandleId[];
    handles(): GraphHandleId[] {
        return [...this.inputs(), ...this.outputs()];
    }
    upstreamNeighbors(): GraphHandle[] {
        return this.inputs().map(h => this.incomingEdges.get(h)).filter(h => !!h);
    }
    downstreamNeighbors(): GraphHandle[] {
        return this.outputs().map(h => this.outgoingEdges.get(h)).filter(h => !!h);
    }
    neighbors(): GraphHandle[] {
        return [...this.upstreamNeighbors(), ...this.downstreamNeighbors()];
    };

    match<A, B, C, D>(cases: {
        recipe: (node: RecipeGraphNode, type: "recipe") => A;
        merger: (node: MergerGraphNode, type: "merger") => B;
        splitter: (node: SplitterGraphNode, type: "splitter") => C;
        source: (node: SourceGraphNode, type: "source") => D;
    }): A | B | C | D {
        // I would like to use `instanceof` checks here, which would make the casts unnecessary,
        // but for that I would need to import the classes, which results in circular imports.
        const ty = this.type();
        return match<NodeTypes, A | B | C | D>(ty, {
            "recipe": () => cases.recipe(this as unknown as RecipeGraphNode, "recipe"),
            "merger": () => cases.merger(this as unknown as MergerGraphNode, "merger"),
            "splitter": () => cases.splitter(this as unknown as SplitterGraphNode, "splitter"),
            "source": () => cases.source(this as unknown as SourceGraphNode, "source"),
        }, unreachable);
    }
}
