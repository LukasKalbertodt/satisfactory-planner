import { type Node, Handle, NodeProps } from "@xyflow/react";

import { CombinerNode, handleCss, RateDiff, totalRateCss } from "./util";
import { MERGER_INPUTS, MERGER_OUTPUTS, MergerGraphNode, mergerHandlePos } from "../graph/merger";
import { toFlowHandleId } from "../util";
import { useStore } from "../store";
import { NodeData } from ".";
import { GraphHandle } from "../graph";


export type MergerNodeData = NodeData<MergerGraphNode>;
export type MergerNode = Node<MergerNodeData, "merger">;

export const MergerNode = ({ selected, data: { node, id } }: NodeProps<MergerNode>) => {
    const graph = useStore(state => state.graph);

    // See the same check in Recipe node.
    if (!graph.hasNode(id)) {
        return null;
    }

    const isPassthrough = node.incomingEdges.size === 1 && node.outgoingEdges.size === 1;
    const totalInput = (() => {
        const inputRates = [...node.incomingEdges.keys()]
            .map(h => graph.incomingRate(new GraphHandle(id, h)));
        if (inputRates.some(r => r === undefined)) {
            return undefined;
        }

        return (inputRates as number[]).reduce((a, b) => a + b, 0);
    })();

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
        {!isPassthrough && totalInput !== undefined && (
            <div css={{
                ...totalRateCss,
                position: "absolute",
                left: "calc(100% + 7px)",
                top: "50%",
                transform: "translateY(-50%)",
            }}>
                {totalInput.toString().slice(0, 6)}
                <RateDiff
                    actual={totalInput}
                    expected={graph.expectedOutputRate(new GraphHandle(id, node.output()))}
                />
            </div>
        )}
    </CombinerNode>;
};
