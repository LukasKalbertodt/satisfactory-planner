import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { XYPosition } from "@xyflow/react";
import { temporal } from 'zundo';

import { Graph, GraphHandle, GraphNodeId } from "./graph";
import { GraphNode } from "./graph/node";
import { bug } from "./util";
import { SourceGraphNode } from "./graph/source";
import { RecipeGraphNode } from "./graph/recipe";
import { persist, PersistStorage } from "zustand/middleware";
import { compress_state, decompress_state } from "../pkg/satisfactory_planner";
import equal from "fast-deep-equal";


export type State = {
    graph: Graph;
};

type Actions = {
    addNode: (node: GraphNode) => void;
    removeNode: (id: GraphNodeId) => void;
    addEdge: (source: GraphHandle, target: GraphHandle) => void;
    removeEdge: (source: GraphHandle, target: GraphHandle) => void;
    updateNodePos: (id: GraphNodeId, pos: XYPosition) => void;
    setRecipeNodeData: (node: GraphNodeId, data: Partial<RecipeGraphNode>) => void;
    setSourceNodeData: (node: GraphNodeId, data: Partial<SourceGraphNode>) => void;
};

const initialState: State = {
    graph: new Graph(),
};

const stateInit = immer<State & Actions>(set => ({
    ...initialState,

    addNode: (node) => set(state => {
        state.graph.addNode(node);
    }),
    removeNode: (id) => set(state => {
        state.graph.removeNode(id);
    }),
    addEdge: (source, target) => set(state => {
        state.graph.addEdge(source, target);
    }),
    removeEdge: (source, target) => set(state => {
        state.graph.removeEdge(source, target);
    }),
    updateNodePos: (id, pos) => set(state => {
        state.graph.nodes.get(id)!.pos = pos;
    }),

    setRecipeNodeData: (nodeId, data) => set(state => {
        const node = state.graph.node(nodeId);
        if (!(node instanceof RecipeGraphNode)) {
            return bug("node is not a source node");
        }
        node.recipeId = data.recipeId ?? node.recipeId;
        node.buildingsCount = data.buildingsCount ?? node.buildingsCount;
        node.overclock = data.overclock ?? node.overclock;
    }),
    setSourceNodeData: (nodeId, data) => set(state => {
        const node = state.graph.node(nodeId);
        if (!(node instanceof SourceGraphNode)) {
            return bug("node is not a source node");
        }
        node.item = data.item ?? node.item;
        node.rate = data.rate ?? node.rate;
    }),
}));



/**
 * Checks if two states are the same, ignoring order of edges/nodes and node IDs.
 *
 * This is wrong in a few special case (e.g. nodes of the same type at the same position), but it's
 * only for testing.
 */
const isStateEqual = (a: any, b: any) => {
    if (a.graph.nodes.size !== b.graph.nodes.size || a.graph.edges.size !== b.graph.edges.size) {
        return false;
    }

    const aNodeIdToB = new Map();
    for (const [idA, valueA] of Object.entries(a.graph.nodes)) {
        const res = Object.entries(b.graph.nodes).find(([idB, valueB]) => (
            equal(valueB.pos, valueA.pos) && valueB.type === valueA.type
        ));

        if (res == null) {
            console.error("Node not found in b", idA);
            return false;
        }

        const [idB, ] = res;
        aNodeIdToB.set(Number(idA), Number(idB));
    }

    for (const edgeA of a.graph.edges) {
        const res = b.graph.edges.find(edgeB => (
            aNodeIdToB.get(edgeA.source.node) === edgeB.source.node
            && edgeA.source.handle === edgeB.source.handle
            && aNodeIdToB.get(edgeA.target.node) === edgeB.target.node
            && edgeA.target.handle === edgeB.target.handle
        ));

        if (res == null) {
            console.error("Edge not found in b", edgeA, b.graph.edges, aNodeIdToB);
            return false;
        }
    }

    return true;
};


// Custom storage engine to do custom serialization/deserialization.
const storage: PersistStorage<State & Actions> = {
    getItem: name => {
        const str = localStorage.getItem(name);
        if (!str) {
            return null;
        }
        const json = JSON.parse(str);
        const digest = compress_state(str);
        console.log("Compressed: ", digest);
        const roundtrip = decompress_state(digest);
        const rtstate = JSON.parse(roundtrip);

        // Check roundtrip
        if (rtstate.version !== json.version) {
            console.error("Roundtrip failed: version mismatch");
        } else if (!isStateEqual(rtstate.state, json.state)) {
            console.error("Roundtrip failed: state not equal");
        } else {
            console.log("roundtrip good");
        }

        const { state } = json;
        return {
            ...json,
            state: {
                ...state,
                graph: Graph.fromJSON(state.graph),
            },
        };
    },
    setItem: (name, value) => {
        const json = JSON.stringify(value);
        localStorage.setItem(name, json);
        console.log("Compressed: ", compress_state(json));
    },
    removeItem: name => {
        localStorage.removeItem(name);
    },
};

export const useStore = create<State & Actions>()(
    temporal(
        persist(stateInit, {
            name: "satisfactory-planner", // TODO
            storage: storage,
        }),
    ),
);
