import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom'; // 👈 switch to HashRouter
import App from './App.jsx';
import Trainer from './Trainer.jsx';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <HashRouter>
            <Routes>
                <Route path="/" element={<App />} />
                <Route path="/trainer" element={<Trainer />} />
            </Routes>
        </HashRouter>
    </React.StrictMode>
);
