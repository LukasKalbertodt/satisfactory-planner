import { type Node, Handle, NodeProps } from "@xyflow/react";

import { CombinerNode, handleCss } from "./util";
import { SPLITTER_INPUTS, SPLITTER_OUTPUTS, splitterHandlePos } from "../graph/splitter";
import { toFlowHandleId } from "../util";


export type SplitterNodeData = Record<string, never>;
export type SplitterNode = Node<SplitterNodeData, "splitter">;

export const SplitterNode = ({ selected }: NodeProps<SplitterNode>) => {
    return <CombinerNode selected={selected ?? false} kind="splitter">
        {[
            [SPLITTER_INPUTS, "target"] as const, 
            [SPLITTER_OUTPUTS, "source"] as const,
        ].map(([handles, type]) => 
            handles.map(id => (
            <Handle 
                key={id}
                id={toFlowHandleId(id)} 
                type={type}
                css={handleCss}
                position={splitterHandlePos(id)} 
            />
        )))}
    </CombinerNode>;
};
