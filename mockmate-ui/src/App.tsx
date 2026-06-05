import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Interview from './pages/Interview';
import Dashboard from './pages/Dashboard';
import Practice from './pages/Practice';
import NotFound from './pages/NotFound';
import { ToastProvider } from './components/Toast';
import './App.css';

function App() {
    return (
        <ToastProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/practice" element={<Practice />} />
                    <Route path="/interview/:modeParam" element={<Interview />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Router>
        </ToastProvider>
    );
}

export default App;
