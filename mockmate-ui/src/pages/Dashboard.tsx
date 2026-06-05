import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory, clearHistory, type InterviewRecord } from '../lib/history';
import ScoreChart from '../components/ScoreChart';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';
import CountUp from '../components/CountUp';
import '../App.css';

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const scoreClass = (v: number) => (v >= 7 ? 'good' : v >= 4 ? 'mid' : 'bad');

function Dashboard() {
    const navigate = useNavigate();
    const [records, setRecords] = useState<InterviewRecord[]>(() => getHistory());
    const [selected, setSelected] = useState<InterviewRecord | null>(null);

    const stats = useMemo(() => {
        if (records.length === 0) return null;
        const avg = (pick: (r: InterviewRecord) => number) =>
            Math.round((records.reduce((s, r) => s + (pick(r) || 0), 0) / records.length) * 10) / 10;
        return {
            total: records.length,
            avgCoding: avg((r) => r.codingScore),
            avgComm: avg((r) => r.communicationScore),
            best: Math.max(...records.map((r) => r.codingScore || 0)),
        };
    }, [records]);

    // oldest → newest for the trend line
    const chartData = useMemo(
        () => [...records].reverse().map((r) => ({ coding: r.codingScore || 0, communication: r.communicationScore || 0 })),
        [records],
    );

    const handleClear = () => {
        if (window.confirm('Clear all interview history? This cannot be undone.')) {
            clearHistory();
            setRecords([]);
        }
    };

    // Close the detail modal with Escape
    useEffect(() => {
        if (!selected) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selected]);

    return (
        <div className="page">
            {/* NAVBAR */}
            <nav className="navbar">
                <div className="logo" onClick={() => navigate('/')}>
                    <span className="logo-mark">M</span>
                    MockMate
                </div>
                <div className="nav-links">
                    <span onClick={() => navigate('/')}>Home</span>
                    <span onClick={() => navigate('/practice')}>Practice Problems</span>
                    <span className="nav-cta" onClick={() => navigate('/interview/Standard')}>
                        New Interview
                    </span>
                </div>
            </nav>

            <section className="section" style={{ paddingTop: 'var(--s-12)' }}>
                <div className="dash-head">
                    <div>
                        <h1 className="dash-title">Your Progress</h1>
                        <p className="dash-sub">Every completed interview is saved on this device.</p>
                    </div>
                    {records.length > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={handleClear}>Clear history</button>
                    )}
                </div>

                {records.length === 0 ? (
                    <div className="empty-state fade-in">
                        <div className="empty-icon">📊</div>
                        <h2>No interviews yet</h2>
                        <p>Finish your first mock interview and your scores, feedback and progress will show up here.</p>
                        <button className="btn btn-primary btn-lg" onClick={() => navigate('/interview/Standard')}>
                            Start your first interview →
                        </button>
                    </div>
                ) : (
                    <>
                        {/* STAT CARDS */}
                        <Reveal>
                        <div className="stat-grid stagger">
                            <div className="stat-card">
                                <div className="stat-value"><CountUp value={stats!.total} /></div>
                                <div className="stat-label">Interviews</div>
                            </div>
                            <div className="stat-card">
                                <div className={`stat-value ${scoreClass(stats!.avgCoding)}`}><CountUp value={stats!.avgCoding} decimals={1} /></div>
                                <div className="stat-label">Avg Coding</div>
                            </div>
                            <div className="stat-card">
                                <div className={`stat-value ${scoreClass(stats!.avgComm)}`}><CountUp value={stats!.avgComm} decimals={1} /></div>
                                <div className="stat-label">Avg Communication</div>
                            </div>
                            <div className="stat-card">
                                <div className={`stat-value ${scoreClass(stats!.best)}`}><CountUp value={stats!.best} /></div>
                                <div className="stat-label">Best Coding</div>
                            </div>
                        </div>
                        </Reveal>

                        {/* CHART */}
                        <Reveal>
                        <div className="panel">
                            <div className="panel-head">
                                <h3>Score trend</h3>
                                <div className="chart-legend">
                                    <span className="legend-item"><i className="dot coding" /> Coding</span>
                                    <span className="legend-item"><i className="dot comm" /> Communication</span>
                                </div>
                            </div>
                            <ScoreChart data={chartData} />
                        </div>
                        </Reveal>

                        {/* HISTORY LIST */}
                        <Reveal>
                        <div className="panel">
                            <div className="panel-head">
                                <h3>History</h3>
                                <span className="muted">{records.length} total</span>
                            </div>
                            <div className="history-list">
                                {records.map((r) => (
                                    <button key={r.id} className="history-row" onClick={() => setSelected(r)}>
                                        <div className="history-main">
                                            <span className="tag info">{r.mode}</span>
                                            <span className="history-meta">{[r.language, r.topic, r.difficulty].filter(Boolean).join(' · ')}</span>
                                        </div>
                                        <div className="history-right">
                                            <span className={`score-chip ${scoreClass(r.codingScore)}`}>Cod {r.codingScore}</span>
                                            <span className={`score-chip ${scoreClass(r.communicationScore)}`}>Com {r.communicationScore}</span>
                                            <span className="history-date">{fmtDate(r.date)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        </Reveal>
                    </>
                )}
            </section>

            <Footer />

            {/* DETAIL MODAL */}
            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal" role="dialog" aria-modal="true" aria-label={`${selected.mode} interview details`} onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" aria-label="Close" onClick={() => setSelected(null)}>✕</button>
                        <h2>{selected.mode} interview</h2>
                        <p className="modal-sub">
                            {[fmtDate(selected.date), selected.language, selected.topic, selected.difficulty].filter(Boolean).join(' · ')}
                        </p>

                        <div className="score-row" style={{ marginBottom: 'var(--s-5)' }}>
                            <div className="score-card">
                                <div className={`score-value ${scoreClass(selected.codingScore)}`}>
                                    {selected.codingScore}<span style={{ fontSize: '1.2rem', color: 'var(--text-3)' }}>/10</span>
                                </div>
                                <div className="score-label">Coding</div>
                            </div>
                            <div className="score-card">
                                <div className={`score-value ${scoreClass(selected.communicationScore)}`}>
                                    {selected.communicationScore}<span style={{ fontSize: '1.2rem', color: 'var(--text-3)' }}>/10</span>
                                </div>
                                <div className="score-label">Communication</div>
                            </div>
                        </div>

                        <div className="feedback-box">
                            <h3>📝 Feedback</h3>
                            <ul>
                                {selected.feedbackPoints?.length
                                    ? selected.feedbackPoints.map((p, i) => <li key={i}>{p}</li>)
                                    : <li>No feedback recorded.</li>}
                            </ul>
                        </div>

                        <button className="btn btn-secondary btn-block" onClick={() => setSelected(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
