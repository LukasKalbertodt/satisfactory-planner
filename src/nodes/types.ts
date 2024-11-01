import type { Node, BuiltInNode } from '@xyflow/react';
import { RecipeNode } from './Recipe';

export type PositionLoggerNode = Node<{ label: string }, 'position-logger'>;
export type AppNode = BuiltInNode | PositionLoggerNode | RecipeNode;
