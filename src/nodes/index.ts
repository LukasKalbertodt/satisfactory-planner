import type { NodeTypes } from '@xyflow/react';

import { RecipeNode } from './Recipe';
import { SplitterNode } from './Splitter';
import { MergerNode } from './Merger';
import { SourceNode } from './Source';
import { GraphNodeId } from '../graph';
import { GraphNode } from '../graph/node';

export type FlowNodeTmp = RecipeNode | SplitterNode | MergerNode | SourceNode;
export type FlowNode = FlowNodeTmp & { type: NonNullable<FlowNodeTmp['type']> };

export type NodeData<T extends GraphNode> = {
    id: GraphNodeId;
    node: T;
};

export const NODE_TYPES = {
    "recipe": RecipeNode,
    "splitter": SplitterNode,
    "merger": MergerNode,
    "source": SourceNode,
} satisfies NodeTypes;
