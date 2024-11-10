import { bug, notNullish } from "../util";
import { NODE_TYPES } from "../nodes";
import { immerable } from "immer";
import { type GraphNode } from "./node";
import { ItemId } from "../gamedata";


export type GraphNodeId = number & { readonly __tag: unique symbol };
export type GraphHandleId = number & { readonly __tag: unique symbol };

export type NodeTypes = keyof typeof NODE_TYPES;



/** A specific handle of a specific node. */
export class GraphHandle {
    [immerable] = true;

    node: GraphNodeId;
    handle: GraphHandleId;

    constructor(node: GraphNodeId, handle: GraphHandleId) {
        this.node = node;
        this.handle = handle;
    }
}


export class Graph {
    [immerable] = true;

    nodes: Map<GraphNodeId, GraphNode> = new Map();

    nodeIdCounter: number = 0;
    edgeIdCounter: number = 0;

    node(id: GraphNodeId, kind?: string): GraphNode {
        return notNullish(
            this.nodes.get(id),
            `${kind ? kind + " " : ""}node with id '${id}' does not exist`,
        );
    }

    isValidConnection(source: GraphHandle, target: GraphHandle): boolean {
        const getItem = (handle: GraphHandle): ItemId | undefined => {
            const getDirectItem = ({ node, handle }: GraphHandle): ItemId | undefined => {
                const n = this.node(node);
                return n.match({
                    recipe: (node) => node.entry(handle).item,
                    merger: (node) => undefined,
                    splitter: (node) => undefined,
                    source: (node) => node.item,
                });
            };

            // DFS and take the first item we find
            const visited = new Set<GraphHandle>();
            const stack = [handle];
            while (stack.length > 0) {
                const curr = stack.pop()!;
                const item = getDirectItem(curr);
                if (item) {
                    return item;
                }

                if (visited.has(curr)) {
                    continue;
                }
                visited.add(curr);

                const n = this.node(curr.node);
                n.neighbors().forEach(h => stack.push(h));
            }

            return undefined;
        };


        const sourceItem = getItem(source);
        const targetItem = getItem(target);
        return sourceItem === undefined
            || targetItem === undefined
            || sourceItem === targetItem;
    }

    addNode(node: GraphNode): GraphNodeId {
        const id = this.nodeIdCounter as GraphNodeId;
        this.nodeIdCounter += 1;
        this.nodes.set(id, node);
        return id;
    }

    removeNode(id: GraphNodeId) {
        if (this.node(id).incomingEdges.size > 0 || this.node(id).outgoingEdges.size > 0) {
            bug("node still has edges");
        }
        this.nodes.delete(id);
    }

    addEdge(source: GraphHandle, target: GraphHandle) {
        const sourceNode = this.node(source.node, "source");
        const targetNode = this.node(target.node, "target");

        if (!sourceNode.outputs().includes(source.handle)) {
            bug("source handle invalid");
        }
        if (!targetNode.inputs().includes(target.handle)) {
            bug("target handle invalid");
        }

        if (sourceNode.outgoingEdges.has(source.handle)) {
            bug("source handle already connected");
        }
        if (targetNode.incomingEdges.has(target.handle)) {
            bug("target handle already connected");
        }

        sourceNode.outgoingEdges.set(source.handle, target);
        targetNode.incomingEdges.set(target.handle, source);
    }

    removeEdge(source: GraphHandle, target: GraphHandle) {
        const sourceNode = notNullish(this.nodes.get(source.node), "source does not exist");
        const targetNode = notNullish(this.nodes.get(target.node), "target does not exist");

        if (!sourceNode.outputs().includes(source.handle)) {
            bug("source handle invalid");
        }
        if (!targetNode.inputs().includes(target.handle)) {
            bug("target handle invalid");
        }

        if (!sourceNode.outgoingEdges.has(source.handle)) {
            bug("source handle not connected");
        }
        if (!targetNode.incomingEdges.has(target.handle)) {
            bug("target handle not connected");
        }

        sourceNode.outgoingEdges.delete(source.handle);
        targetNode.incomingEdges.delete(target.handle);
    }
}
