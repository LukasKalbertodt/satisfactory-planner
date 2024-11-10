import { bug, notNullish } from "../util";
import { NODE_TYPES } from "../nodes";
import { immerable } from "immer";
import { type GraphNode } from "./node";


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
        return true; // TODO
        // const getItem = (node: FlowNode, handle?: string | null): ItemId | undefined => {
        //     return match(node.type, {
        //         "recipe": () => (
        //             handleToEntry(node as RecipeNode, handle!).item
        //         ),
        //         "source": () => (node as SourceNode).data.item,
        //         "splitter": () => undefined, // TODO
        //         "merger": () => undefined, // TODO
        //     });
        // };

        // const sourceItem = getItem(source, connection.sourceHandle);
        // const targetItem = getItem(target, connection.targetHandle);
        // return sourceItem === undefined 
        //     || targetItem === undefined 
        //     || sourceItem === targetItem;
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
