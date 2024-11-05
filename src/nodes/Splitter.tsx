import { type Node, Handle, NodeProps, Position } from "@xyflow/react";

import { CombinerNode, handleCss } from "./util";


export type SplitterNodeData = Record<string, never>;
export type SplitterNode = Node<SplitterNodeData, "splitter">;

export const SplitterNode = ({ selected }: NodeProps<SplitterNode>) => {
    return <CombinerNode selected={selected ?? false} kind="splitter">
        <Handle id="s0" type="source" css={handleCss} position={Position.Top} />
        <Handle id="s1" type="source" css={handleCss} position={Position.Right} />
        <Handle id="s2" type="source" css={handleCss} position={Position.Bottom} />
        <Handle id="t" type="target" css={handleCss} position={Position.Left} />
    </CombinerNode>;
};
