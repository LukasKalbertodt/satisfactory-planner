import type { NodeTypes } from '@xyflow/react';

import { AppNode } from './types';
import { RecipeNode } from './Recipe';

export const initialNodes: AppNode[] = [
    { id: 'a', type: 'input', position: { x: 200, y: 0 }, data: { label: 'wire' } },
    { id: 'c', position: { x: 200, y: 100 }, data: { label: 'your ideas' } },
    { id: 'd', type: 'output', position: { x: 200, y: 200 }, data: { label: 'with React Flow' },
    },
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
        data: { recipeId: "aluminum-scrap" },
    },
];

export const nodeTypes = {
    "recipe": RecipeNode,
} satisfies NodeTypes;
