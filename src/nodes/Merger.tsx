import { type Node, Handle, NodeProps, Position } from "@xyflow/react";

import { CombinerNode, handleCss } from "./util";


export type MergerNodeData = Record<string, never>;
export type MergerNode = Node<MergerNodeData, "merger">;

export const MergerNode = ({ selected }: NodeProps<MergerNode>) => {
    return <CombinerNode selected={selected ?? false} kind="merger">
        {[Position.Top, Position.Left, Position.Bottom, Position.Right].map(pos => (
            <Handle 
                key={pos}
                id={MERGER_HANDLE_IDS[pos]} 
                type={pos === Position.Right ? "source" : "target"}
                css={handleCss}
                position={pos} 
            />
        ))}
    </CombinerNode>;
};

export const MERGER_HANDLE_IDS = {
    [Position.Top]: "t0",
    [Position.Left]: "t1",
    [Position.Bottom]: "t2",
    [Position.Right]: "s",
};
