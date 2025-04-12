import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import App from './App.jsx';
import Trainer from './Trainer.jsx';
import './style.css';

const Root = () => (
    <BrowserRouter>
        <nav className="topnav">
            <Link to="/">🏠 App</Link>
            <Link to="/trainer">🎓 Trainer</Link>
        </nav>
        <Routes>
            <Route path="/" element={<App />} />
            <Route path="/trainer" element={<Trainer />} />
        </Routes>
    </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
