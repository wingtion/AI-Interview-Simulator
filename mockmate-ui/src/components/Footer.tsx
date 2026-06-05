import { useNavigate } from 'react-router-dom';

const GITHUB_URL = 'https://github.com/wingtion';
const LINKEDIN_URL = 'https://www.linkedin.com/in/do%C4%9Fan-s%C3%BCle/';
const AUTHOR = 'Doğan Süle';

export default function Footer() {
    const navigate = useNavigate();

    return (
        <footer className="footer">
            <div className="footer-inner">
                <div className="footer-brand">
                    <span className="logo-mark">M</span>
                    <span>MockMate</span>
                </div>

                <nav className="footer-links">
                    <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
                    <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">LinkedIn</a>
                    <span onClick={() => navigate('/dashboard')}>Dashboard</span>
                </nav>

                <div className="footer-copy">
                    © 2026 {AUTHOR} · Built with .NET 9 &amp; React
                </div>
            </div>
        </footer>
    );
}
