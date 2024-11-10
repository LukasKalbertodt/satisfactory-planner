import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps, type EdgeTypes } from '@xyflow/react';


export type MainEdgeData = Record<string, never>;
export type MainEdge = Edge<MainEdgeData, "main">;

export const MainEdge = ({
    id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
}: EdgeProps<MainEdge>) => {
    const [path] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 10,
    });

    return (
        <BaseEdge id={id} path={path} css={{
            strokeWidth: 1.5,
            stroke: "#999",
        }}/>
    );
};

export const EDGE_TYPES = {
    "main": MainEdge,
} satisfies EdgeTypes;
