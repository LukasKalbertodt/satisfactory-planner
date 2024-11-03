import { useCallback, useRef, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { NODE_TYPES } from './nodes';
import { calcNewNodeMenuPos, NewNodeMenu, NewNodeMenuPos } from './NewNodeMenu';
import { useStore } from './store';
import { useShallow } from 'zustand/shallow';
import { useEventListener } from './util';

export default function App() {
    const { nodes, onNodesChange } = useStore(useShallow(state => ({
        nodes: state.nodes,
        onNodesChange: state.onNodesChange,
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

    return (
        <ReactFlow
            ref={ref}
            nodes={nodes}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            deleteKeyCode={["Delete", "Backspace"]}
            onPaneContextMenu={onPaneContextMenu}
            onPaneClick={closeMenu}
            onMove={closeMenu}
            onNodeDragStart={pause}
            onNodeDragStop={resume}
            fitView
        >
            <Background />
            <MiniMap />
            <Controls />
            {menuPos && <NewNodeMenu close={closeMenu} pos={menuPos} />}
        </ReactFlow>
    );
}
