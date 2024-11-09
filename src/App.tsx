import { useCallback, useRef, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    ConnectionLineType,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { FlowNode, NODE_TYPES } from './nodes';
import { calcNewNodeMenuPos, NewNodeMenu, NewNodeMenuPos } from './NewNodeMenu';
import { useStore } from './store';
import { useShallow } from 'zustand/shallow';
import { handleToEntry, match, useEventListener } from './util';
import { EDGE_TYPES } from './edges';
import { Header } from './Header';
import { ItemId } from './gamedata';
import { RecipeNode } from './nodes/Recipe';
import { SourceNode } from './nodes/Source';

export default function App() {
    const { 
        nodes, edges, getNode, onNodesChange, onEdgesChange, addEdge,
    } = useStore(useShallow(state => ({
        nodes: state.nodes,
        edges: state.edges,
        getNode: state.getNode,
        addEdge: state.addEdge,
        onNodesChange: state.onNodesChange,
        onEdgesChange: state.onEdgesChange,
    })));
    const { undo, redo, pause, resume } = useStore.temporal.getState();

    const ref = useRef<HTMLDivElement>(null);

    useEventListener("keydown", (event: KeyboardEvent) => {
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();
            undo();
        } else if (event.ctrlKey && event.key === 'y') {
            event.preventDefault();
            redo();
        }
    });

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

    return <>
        <Header />
        <ReactFlow
            ref={ref}
            nodes={nodes}
            edges={edges.map(edge => ({ ...edge, type: "main" as const }))}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}

            deleteKeyCode={["Delete", "Backspace"]}
            onPaneContextMenu={onPaneContextMenu}
            onPaneClick={closeMenu}
            onMove={closeMenu}
            onConnect={addEdge}
            isValidConnection={connection => { 
                const source = getNode(connection.source)!;
                const target = getNode(connection.target)!;

                const getItem = (node: FlowNode, handle?: string | null): ItemId | undefined => {
                    return match(node.type, {
                        "recipe": () => (
                            handleToEntry(node as RecipeNode, handle!).item
                        ),
                        "source": () => (node as SourceNode).data.item,
                        "splitter": () => undefined, // TODO
                        "merger": () => undefined, // TODO
                    });
                };

                const sourceItem = getItem(source, connection.sourceHandle);
                const targetItem = getItem(target, connection.targetHandle);
                return sourceItem === undefined 
                    || targetItem === undefined 
                    || sourceItem === targetItem;
            }}
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionLineStyle={{ strokeWidth: 1.5, strokeLinecap: 'round' }}
            connectionRadius={10}
            onNodeDragStart={pause}
            onNodeDragStop={resume}
            fitView
            snapToGrid
            snapGrid={[25, 25]}
        >
            <Background gap={25} variant={BackgroundVariant.Cross} />
            <MiniMap />
            <Controls />
            {menuPos && <NewNodeMenu close={closeMenu} pos={menuPos} />}
        </ReactFlow>
    </>;
}
