import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { applyNodeChanges, OnNodesChange } from "@xyflow/react";

import { RecipeNodeData } from "./nodes/Recipe";
import { initialNodes } from "./nodes";


export type State = {
    nodes: FlowNode[];
};

export type FlowNode = {
    id: string;
    type: "recipe";
    position: { x: number, y: number };
    data: RecipeNodeData;
};

type Actions = {
    addNode: (node: Omit<FlowNode, "id">) => void;

    onNodesChange: OnNodesChange<FlowNode>;
};

const initialState: State = {
    nodes: initialNodes,
};

export const useStore = create<State & Actions>()(immer((set) => ({
    ...initialState,        

    addNode: (node) => set(state => {
        const id = Math.random().toString(); // TODO
        state.nodes.push({ id, ...node });
    }),

    onNodesChange: (changes) => set(state => {
          state.nodes = applyNodeChanges(changes, state.nodes);
    }),
})));
