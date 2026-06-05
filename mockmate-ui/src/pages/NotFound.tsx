import { useNavigate } from 'react-router-dom';
import '../App.css';

function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="page notfound">
            <div className="notfound-card fade-in">
                <div className="notfound-code">404</div>
                <h1>Page not found</h1>
                <p>The page you're looking for doesn't exist or may have moved.</p>
                <div className="notfound-actions">
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
                        ← Back home
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={() => navigate('/interview/Standard')}>
                        Start interview
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NotFound;
