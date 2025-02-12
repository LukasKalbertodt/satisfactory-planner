import { type Node, Handle, NodeProps, Position } from "@xyflow/react";
import { ItemId, ITEMS } from "../gamedata";
import { useState } from "react";
import { itemIcon, toFlowHandleId } from "../util";
import { handleCss, rateCss, RateDiff, settingsPopoverCss, totalRateCss } from "./util";
import { useStore } from "../store";
import { LuMinus, LuPlus } from "react-icons/lu";
import { useShallow } from "zustand/shallow";
import { RecipeGraphNode, recipeHandleIdFor } from "../graph/recipe";
import { GraphHandle } from "../graph";
import { NodeData } from ".";


export type RecipeNodeData = NodeData<RecipeGraphNode>;
export type RecipeNode = Node<RecipeNodeData, "recipe">;

export const RecipeNode = ({ data: { node, id }, selected }: NodeProps<RecipeNode>) => {
    const { graph, setRecipeNodeData } = useStore(useShallow(state => ({
        graph: state.graph,
        setRecipeNodeData: state.setRecipeNodeData,
    })));
    const updateData = (update: Partial<RecipeGraphNode>) => setRecipeNodeData(id, update);

    // Work around the zombie child problem. When deleting nodes, for some reason, the node is
    // still rendered once, but with `graph` alerady not containing it. This usually leads to
    // null errors since nodes assume `graph.node(id)` to exist. We just return null since
    // the result of this render won't be shown at all anyway.
    //
    // Also see: https://github.com/xyflow/xyflow/issues/2548
    if (!graph.hasNode(id)) {
        return null;
    }

    return (
        <div css={{
            "--active-background": "#f8f8f8",
            width: 250,
            fontSize: 12,
            borderRadius: 4,
            textAlign: "center",
            border: "1px solid #777",
            background: "white",
            "&:hover": {
                background: "var(--active-background)",
            },
            "&:not(:hover) .visible-on-hover": {
                visibility: "hidden",
            },
            ...selected && {
                background: "var(--active-background)",
                outline: "2px solid #efc74f",
            },
        }}>
            <div css={{
                height: 46,
                paddingBottom: 4,
                marginBottom: 4,
                borderBottom: "1px solid #e0e0e0",
            }}>
                <div css={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    alignItems: "center",
                    paddingTop: 2,
                    fontFamily: "Hubot Sans",
                }}>
                    <BuildingsCount
                        count={node.buildingsCount}
                        setCount={count => updateData({ buildingsCount: count })}
                    />
                    <Overclock
                        overclock={node.overclock}
                        setOverclock={overclock => updateData({ overclock })}
                    />
                    <div />
                </div>
                <div css={{
                    fontFamily: "Hubot Sans",
                    fontWeight: "bold",
                }}>{node.recipe().name}</div>
            </div>
            <div css={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0 8px",
                fontSize: 10,
                gap: 8,
                "> div": {
                    flex: "1 1 100%",
                }
            }}>
                <div>
                    {node.inputEntries().map((entry, idx) => (
                        <IoEntry
                            key={idx}
                            idx={idx}
                            itemId={entry.item}
                            rate={entry.rate}
                            totalRate={entry.totalRate}
                            kind="input"
                            isConnectable={entry.connectedTo === null}
                        />
                    ))}
                </div>
                <div>
                    {node.outputEntries().map((entry, idx) => (
                        <IoEntry
                            key={idx}
                            idx={idx}
                            itemId={entry.item}
                            rate={entry.rate}
                            totalRate={entry.totalRate}
                            kind="output"
                            isConnectable={entry.connectedTo === null}
                            expectedRate={graph.expectedOutputRate(new GraphHandle(id, entry.handle))}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

type IoEntryProps = {
    idx: number;
    itemId: ItemId;
    rate: number;
    totalRate: number;
    expectedRate?: number;
    kind: "input" | "output";
    isConnectable: boolean;
};

const IoEntry = ({
    idx, itemId, kind, rate, totalRate, isConnectable, expectedRate,
}: IoEntryProps) => (
    <div css={{
        position: "relative",
        height: 23,
        marginBottom: 2,
        display: "flex",
        flexDirection: kind === "input" ? "row" : "row-reverse",
        gap: 8,
        alignItems: "center",
    }}>
        <div css={{
            ...totalRateCss,
            position: "absolute",
            [kind === "input" ? "right" : "left"]: "calc(100% + 15px)",
        }}>
            {totalRate.toString().slice(0, 6)}
            <RateDiff expected={expectedRate} actual={totalRate} />
        </div>
        <Handle
            id={toFlowHandleId(recipeHandleIdFor(idx, kind))}
            isConnectable={isConnectable}
            type={kind === "input" ? "target" : "source"}
            position={kind === "input" ? Position.Left : Position.Right}
            css={{
                [kind === "input" ? "left" : "right"]: -8.5,
                ...handleCss,
            }}
        />
        <img
            src={itemIcon(itemId)}
            css={{ height: "100%"}}
        />
        <div css={{
            ...rateCss,
            minWidth: 20,
            flex: "0 0 auto",
            textAlign: "right",
        }}>{rate.toString().slice(0, 6)}</div>
        <div css={{
            textAlign: kind === "input" ? "left" : "right",
            lineHeight: "1.1",
            flexShrink: 1,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            textOverflow: "ellipsis",
            fontStretch: "90%",
        }}>{ITEMS[itemId].name}</div>
    </div>
);

type BuildingsCountProps = {
    count: number;
    setCount: (count: number) => void;
};

const BuildingsCount = ({ count, setCount }: BuildingsCountProps) => {
    const updateFromInput = (value: string) => {
        const num = Number(value);
        if (isNaN(num)) {
            setCount(1);
        }
        setCount(Math.min(999, Math.max(1, num)));
    };

    return (
        <div css={{
            "--border-color": "#bbb",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            height: 18,
            lineHeight: 1,
            marginRight: "auto",
            marginLeft: -10,
            "& > button": {
                visibility: "hidden",
                background: "none",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                padding: 0,
                height: "100%",
                fontSize: "inherit",
                "&:hover": {
                    background: "#ddd",
                },
                "&:first-of-type": {
                    borderTopLeftRadius: 4,
                    borderBottomLeftRadius: 4,
                },
                "&:last-of-type": {
                    borderTopRightRadius: 4,
                    borderBottomRightRadius: 4,
                },
            },
            "&:hover, &:focus-within": {
                zIndex: 10,
                background: "var(--active-background)",
                "& > button": {
                    visibility: "visible",
                },
                "& > div": {
                    border: "1px solid var(--border-color)",
                    borderLeft: "none",
                    borderRight: "none",
                },
            },
        }}>

            <button onClick={() => setCount(count - 1)} disabled={count === 1}>
                <LuMinus />
            </button>
            <div css={{  height: "100%", display: "flex", alignItems: "center", minWidth: 28 }}>
                {/* We auto-size the `input` field by having a hidden span, which influence the
                    size of the parent div */}
                <div css={{
                    position: "relative",
                    height: "100%",
                    display: "inline-block",
                    "& > *": {
                        padding: "0 2px",
                    },
                }}>
                    <input
                        type="text"
                        value={count}
                        maxLength={3}
                        onBeforeInput={(e: React.CompositionEvent<HTMLInputElement>) => {
                            const v = e.data;
                            if (v !== "" && isNaN(Number(v))) {
                                e.preventDefault();
                            }
                        }}
                        onChange={e => updateFromInput(e.currentTarget.value)}
                        css={{
                            position: "absolute",
                            inset: 0,
                            border: "none",
                            height: "100%",
                            background: "none",
                        }}
                    />
                    <span css={{ visibility: "hidden" }}>{count}</span>
                </div>
                {"×"}
            </div>
            <button onClick={() => setCount(count + 1)}>
                <LuPlus />
            </button>
        </div>
    );
};

type OverclockProps = {
    overclock: number;
    setOverclock: (overclock: number) => void;
};

const Overclock = ({ overclock, setOverclock }: OverclockProps) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const setAndClose = (v: number) => {
        setOverclock(v);
        setMenuOpen(false);
    };

    return (
        <div css={{
            position: "relative",
            fontSize: 10,
            margin: "0 auto",
            color: overclock === 1 ? "#777" : "black",
        }}>
            <div onClick={() => setMenuOpen(old => !old)} css={{
                cursor: "pointer",
                padding: "0 4px",
                borderRadius: 4,
                "&:hover": {
                    background: "#ddd",
                },
            }}>
                {Math.round(overclock * 10000) / 100}%
            </div>
            {menuOpen && (
                <div css={{
                    ...settingsPopoverCss,
                    position: "absolute",
                    bottom: "calc(100% + 1px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                }}>
                    <div css={{
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
                        },
                    }}>
                        {[0.5, 1.0, 1.5, 2.0, 2.5].map(v => (
                            <button disabled={v === overclock} key={v} onClick={() => setAndClose(v)}>
                                {Math.round(v * 100)}%
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
