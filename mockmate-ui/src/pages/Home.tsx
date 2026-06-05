import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import Footer from '../components/Footer';
import MatrixRain from '../components/MatrixRain';
import Reveal from '../components/Reveal';
import { ARENAS } from '../lib/modes';
import { API_URL } from '../config';
import '../App.css';

function Home() {
    const navigate = useNavigate();
    const showToast = useToast();

    // --- STATE FOR RESUME UPLOAD ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [demoError, setDemoError] = useState(false);

    const scrollToHow = () =>
        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });

    // Close the upload modal with Escape
    useEffect(() => {
        if (!isModalOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsModalOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isModalOpen]);

    // Backstop: kill any TTS still playing from an interview we just left.
    useEffect(() => {
        const kill = () => { window.speechSynthesis.resume(); window.speechSynthesis.cancel(); };
        kill();
        const id = setInterval(kill, 120);
        const stop = setTimeout(() => clearInterval(id), 1500);
        return () => { clearInterval(id); clearTimeout(stop); };
    }, []);

    // --- UPLOAD LOGIC ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setIsUploading(true);

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await fetch(`${API_URL}/api/resume/upload`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();

            // 🚀 MAGIC HAPPENS HERE: We navigate to the room and pass the text in the background!
            navigate('/interview/Resume', { state: { resumeText: data.text } });

        } catch (error) {
            console.error(error);
            showToast("Failed to parse resume. Make sure it's a valid PDF.", 'error');
        } finally {
            setIsUploading(false);
            setIsModalOpen(false);
        }
    };

    // Premium spotlight micro-interaction on cards
    const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        el.style.setProperty('--my', `${e.clientY - rect.top}px`);
    };

    return (
        <>
            {/* ANIMATED BACKGROUND (outside .page so the page transition transform doesn't move it) */}
            <MatrixRain />

            <div className="page">

            {/* 1. NAVBAR */}
            <nav className="navbar">
                <div className="logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <span className="logo-mark">M</span>
                    MockMate
                </div>
                <div className="nav-links">
                    <span onClick={scrollToHow}>How it Works</span>
                    <span onClick={() => navigate('/practice')}>Practice Problems</span>
                    <span onClick={() => navigate('/dashboard')}>Dashboard</span>
                    <span className="nav-cta" onClick={() => navigate('/interview/Standard')}>
                        Start Free
                    </span>
                </div>
            </nav>

            {/* 2. HERO SECTION */}
            <header className="hero-container fade-in">
                <div className="glow-orb"></div>
                <div className="badge">✦ New — Resume Integration</div>
                <h1 className="hero-title">
                    Crush your next<br />
                    <span className="accent">technical interview</span>
                </h1>
                <p className="hero-sub">
                    An AI interview simulator that listens to your voice, reads your code,
                    and reviews your performance in real time.
                </p>
                <div className="hero-actions">
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/interview/Standard')}>
                        Start Mock Interview →
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={() => navigate('/practice')}>
                        Practice Problems
                    </button>
                </div>
                <div className="hero-modes-hint">
                    <span className="hero-mode-item">🎤 <strong>Mock Interview</strong> — talk &amp; get scored</span>
                    <span className="hero-mode-item">🧩 <strong>Practice</strong> — solve problems solo, no interview</span>
                </div>
            </header>

            {/* 2b. DEMO PREVIEW */}
            <div className="section demo-section">
                <Reveal>
                <div className="demo-window">
                    <div className="demo-bar">
                        <span className="wdot" /><span className="wdot" /><span className="wdot" />
                        <div className="demo-url">mockmate.app/interview</div>
                    </div>
                    <div className="demo-body">
                        {!demoError ? (
                            <img
                                src="/demo.svg"
                                alt="MockMate interview in action"
                                onError={() => setDemoError(true)}
                            />
                        ) : (
                            <div className="demo-placeholder">
                                <div className="demo-badges">🎤 Voice · 💻 Live code · 🧠 AI feedback</div>
                                <div className="demo-hint">Interview preview</div>
                            </div>
                        )}
                    </div>
                </div>
                </Reveal>
            </div>

            {/* 2c. HOW IT WORKS */}
            <section id="how-it-works" className="section">
                <Reveal>
                <div className="section-head">
                    <h2>How it works</h2>
                    <p>From zero to scored feedback in three steps.</p>
                </div>
                <div className="steps-grid stagger">
                    <div className="step-card">
                        <div className="step-num">1</div>
                        <h3>Pick your mode</h3>
                        <p>Google algorithms, Meta frontend, SQL & data, system design, Amazon leadership — or upload your résumé for personalized questions.</p>
                    </div>
                    <div className="step-card">
                        <div className="step-num">2</div>
                        <h3>Talk &amp; code live</h3>
                        <p>Speak your thoughts through the mic and write in the editor. The AI interviewer reacts in real time and can run your code.</p>
                    </div>
                    <div className="step-card">
                        <div className="step-num">3</div>
                        <h3>Get scored feedback</h3>
                        <p>Receive coding and communication scores with actionable notes — all tracked on your personal dashboard.</p>
                    </div>
                </div>
                </Reveal>
            </section>

            {/* 3. BENTO GRID (Selection Modes) */}
            <section className="section">
                <Reveal>
                <div className="section-head">
                    <h2>Choose your arena</h2>
                    <p>Tailored interview modes, each with its own personality and focus.</p>
                </div>

                <div className="bento-grid stagger">
                    {ARENAS.map((a) => (
                        <div
                            key={a.id}
                            className={`bento-card ${a.span ?? ''} ${a.resume ? 'featured' : ''}`}
                            onMouseMove={handleSpotlight}
                            onClick={() => (a.resume ? setIsModalOpen(true) : navigate(`/interview/${a.id}`))}
                        >
                            <span className={`bento-diff tag ${a.difficulty.level}`}>{a.difficulty.label}</span>
                            <div>
                                <div className="bento-icon" data-cat={a.category}>{a.emoji}</div>
                                <h3>{a.title}</h3>
                                <p>{a.desc}</p>
                            </div>
                            {a.tags && a.tags.length > 0 && (
                                <div className="card-tags">
                                    {a.tags.map((t) => (
                                        <span key={t.label} className="tag">{t.label}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                </Reveal>
            </section>

            {/* FOOTER */}
            <Footer />

            {/* UPLOAD MODAL */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal" role="dialog" aria-modal="true" aria-label="Upload your resume" onClick={(e) => e.stopPropagation()}>
                        <h2>Upload your resume</h2>
                        <p className="modal-sub">PDF only. We extract the text and generate personalized, project-specific questions.</p>

                        <div className="file-drop">
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileChange}
                                className="file-input"
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleUpload}
                                disabled={!selectedFile || isUploading}
                            >
                                {isUploading ? "Reading PDF…" : "Start Interview"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            </div>
        </>
    );
}

export default Home;
