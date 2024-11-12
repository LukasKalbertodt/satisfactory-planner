import { type Node, Handle, NodeProps } from "@xyflow/react";

import { CombinerNode, handleCss } from "./util";
import { SPLITTER_INPUTS, SPLITTER_OUTPUTS, SplitterGraphNode, splitterHandlePos } from "../graph/splitter";
import { toFlowHandleId } from "../util";
import { useStore } from "../store";
import { NodeData } from ".";


export type SplitterNodeData = NodeData<SplitterGraphNode>;
export type SplitterNode = Node<SplitterNodeData, "splitter">;

export const SplitterNode = ({ selected, data: { node, id } }: NodeProps<SplitterNode>) => {
    const graph = useStore(state => state.graph);

    // See the same check in Recipe node.
    if (!graph.hasNode(id)) {
        return null;
    }

    return <CombinerNode selected={selected ?? false} kind="splitter">
        {[
            [SPLITTER_INPUTS, "target"] as const,
            [SPLITTER_OUTPUTS, "source"] as const,
        ].map(([handles, type]) =>
            handles.map(h => (
                <Handle
                    key={h}
                    id={toFlowHandleId(h)}
                    type={type}
                    css={handleCss}
                    position={splitterHandlePos(h)}
                    isConnectable={!node.isHandleConnected(h)}

                />
            ))
        )}
    </CombinerNode>;
};
