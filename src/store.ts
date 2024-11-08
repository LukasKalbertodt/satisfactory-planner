import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { applyEdgeChanges, applyNodeChanges, Connection, OnEdgesChange, OnNodesChange } from "@xyflow/react";
import { temporal } from 'zundo';

import { FlowNode, NODE_TYPES } from "./nodes";
import { persist } from "zustand/middleware";
import { MainEdge } from "./edges";
import { RecipeNodeData } from "./nodes/Recipe";


export type State = {
    nodes: FlowNode[];
    nodeIdCounter: number;
    edges: MainEdge[];
    edgeIdCounter: number;
};

export type NodeId = string;

/** Node properties that are part of the persisted store. */
export type NodeCore = Pick<FlowNode, "id" | "position" | "data"> 
    & { type: keyof typeof NODE_TYPES };

export type EdgeCore = Pick<MainEdge, "id" | "source" | "sourceHandle" | "target" | "targetHandle">;

type Actions = {
    /** Returns a node by ID. */
    getNode(id: NodeId): FlowNode | undefined;

    addNode: (node: Omit<NodeCore, "id">) => void;
    addEdge: (connection: Connection) => void;
    setRecipeNodeData: (node: NodeId, data: RecipeNodeData) => void;

    onNodesChange: OnNodesChange<FlowNode>;
    onEdgesChange: OnEdgesChange<MainEdge>;
};

const initialState: State = {
    nodes: [],
    nodeIdCounter: 0,
    edges: [],
    edgeIdCounter: 0,
};

const stateInit = immer<State & Actions>((set, get) => ({
    ...initialState,        

    // TODO: O(n). Fine for now, and probably ever. Using a Map would require converting back and 
    // forth to an array a lot. Maintaining a second data structure seems overkill for now.
    getNode: (id) => get().nodes.find(n => n.id === id),

    addNode: (node) => set(state => {
        const id = state.nodeIdCounter.toString(16);
        state.nodeIdCounter += 1;
        // TODO: cast is weird
        state.nodes.push({ id, ...node } as State["nodes"][0]);
    }),
    addEdge: (connection) => set(state => {
        const id = state.edgeIdCounter.toString(16);
        state.edgeIdCounter += 1;
        state.edges.push({ id, type: "main", ...connection });
    }),
    setRecipeNodeData: (nodeId, data) => set(state => {
        state.nodes.find(n => n.id === nodeId)!.data = data;
    }),

    onNodesChange: (changes) => set(state => {
          state.nodes = applyNodeChanges(changes, state.nodes);
    }),
    onEdgesChange: (changes) => set(state => {
        state.edges = applyEdgeChanges(changes, state.edges);
    }),
}));

export const useStore = create<State & Actions>()(
    temporal(
        persist(stateInit, {
            name: "satisfactory-planner", // TODO
            partialize: (state) => ({ 
                ...state,
                nodes: state.nodes.map(nodeCore),
                edges: state.edges.map(edgeCore),
            }),
        }),
    ),
);

const nodeCore = (node: FlowNode): NodeCore => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
});
const edgeCore = (edge: MainEdge): EdgeCore => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
});
