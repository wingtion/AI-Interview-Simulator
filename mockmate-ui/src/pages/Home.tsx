import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function Home() {
    const navigate = useNavigate();

    // --- STATE FOR RESUME UPLOAD ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

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
            const response = await fetch("http://localhost:5000/api/resume/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();

            // 🚀 MAGIC HAPPENS HERE: We navigate to the room and pass the text in the background!
            navigate('/interview/Resume', { state: { resumeText: data.text } });

        } catch (error) {
            console.error(error);
            alert("Failed to parse resume. Make sure it's a valid PDF.");
        } finally {
            setIsUploading(false);
            setIsModalOpen(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#050505', position: 'relative' }}>

            {/* 1. NAVBAR */}
            <nav className="navbar">
                <div className="logo">MockMate</div>
                <div className="nav-links">
                    <span>How it Works</span>
                    <span>Pricing</span>
                    <span>Log In</span>
                </div>
            </nav>

            {/* 2. HERO SECTION */}
            <header className="hero-container">
                <div className="glow-orb"></div>
                <div className="badge">✨ New: Resume Integration</div>
                <h1>
                    Crush Your <br />
                    <span style={{ color: '#44ff44' }}>Technical Interview</span>
                </h1>
                <p className="hero-sub">
                    Mock Interview AI simulator that listens to your voice, reads your code,
                    and reviews your work.
                </p>
                <button className="cta-button" onClick={() => navigate('/interview/Standard')}>
                    Start Practicing Now
                </button>
            </header>

            {/* 3. BENTO GRID (Selection Modes) */}
            <div className="bento-grid">

                {/* LARGE CARD: GOOGLE MODE */}
                <div className="bento-card span-2" onClick={() => navigate('/interview/Google')}>
                    <div>
                        <div className="bento-icon">🧠</div>
                        <h3>Google Algorithms</h3>
                        <p>Strict focus on Data Structures, Graph traversals, and optimizing Time Complexity.</p>
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                        <span className="tag hard">Hard</span>
                        <span className="tag">Dijkstra</span>
                        <span className="tag">DP</span>
                    </div>
                </div>

                {/* THE NEW RESUME GRILL CARD (TALL CARD) */}
                <div className="bento-card span-row-2" style={{ background: 'linear-gradient(180deg, rgba(68,255,68,0.1), rgba(0,0,0,0))', borderColor: '#44ff44' }} onClick={() => setIsModalOpen(true)}>
                    <div className="bento-icon">📄</div>
                    <h3 style={{ color: '#44ff44' }}>Grill My Resume</h3>
                    <p>
                        Upload your PDF resume. The AI will analyze your actual experience and grill you on your past projects.
                    </p>
                    <div style={{ marginTop: 'auto' }}>
                        <span className="tag soft">Highly Personalized</span>
                    </div>
                </div>

                {/* STANDARD CARD: STARTUP */}
                <div className="bento-card" onClick={() => navigate('/interview/Startup')}>
                    <div className="bento-icon">🚀</div>
                    <h3>Startup Velocity</h3>
                    <p>Ship features fast. Focus on React, Node.js, and clean pragmatic code.</p>
                </div>

                {/* STANDARD CARD: SYSTEM DESIGN */}
                <div className="bento-card" onClick={() => navigate('/interview/SystemDesign')}>
                    <div className="bento-icon">🏗️</div>
                    <h3>System Design</h3>
                    <p>Architect scalable systems. Load balancers, Caching, and Database sharding.</p>
                </div>

            </div>

            {/* FOOTER */}
            <footer className="footer" style={{ textAlign: 'center', paddingBottom: '40px' }}>
                <p>&copy; 2026 MockMate Inc. Built with .NET 8 & React.</p>
            </footer>

            {/* UPLOAD MODAL */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '16px',
                        width: '400px', textAlign: 'center', border: '1px solid #333'
                    }}>
                        <h2 style={{ marginTop: 0 }}>Upload Resume</h2>
                        <p style={{ color: '#888', marginBottom: '30px' }}>PDF format only. We extract the text and generate personalized questions.</p>

                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            style={{ marginBottom: '20px', color: 'white' }}
                        />

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ padding: '10px 20px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={!selectedFile || isUploading}
                                style={{
                                    padding: '10px 20px', background: selectedFile ? '#44ff44' : '#222',
                                    color: selectedFile ? 'black' : '#555', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: selectedFile ? 'pointer' : 'not-allowed'
                                }}
                            >
                                {isUploading ? "Reading PDF..." : "Start Interview"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Home;