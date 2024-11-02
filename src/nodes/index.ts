import type { NodeTypes } from '@xyflow/react';

import { AppNode } from './types';
import { RecipeNode } from './Recipe';

export const initialNodes: AppNode[] = [
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

export const nodeTypes = {
    "recipe": RecipeNode,
} satisfies NodeTypes;
