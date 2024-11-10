import { immerable } from "immer";
import { Position } from "@xyflow/react";
import { GraphHandleId } from ".";
import { match, unreachable } from "../util";
import { GraphNode } from "./node";


export const SPLITTER_INPUTS = [0 as GraphHandleId];
export const SPLITTER_OUTPUTS = [1, 2, 3].map(n => n as GraphHandleId);
export const SPLITTER_HANDLES = [...SPLITTER_INPUTS, ...SPLITTER_OUTPUTS];
export const splitterHandlePos = (handle: GraphHandleId): Position => {
    return match(handle as number, {
        0: () => Position.Left,
        1: () => Position.Top,
        2: () => Position.Right,
        3: () => Position.Bottom,
    }, unreachable);
};

export class SplitterGraphNode extends GraphNode {
    [immerable] = true;

    type() { return "splitter" as const; }

    inputs(): GraphHandleId[] {
        return SPLITTER_INPUTS;
    }
    outputs(): GraphHandleId[] {
        return SPLITTER_OUTPUTS;
    }
}
