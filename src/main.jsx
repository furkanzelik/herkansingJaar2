import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Trainer from './Trainer.jsx';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter basename="/herkansingJaar2">
            <Routes>
                <Route path="/" element={<App />} />
                <Route path="/trainer" element={<Trainer />} />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);