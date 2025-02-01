import { immerable } from "immer";
import { GraphHandleId, GraphJson } from ".";
import { Position } from "@xyflow/react";
import { match, unreachable } from "../util";
import { GraphNode } from "./node";


export const MERGER_INPUTS = [0, 1, 2].map(n => n as GraphHandleId);
export const MERGER_OUTPUTS = [3 as GraphHandleId];
export const MERGER_HANDLES = [...MERGER_INPUTS, ...MERGER_OUTPUTS];
export const mergerHandlePos = (handle: GraphHandleId): Position => {
    return match(handle as number, {
        0: () => Position.Top,
        1: () => Position.Left,
        2: () => Position.Bottom,
        3: () => Position.Right,
    }, unreachable);
};

export class MergerGraphNode extends GraphNode {
    [immerable] = true;

    type() { return "merger" as const; }

    inputs(): GraphHandleId[] {
        return MERGER_INPUTS;
    }
    outputs(): GraphHandleId[] {
        return MERGER_OUTPUTS;
    }
    output(): GraphHandleId {
        return MERGER_OUTPUTS[0];
    }

    toJSON(): GraphJson["nodes"][number] {
        const { incomingEdges: _0, outgoingEdges: _1, ...rest } = this;
        return {
            type: this.type(),
            ...rest,
        };
    }
}
