import { type Node, Handle, NodeProps, Position } from "@xyflow/react";
import { useShallow } from 'zustand/shallow';

import { handleCss, RateDiff, settingsPopoverCss, totalRateCss } from "./util";
import { itemIcon } from "../util";
import { ITEMS, RESOURCE_ITEMS } from "../gamedata";
import { useStore } from "../store";
import { GraphHandle, GraphNodeId } from "../graph";
import { SourceGraphNode } from "../graph/source";


export type SourceNodeData = {
    graphId: GraphNodeId;
    node: SourceGraphNode;
};
export type SourceNode = Node<SourceNodeData, "source">;

export const SourceNode = ({ selected, data: { node, graphId } }: NodeProps<SourceNode>) => {
    const { setData, graph } = useStore(useShallow(store => ({
        setData: store.setSourceNodeData,
        graph: store.graph,
    })));
    const updateData = (update: Partial<SourceGraphNode>) => setData(graphId, update);
    const hasConnection = node.outgoingEdges.size > 0;
    const expectedRate = graph.expectedOutputRate(new GraphHandle(graphId, node.outputs()[0]));

    return <div css={{ width: 25, height: 25, position: "relative" }}>
        <div css={{
            position: "absolute",
            inset: -12,
            padding: 2,
            border: "2px solid #27ae60",
            background: "white",
            borderRadius: "50%",
            ...selected && {
                outline: "2px solid #efc74f",
                outlineOffset: 2,
            },
        }}>
            <img
                src={itemIcon(node.item)}
                css={{ height: "100%"}}
            />
            <div css={{
                ...totalRateCss,
                position: "absolute",
                left: "calc(100% + 15px)",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 10,
            }}>
                {node.rate}
                <RateDiff expected={expectedRate} actual={node.rate} />
            </div>
            <div css={{
                position: "absolute",
                top: "100%",
                left: -20,
                right: -20,
                fontSize: 12,
                textAlign: "center",
            }}>
                {ITEMS[node.item].name}
            </div>
            <Handle
                type="source"
                position={Position.Right}
                id="0"
                css={{ ...handleCss, right: -8 }}
                isConnectable={!hasConnection}
            />

            {/* Settings menu */}
            {selected && <div css={{
                ...settingsPopoverCss,
                position: "absolute",
                bottom: "100%",
                right: "50%",
                transform: "translate(50%)",
                fontSize: 12,
            }}>
                <select
                    value={node.item}
                    disabled={hasConnection}
                    onChange={e => updateData({ item: RESOURCE_ITEMS[e.target.selectedIndex] })}
                >
                    {RESOURCE_ITEMS.map(item => (
                        <option key={item} value={item}>
                            {ITEMS[item].name}
                        </option>
                    ))}
                </select>
                <input
                    type="number"
                    min="0"
                    value={node.rate}
                    onChange={e => updateData({ rate: +e.target.value })}
                    css={{
                        marginTop: 8,
                        fontSize: 12,
                        width: "100%",
                    }}
                />
            </div>
            }
        </div>
    </div>;
};
