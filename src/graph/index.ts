import { bug, matchTag, notNullish } from "../util";
import Ajv, { JTDDataType } from "ajv/dist/jtd";
import { NODE_TYPES } from "../nodes";
import { immerable } from "immer";
import { type GraphNode } from "./node";
import { ItemId, RecipeId, RECIPES, RESOURCE_ITEMS } from "../gamedata";
import { RecipeGraphNode } from "./recipe";
import { SourceGraphNode } from "./source";
import { SplitterGraphNode } from "./splitter";
import { MergerGraphNode } from "./merger";


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

    node(id: GraphNodeId, kind?: string): GraphNode {
        return notNullish(
            this.nodes.get(id),
            `${kind ? kind + " " : ""}node with id '${id}' does not exist`,
        );
    }

    hasNode(id: GraphNodeId): boolean {
        return this.nodes.has(id);
    }

    isValidConnection(source: GraphHandle, target: GraphHandle): boolean {
        const getItem = (handle: GraphHandle): ItemId | undefined => {
            return this.dfs(handle, (handle, node) => {
                const item = node.match({
                    recipe: (node) => node.entry(handle.handle).item,
                    merger: () => undefined,
                    splitter: () => undefined,
                    source: (node) => node.item,
                });
                return item
                    ? ["stop", item]
                    : ["continue", node.neighbors()];
            });
        };


        const sourceItem = getItem(source);
        const targetItem = getItem(target);
        return sourceItem === undefined
            || targetItem === undefined
            || sourceItem === targetItem;
    }

    expectedOutputRate(handle: GraphHandle): number | undefined {
        const otherSide = this.node(handle.node).outgoingEdges.get(handle.handle);
        if (!otherSide) {
            return undefined;
        }

        // DFS
        let out: number | undefined = 0;
        this.dfs(otherSide, (handle, node) => {
            // Once we reach a merger with multiple inputs, we cannot proceed. The merger
            // cannot define a clear expectation, as it just has a "total expectation",
            // that has to be covered by the sum of inputs. For those mergers, we instead
            // show the diff on their output.
            if (node.type() === "merger" && node.incomingEdges.size > 1) {
                out = undefined;
                return ["stop", undefined];
            }

            // Recipe nodes add to the total sum, but we do not continue on their outgoing edges.
            if (node instanceof RecipeGraphNode) {
                out! += node.entry(handle.handle).totalRate;
                return ["continue", []];
            }

            return ["continue", node.outgoingEdges.values()];
        });

        return out;
    }

    dfs<T>(
        start: GraphHandle,
        visit: (handle: GraphHandle, node: GraphNode)
            => ["continue", Iterable<GraphHandle>] | ["stop", T]
    ): T | undefined {
        const visited = new Set<GraphHandle>();
        const stack = [start];
        while (stack.length > 0) {
            const curr = stack.pop()!;
            if (visited.has(curr)) {
                continue;
            }
            visited.add(curr);

            const node = this.node(curr.node);
            const [controlFlow, payload] = visit(curr, node);
            if (controlFlow === "stop") {
                return payload;
            }

            const neighbors = payload;
            [...neighbors].forEach(h => stack.push(h));
        }
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

    toJSON(): GraphJson {
        const out: GraphJson = {
            nodes: {},
            edges: [],
        };
        for (const [id, node] of this.nodes) {
            out.nodes[id.toString()] = node.toJSON();
            for (const [handle, target] of node.outgoingEdges) {
                out.edges.push({
                    source: { node: id, handle },
                    target,
                });
            }
        }

        return out;
    }

    static fromJSON(data: unknown): Graph {
        if (!validateGraphJson(data)) {
            console.log("Raw data that failed to validate:", data);
            console.error(validateGraphJson.errors);
            throw new Error("Validation failed when loading graph data");
        }

        const out = new Graph();
        for (const [rawId, jsonNode] of Object.entries(data.nodes)) {
            const id = parseInt(rawId) as GraphNodeId;
            if (isNaN(id)) {
                throw new Error("invalid node id");
            }
            out.nodeIdCounter = Math.max(out.nodeIdCounter, id);

            const pos = jsonNode.pos;
            out.nodes.set(id as GraphNodeId, matchTag(jsonNode, "type", {
                "recipe": jsonNode => {
                    const n = new RecipeGraphNode(jsonNode.recipe, pos);
                    n.buildingsCount = jsonNode.buildingsCount;
                    n.overclock = jsonNode.overclock;
                    return n;
                },
                "source": jsonNode => new SourceGraphNode(jsonNode.item, jsonNode.rate, pos),
                "splitter": () => new SplitterGraphNode(pos),
                "merger": () => new MergerGraphNode(pos),
            }));
        }

        out.nodeIdCounter += 1;

        for (const edge of data.edges) {
            out.addEdge(
                new GraphHandle(edge.source.node as GraphNodeId, edge.source.handle as GraphHandleId),
                new GraphHandle(edge.target.node as GraphNodeId, edge.target.handle as GraphHandleId),
            );
        }

        return out;
    }
}

const ajv = new Ajv();

export type GraphJson = JTDDataType<typeof graphSchema>;

const graphSchema = {
    definitions: {
        pos: {
            properties: {
                x: {type: "int32" },
                y: {type: "int32" },
            },
        },
    },
    properties: {
        nodes: {
            values: {
                discriminator: "type",
                mapping: {
                    "recipe": {
                        properties: {
                            pos: { ref: "pos" },
                            recipe: { enum: Object.keys(RECIPES) as RecipeId[] },
                            buildingsCount: { type: "uint32" },
                            overclock: { type: "float32" },
                        },
                    },
                    "source": {
                        properties: {
                            pos: { ref: "pos" },
                            item: { enum: RESOURCE_ITEMS },
                            rate: { type: "float32" },
                        },
                    },
                    "splitter": {
                        properties: {
                            pos: { ref: "pos" },
                        },
                    },
                    "merger": {
                        properties: {
                            pos: { ref: "pos" },
                        },
                    },
                },
            },
        },
        edges: {
            elements: {
                properties: {
                    source: {
                        properties: {
                            node: { type: "uint32" },
                            handle: { type: "uint32" },
                        },
                    },
                    target: {
                        properties: {
                            node: { type: "uint32" },
                            handle: { type: "uint32" },
                        },
                    },
                },
            },
        },
    },
} as const;

const validateGraphJson = ajv.compile<GraphJson>(graphSchema)
