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
import { compress_state } from "../pkg/satisfactory_planner";


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


// Custom storage engine to do custom serialization/deserialization.
const storage: PersistStorage<State & Actions> = {
    getItem: name => {
        const str = localStorage.getItem(name);
        if (!str) {
            return null;
        }
        console.log("Compressed: ", compress_state(str));
        const json = JSON.parse(str);
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
