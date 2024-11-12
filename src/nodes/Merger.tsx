import { type Node, Handle, NodeProps } from "@xyflow/react";

import { CombinerNode, handleCss } from "./util";
import { MERGER_INPUTS, MERGER_OUTPUTS, MergerGraphNode, mergerHandlePos } from "../graph/merger";
import { toFlowHandleId } from "../util";
import { useStore } from "../store";
import { NodeData } from ".";


export type MergerNodeData = NodeData<MergerGraphNode>;
export type MergerNode = Node<MergerNodeData, "merger">;

export const MergerNode = ({ selected, data: { node, id } }: NodeProps<MergerNode>) => {
    const graph = useStore(state => state.graph);

    // See the same check in Recipe node.
    if (!graph.hasNode(id)) {
        return null;
    }

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
                    isConnectable={!node.isHandleConnected(h)}
                />
            ))
        )}
    </CombinerNode>;
};
