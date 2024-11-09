import { BaseEdge, getSmoothStepPath, Position, type Edge, type EdgeProps, type EdgeTypes } from '@xyflow/react';
import { NodeId, useStore } from '../store';
import { match, recipeHandlePos } from '../util';
import { MERGER_HANDLE_IDS } from '../nodes/Merger';
import { SPLITTER_HANDLE_IDS } from '../nodes/Splitter';


export type MainEdgeData = Record<string, never>;
export type MainEdge = Edge<MainEdgeData, "main">;

export const MainEdge = ({ 
    id, sourceX, sourceY, targetX, targetY, source, target, sourceHandleId, targetHandleId,
}: EdgeProps<MainEdge>) => {
    const getNode = useStore(state => state.getNode);
    const getPos = (nodeId: NodeId, handleId: string) => {
        const node = getNode(nodeId);
        const revLookup = (map: Record<Position, string>): Position => 
            (Object.keys(map) as (keyof typeof map)[])
                .find(pos => map[pos] === handleId)!;
                
        return match(node!.type, {
            "recipe": () => recipeHandlePos(handleId),
            "merger": () => revLookup(MERGER_HANDLE_IDS),
            "splitter": () => revLookup(SPLITTER_HANDLE_IDS),
            "source": () => Position.Right,
        });
    };


    const [path] = getSmoothStepPath({
        sourceX, 
        sourceY, 
        targetX, 
        targetY, 
        sourcePosition: getPos(source, sourceHandleId!),
        targetPosition: getPos(target, targetHandleId!),
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
