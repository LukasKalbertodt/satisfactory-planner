import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { XYPosition } from "@xyflow/react";
import { temporal } from 'zundo';

import { RecipeNodeData } from "./nodes/Recipe";
import { SourceNodeData } from "./nodes/Source";
import { Graph, GraphHandle, GraphNodeId } from "./graph";
import { GraphNode } from "./graph/node";
import { bug } from "./util";
import { SourceGraphNode } from "./graph/source";
import { RecipeGraphNode } from "./graph/recipe";


export type State = {
    graph: Graph;
};

type Actions = {
    addNode: (node: GraphNode) => void;
    removeNode: (id: GraphNodeId) => void;
    addEdge: (source: GraphHandle, target: GraphHandle) => void;
    removeEdge: (source: GraphHandle, target: GraphHandle) => void;
    updateNodePos: (id: GraphNodeId, pos: XYPosition) => void;
    setRecipeNodeData: (node: GraphNodeId, data: Partial<RecipeNodeData>) => void;
    setSourceNodeData: (node: GraphNodeId, data: Partial<SourceNodeData>) => void;
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
        node.recipe = data.recipeId ?? node.recipe;
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

export const useStore = create<State & Actions>()(
    temporal(
        stateInit,
        // persist(stateInit, {
        //     name: "satisfactory-planner", // TODO
        //     partialize: (state) => { console.log(state); return ({
        //         ...state,
        //         nodes: state.nodes.map(nodeCore),
        //         edges: state.edges.map(edgeCore),
        //     })},
        // }),
    ),
);


// /** Node properties that are part of the persisted store. */
// export type NodeCore = Pick<FlowNode, "id" | "position" | "data">
//     & { type: keyof typeof NODE_TYPES };

// export type EdgeCore = Pick<MainEdge, "id" | "source" | "sourceHandle" | "target" | "targetHandle">;


// const nodeCore = (node: FlowNode): NodeCore => ({
//     id: node.id,
//     type: node.type,
//     position: node.position,
//     data: node.data,
// });
// const edgeCore = (edge: MainEdge): EdgeCore => ({
//     id: edge.id,
//     source: edge.source,
//     sourceHandle: edge.sourceHandle,
//     target: edge.target,
//     targetHandle: edge.targetHandle,
// });
