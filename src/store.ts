import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { XYPosition } from "@xyflow/react";
import { temporal } from 'zundo';

import { Graph, GraphHandle, GraphJson, GraphNodeId } from "./graph";
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


type PersistedState = {
    version: number;
    state: {
        graph: GraphJson;
    };
};

/**
 * Checks if two states are the same, ignoring order of edges/nodes and node IDs.
 *
 * This is wrong in a few special case (e.g. nodes of the same type at the same position), but it's
 * only for testing.
 */
const isStateEqual = (a: PersistedState, b: PersistedState) => {
    if (a.version !== b.version) {
        console.error("Version mismatch", a.version, b.version);
        return false;
    }

    const ga = a.state.graph;
    const gb = b.state.graph;
    if (ga.nodes.length !== gb.nodes.length || ga.edges.length !== gb.edges.length) {
        console.error("length mismatch", {
            nodeCountA: ga.nodes.length,
            nodeCountB: gb.nodes.length,
            edgeCountA: ga.edges.length,
            edgeCountB: gb.edges.length,
        });
        return false;
    }

    const minX = Math.min(...a.state.graph.nodes.map(n => n.pos.x));
    const minY = Math.min(...a.state.graph.nodes.map(n => n.pos.y));


    const aNodeIdToB = new Map();
    for (const [idA, valueA] of Object.entries(ga.nodes)) {
        const res = Object.entries(gb.nodes).find(([_, valueB]) => {
            const { pos: posA, ...restA } = valueA;
            const { pos: posB, ...restB } = valueB;
            const correctedPosB = {
                x: posB.x + minX,
                y: posB.y + minY,
            };
            return equal(posA, correctedPosB) && equal(restA, restB);
        });

        if (res == null) {
            console.error("Node not found in b", idA);
            return false;
        }

        const [idB, ] = res;
        aNodeIdToB.set(Number(idA), Number(idB));
    }

    for (const edgeA of ga.edges) {
        const res = gb.edges.find(edgeB => (
            aNodeIdToB.get(edgeA.source.node) === edgeB.source.node
            && edgeA.source.handle === edgeB.source.handle
            && aNodeIdToB.get(edgeA.target.node) === edgeB.target.node
            && edgeA.target.handle === edgeB.target.handle
        ));

        if (res == null) {
            console.error("Edge not found in b", edgeA, gb.edges, aNodeIdToB);
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
        console.log("Digest: ", digest);
        const roundtrip = decompress_state(digest);
        const rtstate = JSON.parse(roundtrip);

        // Check roundtrip
        if (!isStateEqual(json, rtstate)) {
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
        const digest = compress_state(json);
        localStorage.setItem(name, json);

        const url = new URL(window.location.href);
        const alreadyOnPlan = url.searchParams.has("d");
        url.searchParams.set("d", digest);
        if (alreadyOnPlan) {
            window.history.replaceState(null, "", url);
        } else {
            window.history.pushState(null, "", url);
        };
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
