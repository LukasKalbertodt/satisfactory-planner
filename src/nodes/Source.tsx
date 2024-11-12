import { type Node, Handle, NodeProps, Position } from "@xyflow/react";
import { useShallow } from 'zustand/shallow';

import { handleCss, RateDiff, settingsPopoverCss, totalRateCss } from "./util";
import { itemIcon } from "../util";
import { ITEMS, RESOURCE_ITEMS } from "../gamedata";
import { useStore } from "../store";
import { GraphHandle } from "../graph";
import { SourceGraphNode } from "../graph/source";
import { NodeData } from ".";
import { useRef } from "react";


export type SourceNodeData = NodeData<SourceGraphNode>;
export type SourceNode = Node<SourceNodeData, "source">;

export const SourceNode = ({ selected, data: { node, id } }: NodeProps<SourceNode>) => {
    const { setData, graph } = useStore(useShallow(store => ({
        setData: store.setSourceNodeData,
        graph: store.graph,
    })));

    // See the same check in Recipe node.
    if (!graph.hasNode(id)) {
        return null;
    }

    const updateData = (update: Partial<SourceGraphNode>) => setData(id, update);
    const hasConnection = node.outgoingEdges.size > 0;
    const expectedRate = graph.expectedOutputRate(new GraphHandle(id, node.outputs()[0]));
    const rateInput = useRef<HTMLInputElement>(null);

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
                textAlign: "center",
            }}>
                <select
                    value={node.item}
                    disabled={hasConnection}
                    onChange={e => updateData({ item: RESOURCE_ITEMS[e.target.selectedIndex] })}
                    css={{ width: 150 }}
                >
                    {RESOURCE_ITEMS.map(item => (
                        <option key={item} value={item}>
                            {ITEMS[item].name}
                        </option>
                    ))}
                </select>
                <div css={{
                    margin: "8px 0",
                    display: "flex",
                    gap: 4,
                    "& > button": {
                        background: "#f2f2f2",
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        cursor: "pointer",
                        "&:hover:not([disabled])": {
                            background: "#e0e0e0",
                            borderColor: "#bbb",
                        },
                        "&[disabled]": {
                            borderColor: "#aaa",
                        },
                    },
                }}>
                    {[30, 60, 120, 240, 480, 960, 1200].map(rate => (
                        <button
                            disabled={rate === node.rate}
                            key={rate}
                            onClick={() => {
                                updateData({ rate });
                                rateInput.current!.value = rate.toString();
                            }}
                        >{rate}</button>
                    ))}
                </div>
                <input
                    ref={rateInput}
                    type="text"
                    min="0"
                    defaultValue={node.rate}
                    onBeforeInput={(e: React.CompositionEvent<HTMLInputElement>) => {
                        const v = e.data;
                        if (v !== "" && isNaN(Number(v))) {
                            e.preventDefault();
                        }
                    }}
                    onKeyDown={e => {
                        if (e.key === "Enter") {
                            updateData({ rate: +e.currentTarget.value })
                        }
                    }}
                    onBlur={e => updateData({ rate: +e.target.value })}
                    css={{
                        fontSize: 12,
                        width: 150,
                    }}
                />
            </div>
            }
        </div>
    </div>;
};
