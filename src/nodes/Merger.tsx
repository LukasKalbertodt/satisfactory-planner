import { type Node, Handle, NodeProps } from "@xyflow/react";

import { CombinerNode, handleCss } from "./util";
import { MERGER_INPUTS, MERGER_OUTPUTS, mergerHandlePos } from "../graph/merger";
import { toFlowHandleId } from "../util";


export type MergerNodeData = Record<string, never>;
export type MergerNode = Node<MergerNodeData, "merger">;

export const MergerNode = ({ selected }: NodeProps<MergerNode>) => {
    return <CombinerNode selected={selected ?? false} kind="merger">
        {[
            [MERGER_INPUTS, "target"] as const, 
            [MERGER_OUTPUTS, "source"] as const,
        ].map(([handles, type]) => 
            handles.map(id => (
            <Handle 
                key={id}
                id={toFlowHandleId(id)} 
                type={type}
                css={handleCss}
                position={mergerHandlePos(id)} 
            />
        )))}
    </CombinerNode>;
};
