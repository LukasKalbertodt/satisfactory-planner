import { type Node, Handle, NodeProps, Position } from "@xyflow/react";

import { CombinerNode, handleCss } from "./util";


export type SplitterNodeData = Record<string, never>;
export type SplitterNode = Node<SplitterNodeData, "splitter">;

export const SplitterNode = ({ selected }: NodeProps<SplitterNode>) => {
    return <CombinerNode selected={selected ?? false} kind="splitter">
        {[Position.Top, Position.Left, Position.Bottom, Position.Right].map(pos => (
            <Handle 
                key={pos}
                id={SPLITTER_HANDLE_IDS[pos]} 
                type={pos === Position.Left ? "target" : "source"}
                css={handleCss}
                position={pos} 
            />
        ))}
    </CombinerNode>;
};

export const SPLITTER_HANDLE_IDS = {
    [Position.Top]: "s0",
    [Position.Left]: "t",
    [Position.Bottom]: "s2",
    [Position.Right]: "s1",
};
