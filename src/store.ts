import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { applyNodeChanges, OnNodesChange } from "@xyflow/react";
import { temporal } from 'zundo';

import { FlowNode, initialNodes, NODE_TYPES } from "./nodes";
import { persist } from "zustand/middleware";


export type State = {
    nodes: FlowNode[];
    nodeIdCounter: number;
};

/** Node properties that are part of the persisted store. */
export type NodeCore = Pick<FlowNode, "id" | "position" | "data"> 
    & { type: keyof typeof NODE_TYPES };

type Actions = {
    addNode: (node: Omit<NodeCore, "id">) => void;

    onNodesChange: OnNodesChange<FlowNode>;
};

const initialState: State = {
    nodes: initialNodes,
    nodeIdCounter: 0,
};

const stateInit = immer<State & Actions>((set) => ({
    ...initialState,        

    addNode: (node) => set(state => {
        const id = state.nodeIdCounter.toString(16);
        state.nodeIdCounter += 1;
        state.nodes.push({ id, ...node });
    }),

    onNodesChange: (changes) => set(state => {
          state.nodes = applyNodeChanges(changes, state.nodes);
    }),
}));

export const useStore = create<State & Actions>()(
    temporal(
        persist(stateInit, {
            name: "satisfactory-planner", // TODO
            partialize: (state) => ({ 
                ...state,
                nodes: state.nodes.map(nodeCore),
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
