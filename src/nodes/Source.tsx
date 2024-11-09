import { type Node, Handle, NodeProps, Position, useEdges } from "@xyflow/react";

import { handleCss, settingsPopoverCss, totalRateCss } from "./util";
import { itemIcon } from "../util";
import { ITEMS, RESOURCE_ITEMS, ResourceItem } from "../gamedata";
import { useStore } from "../store";


export type SourceNodeData = {
    item: ResourceItem;
    rate: number;
};
export type SourceNode = Node<SourceNodeData, "source">;

export const SourceNode = ({ id, selected, data }: NodeProps<SourceNode>) => {
    const setData = useStore(store => store.setSourceNodeData);
    const updateData = (update: Partial<SourceNodeData>) => setData(id, { ...data, ...update });
    const edges = useEdges();
    const hasConnection = edges.some(edge => edge.source === id);

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
                src={itemIcon(data.item)} 
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
                {data.rate}
            </div>
            <div css={{
                position: "absolute",
                top: "100%",
                left: -20,
                right: -20,
                fontSize: 12,
                textAlign: "center",
            }}>
                {ITEMS[data.item].name}
            </div>
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                css={{ ...handleCss, right: -8 }}
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
                    value={data.item}
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
                    value={data.rate} 
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
