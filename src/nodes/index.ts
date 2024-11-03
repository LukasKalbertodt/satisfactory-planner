import type { NodeTypes } from '@xyflow/react';

import { RecipeNode } from './Recipe';

export type FlowNodeTmp = RecipeNode;
export type FlowNode = FlowNodeTmp & { type: NonNullable<FlowNodeTmp['type']> };

export const NODE_TYPES = {
    "recipe": RecipeNode,
} satisfies NodeTypes;
