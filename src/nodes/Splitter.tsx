import { type Node, Handle, NodeProps } from "@xyflow/react";

import { CombinerNode, handleCss } from "./util";
import { SPLITTER_INPUTS, SPLITTER_OUTPUTS, splitterHandlePos } from "../graph/splitter";
import { fromFlowNodeId, toFlowHandleId } from "../util";
import { useStore } from "../store";


export type SplitterNodeData = Record<string, never>;
export type SplitterNode = Node<SplitterNodeData, "splitter">;

export const SplitterNode = ({ selected, id }: NodeProps<SplitterNode>) => {
    const graph = useStore(state => state.graph);
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
                    isConnectable={!graph.node(fromFlowNodeId(id)).isHandleConnected(h)}

                />
            ))
        )}
    </CombinerNode>;
};
