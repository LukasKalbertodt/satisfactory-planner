import type { NodeTypes } from '@xyflow/react';

import { RecipeNode } from './Recipe';
import { SplitterNode } from './Splitter';
import { MergerNode } from './Merger';
import { SourceNode } from './Source';

export type FlowNodeTmp = RecipeNode | SplitterNode | MergerNode | SourceNode;
export type FlowNode = FlowNodeTmp & { type: NonNullable<FlowNodeTmp['type']> };


export const NODE_TYPES = {
    "recipe": RecipeNode,
    "splitter": SplitterNode,
    "merger": MergerNode,
    "source": SourceNode,
} satisfies NodeTypes;
