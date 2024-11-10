import { useCallback, useRef, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    ConnectionLineType,
    OnNodesChange,
    OnEdgesChange,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { FlowNode, NODE_TYPES } from './nodes';
import { calcNewNodeMenuPos, NewNodeMenu, NewNodeMenuPos } from './NewNodeMenu';
import { useStore } from './store';
import { useShallow } from 'zustand/shallow';
import {
    connectionToHandles, edgeIdToHandlePair, fromFlowNodeId, handlePairToEdgeId, toFlowHandleId,
    toFlowNodeId, useEventListener,
} from './util';
import { EDGE_TYPES, MainEdge } from './edges';
import { Header } from './Header';
import { GraphHandle } from './graph';
import { useImmer } from 'use-immer';




export default function App() {
    const ref = useRef<HTMLDivElement>(null);

    const {
        graph, removeNode, addEdge, removeEdge, updateNodePos,
    } = useStore(useShallow(state => ({
        graph: state.graph,
        removeNode: state.removeNode,
        addEdge: state.addEdge,
        removeEdge: state.removeEdge,
        updateNodePos: state.updateNodePos,
    })));

    // Node selection is not something we would want to persist or that should be part of the
    // undo/redo history. So we track it here, outside of our state.
    const [selectedNodes, setSelectedNodes] = useImmer<Set<string>>(new Set());
    const [selectedEdges, setSelectedEdges] = useImmer<Set<string>>(new Set());


    // Register undo/redo shortcuts
    const { undo, redo, pause, resume } = useStore.temporal.getState();
    useEventListener("keydown", (event: KeyboardEvent) => {
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();
            undo();
        } else if (event.ctrlKey && event.key === 'y') {
            event.preventDefault();
            redo();
        }
    });

    // Handle right-clicks to open the new node menu
    const [menuPos, setMenuPos] = useState<NewNodeMenuPos | null>(null);
    const onPaneContextMenu = useCallback(
        (event: React.MouseEvent | MouseEvent) => {
            event.preventDefault();
            const pos = calcNewNodeMenuPos(event, ref.current!.getBoundingClientRect());
            setMenuPos(pos);
        },
        [setMenuPos],
    );
    const closeMenu = () => setMenuPos(null);


    const onNodesChange: OnNodesChange<FlowNode> = (changes) => {
        for (const change of changes) {
            switch (change.type) {
                case "remove":
                    removeNode(fromFlowNodeId(change.id));
                    break;

                // Sometimes the given position is undefined or contains NaNs. We ignore
                // all of those updates.
                case "position": {
                    const pos = change.position;
                    if (pos && pos.x && pos.y && !isNaN(pos.x) && !isNaN(pos.y)) {
                        updateNodePos(fromFlowNodeId(change.id), pos);
                    }
                    break;
                }

                // None of our nodes is resizable and it seems like we can safely ignore
                // these events.
                case "dimensions": break;

                case "select":
                    setSelectedNodes(nodes => {
                        if (change.selected) {
                            nodes.add(change.id);
                        } else {
                            nodes.delete(change.id);
                        }
                    });
                    break;

                default:
                    console.warn(`Unhandled ${change.type} node event!`, change);
            }
        }
    };
    const onEdgesChange: OnEdgesChange<MainEdge> = (changes) => {
        for (const change of changes) {
            switch (change.type) {
                case "remove": {
                    const [source, target] = edgeIdToHandlePair(change.id);
                    removeEdge(source, target);
                    break;
                }

                case "select":
                    setSelectedEdges(nodes => {
                        if (change.selected) {
                            nodes.add(change.id);
                        } else {
                            nodes.delete(change.id);
                        }
                    });
                    break;

                default:
                    console.warn(`Unhandled ${change.type} edge event!`, change);
            }
        }
    };


    return <>
        <Header />
        <ReactFlow
            ref={ref}

            // Basic config
            deleteKeyCode={["Delete", "Backspace"]}
            fitView
            snapToGrid
            snapGrid={[25, 25]}
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionLineStyle={{ strokeWidth: 1.5, strokeLinecap: 'round' }}
            connectionRadius={10}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}

            // Map our internal state to ReactFlow entities
            nodes={[...graph.nodes.entries()].map(([id, node]) => ({
                id: toFlowNodeId(id),
                position: node.pos,
                selected: selectedNodes.has(toFlowNodeId(id)),
                ...node.match({
                    recipe: (node, type) => ({ type, data: {
                        recipeId: node.recipe,
                        buildingsCount: node.buildingsCount,
                        overclock: node.overclock,
                    }}),
                    splitter: (_node, type) => ({ type, data: {} }),
                    merger: (_node, type) => ({ type, data: {} }),
                    source: (node, type) => ({ type, data: {
                        item: node.item,
                        rate: node.rate,
                    }}),
                }),
            }))}
            edges={(() => {
                const edges: MainEdge[] = [];
                for (const [nodeId, node] of graph.nodes) {
                    for (const [sourceHandleId, targetHandle] of node.outgoingEdges) {
                        const id = handlePairToEdgeId(new GraphHandle(nodeId, sourceHandleId), targetHandle);
                        edges.push({
                            id,
                            type: "main",
                            selected: selectedEdges.has(id),
                            source: toFlowNodeId(nodeId),
                            sourceHandle: toFlowHandleId(sourceHandleId),
                            target: toFlowNodeId(targetHandle.node),
                            targetHandle: toFlowHandleId(targetHandle.handle),
                        });
                    }
                }

                return edges;
            })()}

            // Change handlers to update our own state
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}

            // Other callbacks
            onPaneContextMenu={onPaneContextMenu}
            onPaneClick={closeMenu}
            onMove={closeMenu}
            onConnect={connection => {
                const [source, target] = connectionToHandles(connection);
                addEdge(source, target);
            }}
            isValidConnection={connection => {
                const [source, target] = connectionToHandles(connection);
                return graph.isValidConnection(source, target);
            }}
            onNodeDragStart={pause}
            onNodeDragStop={resume}
        >
            <Background gap={25} variant={BackgroundVariant.Cross} />
            <MiniMap />
            <Controls />
            {menuPos && <NewNodeMenu close={closeMenu} pos={menuPos} />}
        </ReactFlow>
    </>;
}
