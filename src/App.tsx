import { useCallback, useRef, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    type OnConnect,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { initialNodes, nodeTypes } from './nodes';
import { initialEdges, edgeTypes } from './edges';
import { calcNewNodeMenuPos, NewNodeMenu, NewNodeMenuPos } from './NewNodeMenu';

export default function App() {
    const ref = useRef<HTMLDivElement>(null);
    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const onConnect: OnConnect = useCallback(
        (connection) => setEdges((edges) => addEdge(connection, edges)),
        [setEdges]
    );

    const [menuPos, setMenuPos] = useState<NewNodeMenuPos | null>(null);
    const onPaneContextMenu = useCallback(
        (event: React.MouseEvent | MouseEvent) => {
            // Prevent native context menu from showing
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
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            edges={edges}
            edgeTypes={edgeTypes}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onPaneContextMenu={onPaneContextMenu}
            onPaneClick={closeMenu}
            onMove={closeMenu}
            fitView
        >
            <Background />
            <MiniMap />
            <Controls />
            {menuPos && <NewNodeMenu close={closeMenu} pos={menuPos} />}
        </ReactFlow>
    );
}
