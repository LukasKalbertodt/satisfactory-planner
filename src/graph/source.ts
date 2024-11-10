import { immerable } from "immer";
import { XYPosition } from "@xyflow/react";
import { GraphHandleId } from ".";
import { ResourceItem } from "../gamedata";
import { GraphNode } from "./node";


export class SourceGraphNode extends GraphNode {
    [immerable] = true;

    item: ResourceItem;
    rate: number;

    type() { return "source" as const; }

    constructor(item: ResourceItem, rate: number, pos: XYPosition) {
        super(pos);
        this.item = item;
        this.rate = rate;
    }

    inputs(): GraphHandleId[] {
        return [];
    }
    outputs(): GraphHandleId[] {
        return [0 as GraphHandleId];
    }
}
