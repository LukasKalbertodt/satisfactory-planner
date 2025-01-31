import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

import './index.css';
import { enableMapSet } from 'immer';
import { set_panic_hook } from '../pkg/satisfactory_planner';

enableMapSet();
set_panic_hook();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
