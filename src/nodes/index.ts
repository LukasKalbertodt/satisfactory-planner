import type { NodeTypes } from '@xyflow/react';

import { RecipeNode } from './Recipe';
import { SplitterNode } from './Splitter';
import { MergerNode } from './Merger';

export type FlowNodeTmp = RecipeNode | SplitterNode | MergerNode;
export type FlowNode = FlowNodeTmp & { type: NonNullable<FlowNodeTmp['type']> };


export const NODE_TYPES = {
    "recipe": RecipeNode,
    "splitter": SplitterNode,
    "merger": MergerNode,
} satisfies NodeTypes;
