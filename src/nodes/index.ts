import type { NodeTypes } from '@xyflow/react';

import { RecipeNode } from './Recipe';
import { NodeCore } from '../store';

export type FlowNodeTmp = RecipeNode;
export type FlowNode = FlowNodeTmp & { type: NonNullable<FlowNodeTmp['type']> };

export const NODE_TYPES = {
    "recipe": RecipeNode,
} satisfies NodeTypes;

// TEMP
export const initialNodes: NodeCore[] = [
    {
        id: 'b',
        type: 'recipe',
        position: { x: -100, y: 100 },
        data: { recipeId: "reinforced-iron-plate" },
    },
    {
        id: 'e',
        type: 'recipe',
        position: { x: -100, y: 230 },
        data: { recipeId: "iron-plate" },
    },
    {
        id: 'f',
        type: 'recipe',
        position: { x: -100, y: 350 },
        data: { recipeId: "ficsonium-fuel-rod" },
    },
    {
        id: 'g',
        type: 'recipe',
        position: { x: -100, y: 550 },
        data: { recipeId: "encased-uranium-cell" },
    },
    {
        id: 'h',
        type: 'recipe',
        position: { x: -100, y: 700 },
        data: { recipeId: "heavy-encased-frame" },
    },
];
