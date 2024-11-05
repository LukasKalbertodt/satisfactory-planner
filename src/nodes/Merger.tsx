import { type Node, Handle, NodeProps, Position } from "@xyflow/react";

import { CombinerNode, handleCss } from "./util";


export type MergerNodeData = Record<string, never>;
export type MergerNode = Node<MergerNodeData, "merger">;

export const MergerNode = ({ selected }: NodeProps<MergerNode>) => {
    return <CombinerNode selected={selected ?? false} kind="merger">
        <Handle id="t0" type="target" css={handleCss} position={Position.Top} />
        <Handle id="t1" type="target" css={handleCss} position={Position.Left} />
        <Handle id="t2" type="target" css={handleCss} position={Position.Bottom} />
        <Handle id="s" type="source" css={handleCss} position={Position.Right} />
    </CombinerNode>;
};
