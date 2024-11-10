import { type Node, Handle, NodeProps } from "@xyflow/react";

import { CombinerNode, handleCss } from "./util";
import { MERGER_INPUTS, MERGER_OUTPUTS, mergerHandlePos } from "../graph/merger";
import { fromFlowNodeId, toFlowHandleId } from "../util";
import { useStore } from "../store";


export type MergerNodeData = Record<string, never>;
export type MergerNode = Node<MergerNodeData, "merger">;

export const MergerNode = ({ selected, id }: NodeProps<MergerNode>) => {
    const graph = useStore(state => state.graph);
    return <CombinerNode selected={selected ?? false} kind="merger">
        {[
            [MERGER_INPUTS, "target"] as const,
            [MERGER_OUTPUTS, "source"] as const,
        ].map(([handles, type]) =>
            handles.map(h => (
                <Handle
                    key={h}
                    id={toFlowHandleId(h)}
                    type={type}
                    css={handleCss}
                    position={mergerHandlePos(h)}
                    isConnectable={!graph.node(fromFlowNodeId(id)).isHandleConnected(h)}
                />
            ))
        )}
    </CombinerNode>;
};
