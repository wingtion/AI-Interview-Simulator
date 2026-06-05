/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import AudioVisualizer from '../components/AudioVisualizer';
import { useToast } from '../components/Toast';
import { saveRecord } from '../lib/history';
import { defineMockmateTheme } from '../lib/editorTheme';
import {
    ARENAS,
    LANGUAGES,
    LANG_LABEL,
    personaFor,
    isCodingMode,
    fixedLanguageFor,
    starterFor,
} from '../lib/modes';
import { API_URL } from '../config';
import '../App.css';

interface AiResponse {
    message: string;
    isCodeRequest: boolean;
}

interface InterviewFeedback {
    codingScore: number;
    communicationScore: number;
    feedbackPoints: string[];
}

const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

// The Web Speech API (mic) is unavailable on iOS Safari (so all iPhone/iPad browsers)
// and some mobile browsers. When it's missing we hide the mic UI and steer the user
// to the typed chat input instead, which drives the interview just the same.
const VOICE_SUPPORTED =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

function Interview() {
    const { modeParam } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const showToast = useToast();

    // --- STATE ---
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [code, setCode] = useState<string>("// The interviewer will give you a problem. Write your solution here…\n");
    const [mode, setMode] = useState<string>(modeParam || "Standard");
    const [language, setLanguage] = useState<string>("javascript");
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [elapsed, setElapsed] = useState(0); // session seconds
    const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const resumeText = location.state?.resumeText || "";

    // Execution State
    const [output, setOutput] = useState<string>("");
    const [isRunning, setIsRunning] = useState(false);
    const [consoleOpen, setConsoleOpen] = useState(true);

    // Feedback State
    const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

    const [chatInput, setChatInput] = useState("");
    const [previewText, setPreviewText] = useState("");

    const codeRef = useRef<string>(code);
    const recognitionRef = useRef<any>(null);
    const runCodeRef = useRef<() => void>(() => {});

    // Voice capture: accumulate speech until the user clicks STOP
    const finalTranscriptRef = useRef("");
    const interimRef = useRef("");
    const manualStopRef = useRef(false);

    const isSessionActive = useRef(false);

    useEffect(() => {
        codeRef.current = code;
    }, [code]);

    // Keep the editor language in sync with the arena: SQL/DevOps force a fixed
    // language, and switching away from one resets a now-invalid leftover.
    useEffect(() => {
        const fixed = fixedLanguageFor(mode);
        const next = fixed ?? (LANGUAGES.some((l) => l.id === language) ? language : 'javascript');
        if (next !== language) {
            setLanguage(next);
            setCode(starterFor(next));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // Auto-scroll the chat to the newest message / typing indicator
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isAiThinking]);

    // Session timer — runs while connected
    useEffect(() => {
        if (!isConnected) return;
        setElapsed(0);
        const t = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(t);
    }, [isConnected]);

    const cleanTextForSpeech = (text: string) => {
        return text.replace(/[*#`]/g, '');
    };

    const speakText = (text: string) => {
        if (!isSessionActive.current) return;

        stopSpeaking();

        const cleanText = cleanTextForSpeech(text);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US';
        pendingUtteranceRef.current = utterance; 

        utterance.onstart = () => {
            if (!isSessionActive.current || pendingUtteranceRef.current !== utterance) {
                window.speechSynthesis.cancel();
                setIsAiSpeaking(false);
                return;
            }
            setIsAiSpeaking(true);
        };

        utterance.onend = () => {
            pendingUtteranceRef.current = null;
            setIsAiSpeaking(false);
        };
        utterance.onerror = () => {
            pendingUtteranceRef.current = null;
            setIsAiSpeaking(false);
        };

        speechTimeoutRef.current = setTimeout(() => {
            speechTimeoutRef.current = null;
            if (isSessionActive.current) {
                window.speechSynthesis.speak(utterance);
            }
        }, 100);
    };

    const stopSpeaking = () => {
        if (speechTimeoutRef.current !== null) {
            clearTimeout(speechTimeoutRef.current);
            speechTimeoutRef.current = null;
        }

        pendingUtteranceRef.current = null;

        if (window.speechSynthesis.paused || window.speechSynthesis.pending || window.speechSynthesis.speaking) {
            window.speechSynthesis.resume();
            window.speechSynthesis.cancel();
        }

        setIsAiSpeaking(false);
    };

    const toggleMic = () => {
        stopSpeaking();

        if (!recognitionRef.current) return;

        if (isListening) {
            // User is done thinking/talking — finalize & send (handled in onend)
            manualStopRef.current = true;
            try { recognitionRef.current.stop(); } catch { /* already stopped */ }
        } else {
            // Fresh capture; stays open through pauses until STOP is pressed
            manualStopRef.current = false;
            finalTranscriptRef.current = "";
            interimRef.current = "";
            setPreviewText("");
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch { /* already started */ }
        }
    };

    const sendToBackend = async (text: string) => {
        setMessages(prev => [...prev, { sender: 'user', text: text }]);
        setIsAiThinking(true);

        if (connection) {
            try {
                await connection.invoke("ProcessUserAudio", {
                    text: text,
                    currentCode: codeRef.current,
                    mode: mode
                });
            } catch (error) {
                console.error("Error sending data:", error);
                setIsAiThinking(false);
            }
        }
    };

    const handleSendText = () => {
        if (!chatInput.trim()) return; 

        sendToBackend(chatInput);

        setChatInput("");
    };

    const startInterview = async () => {
        try {
            isSessionActive.current = true;

            const newConnection = new signalR.HubConnectionBuilder()
                .withUrl(`${API_URL}/interviewHub`)
                .withAutomaticReconnect()
                .build();

            newConnection.on("ReceiveSystemStatus", (msg: string) => {
                console.log(msg);
                setIsAiThinking(true);
            });

            newConnection.on("ReceiveAiResponse", (response: AiResponse) => {
                setIsAiThinking(false);
                if (!isSessionActive.current) return;

                setMessages(prev => [...prev, { sender: 'ai', text: response.message }]);
                speakText(response.message);
            });

            await newConnection.start();
            setConnection(newConnection);
            setIsConnected(true);

            if (newConnection.state === signalR.HubConnectionState.Connected) {

                let initialMessage = `I am ready for the ${mode} interview in ${language}.`;

                if (mode === "Resume" && resumeText) {
                    initialMessage = `Hello. I have uploaded my resume. Please ask me a deep, technical question about a specific project or technology listed in my resume. \n\n--- MY RESUME ---\n${resumeText}`;
                }

                await newConnection.invoke("ProcessUserAudio", {
                    text: initialMessage,
                    currentCode: codeRef.current,
                    mode: mode
                });
            }

        } catch (error) {
            console.error(error);
            showToast('Backend not running! Check the .NET console.', 'error');
            isSessionActive.current = false;
        }
    };

    const endSession = async () => {
        isSessionActive.current = false;
        stopSpeaking();

        // Stop voice capture without restarting
        manualStopRef.current = true;
        try { recognitionRef.current?.stop(); } catch { /* noop */ }
        setIsListening(false);
        setIsAiThinking(false);

        const watchdog = setInterval(() => {
            window.speechSynthesis.cancel();
            setIsAiSpeaking(false);
        }, 50);
        setTimeout(() => clearInterval(watchdog), 1000);

        setIsConnected(false);
        setIsLoadingFeedback(true);

        if (connection) {
            connection.off("ReceiveAiResponse");
            connection.off("ReceiveSystemStatus");

            try {
                const report = await connection.invoke<InterviewFeedback>("EndSession");
                setFeedback(report);
                saveRecord({
                    mode,
                    language,
                    codingScore: report.codingScore,
                    communicationScore: report.communicationScore,
                    feedbackPoints: report.feedbackPoints ?? [],
                });
            } catch (e) {
                console.error("Error getting feedback:", e);
            }

            await connection.stop();
        }
        setIsLoadingFeedback(false);
    };

    // Full teardown when leaving mid-session (so the AI doesn't keep talking on the home page).
    const exitToHome = () => {
        isSessionActive.current = false;
        manualStopRef.current = true;
        stopSpeaking();

        // Aggressively cancel TTS for a moment to defeat Chrome's resume quirk.
        const watchdog = setInterval(() => {
            window.speechSynthesis.resume();
            window.speechSynthesis.cancel();
        }, 60);
        setTimeout(() => clearInterval(watchdog), 1500);

        try { recognitionRef.current?.stop(); } catch { /* noop */ }
        if (connection) {
            connection.off("ReceiveAiResponse");
            connection.off("ReceiveSystemStatus");
            connection.stop();
        }
        setIsListening(false);
        setIsAiThinking(false);
        navigate('/');
    };

    const runCode = async () => {
        setIsRunning(true);
        setConsoleOpen(true);
        setOutput("Running...");

        try {
            const response = await fetch(`${API_URL}/api/code/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language: language,
                    code: codeRef.current
                })
            });

            const data = await response.json();

            if (data.error) {
                setOutput(`❌ Error:\n${data.error}`);
            } else {
                setOutput(data.output || "No output returned.");
            }
        } catch (e) {
            console.error("Failed to connect to execution server.", e);
        }
        setIsRunning(false);
    };
    runCodeRef.current = runCode; // keep the Ctrl+Enter shortcut pointing at the latest

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(codeRef.current);
            showToast('Code copied to clipboard', 'success');
        } catch {
            showToast('Could not copy code', 'error');
        }
    };

    const resetCode = () => {
        setCode("// Start coding...\n");
        showToast('Editor reset', 'info');
    };

    const handleEditorMount = (editor: any, monaco: any) => {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runCodeRef.current());
    };


    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;      // stay open across pauses
            recognitionRef.current.lang = 'en-US';
            recognitionRef.current.interimResults = true;  // live preview while speaking

            recognitionRef.current.onstart = () => console.log("🎤 Mic started, listening...");

            recognitionRef.current.onresult = (event: any) => {
                let interim = "";
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const chunk = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscriptRef.current += chunk + " ";
                    } else {
                        interim += chunk;
                    }
                }
                interimRef.current = interim;
                setPreviewText((finalTranscriptRef.current + interim).trim());
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("🎤 Speech recognition error:", event.error);
                if (event.error === 'no-speech' || event.error === 'aborted') {
                    // Silence during a thinking pause — keep alive (onend restarts the mic)
                    return;
                }
                // Fatal errors: stop the capture and inform the user
                manualStopRef.current = true;
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    showToast("Microphone permission is blocked. Allow mic access for this site and try again.", 'error');
                } else if (event.error === 'network') {
                    showToast("Speech recognition needs an internet connection (it uses the browser's online service).", 'error');
                }
            };

            recognitionRef.current.onend = () => {
                // Browser auto-stopped (e.g. long silence) but user hasn't pressed STOP:
                // restart so the mic stays open while they think.
                if (!manualStopRef.current) {
                    try {
                        recognitionRef.current.start();
                        return;
                    } catch {
                        // fall through to finalize if restart fails
                    }
                }

                // User pressed STOP (or fatal error): finalize and send once.
                const text = (finalTranscriptRef.current + " " + interimRef.current).trim();
                finalTranscriptRef.current = "";
                interimRef.current = "";
                setPreviewText("");
                setIsListening(false);
                if (text) sendToBackend(text);
            };
        } else {
            console.error("🎤 SpeechRecognition not supported in this browser. Use Chrome or Edge.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connection]);

    //  Cleanup Effect
    useEffect(() => {
        return () => {
            manualStopRef.current = true;
            window.speechSynthesis.cancel();
            try { recognitionRef.current?.stop(); } catch { /* noop */ }
            if (connection) connection.stop();
        };
    }, [connection]);

    return (
        <div className="iv-container">

            {/* PRE-SESSION SETUP LOBBY */}
            {!isConnected && (
                <div className="iv-lobby">
                    <div className="iv-lobby-card fade-in">
                        <button className="iv-lobby-back" onClick={() => navigate('/')}>← Back home</button>
                        <h1>Set up your interview</h1>
                        <p className="iv-lobby-sub">Choose who interviews you and the language you'll code in.</p>

                        <label className="field-label">Interview mode</label>
                        <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
                            <option value="Standard">Standard</option>
                            {ARENAS.filter((a) => !a.resume).map((a) => (
                                <option key={a.id} value={a.id}>{a.title}</option>
                            ))}
                        </select>

                        <div className="iv-lobby-persona">
                            <div className="persona-avatar">{personaFor(mode).emoji}</div>
                            <div className="persona-info">
                                <div className="persona-name">{personaFor(mode).name}</div>
                                <div className="persona-tag">{personaFor(mode).tagline}</div>
                            </div>
                        </div>

                        {!isCodingMode(mode) ? (
                            <div className="iv-lobby-note">💬 Conversation only — this mode has no coding.</div>
                        ) : fixedLanguageFor(mode) ? (
                            <div className="iv-lobby-note">🔒 Language fixed to {LANG_LABEL[fixedLanguageFor(mode)!]} for this arena.</div>
                        ) : (
                            <>
                                <label className="field-label">Language</label>
                                <select
                                    className="select"
                                    value={language}
                                    onChange={(e) => { setLanguage(e.target.value); setCode(starterFor(e.target.value)); }}
                                >
                                    {LANGUAGES.map((l) => (
                                        <option key={l.id} value={l.id}>{l.label}</option>
                                    ))}
                                </select>
                            </>
                        )}

                        {mode === 'Resume' && resumeText && (
                            <div className="iv-lobby-resume">📄 Resume loaded ✓</div>
                        )}

                        <button className="btn btn-primary btn-lg btn-block" onClick={startInterview} style={{ marginTop: 'var(--s-5)' }}>
                            ● Start interview →
                        </button>

                        <p className="iv-lobby-hint">
                            {VOICE_SUPPORTED
                                ? '💡 Voice works best in Chrome or Edge on desktop.'
                                : "🎙️ This browser doesn't support voice — you'll type your answers (works the same)."}
                        </p>
                    </div>
                </div>
            )}

            {/* LEFT PANE: EDITOR (hidden for conversation-only modes like System Design / Amazon) */}
            {isCodingMode(mode) && (
            <div className="iv-editor-pane">
                <div className="iv-toolbar">
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={exitToHome}
                    >
                        ← Exit
                    </button>

                    <div className="divider" />

                    <span className="iv-lang-badge">{LANG_LABEL[language] ?? language}</span>

                    <div className="spacer" />

                    <button className="btn btn-ghost btn-sm" onClick={copyCode} title="Copy code">
                        ⧉ Copy
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={resetCode} title="Reset editor">
                        ↺ Reset
                    </button>

                    {/* RUN BUTTON */}
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={runCode}
                        disabled={isRunning}
                        title="Run (Ctrl+Enter)"
                    >
                        {isRunning ? 'Running…' : '▶ Run'}
                    </button>
                </div>

                <div className="iv-editor-wrap">
                    <Editor
                        height="100%"
                        language={language}
                        theme="mockmate-dark"
                        value={code}
                        onChange={(val) => setCode(val || "")}
                        beforeMount={defineMockmateTheme}
                        onMount={handleEditorMount}
                        options={{
                            automaticLayout: true, // re-measure on container resize (fixes collapsed editor on mobile / layout changes)
                            minimap: { enabled: false },
                            fontSize: 15,
                            padding: { top: 16 },
                            smoothScrolling: true,
                            cursorBlinking: 'smooth',
                            fontLigatures: true,
                            fontFamily: "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
                            scrollBeyondLastLine: false,
                            roundedSelection: true,
                        }}
                    />
                </div>

                <div className={`iv-terminal ${consoleOpen ? '' : 'collapsed'}`}>
                    <button
                        className="iv-terminal-head"
                        onClick={() => setConsoleOpen((o) => !o)}
                        aria-expanded={consoleOpen}
                        aria-label={consoleOpen ? 'Collapse console' : 'Expand console'}
                    >
                        <span className="iv-terminal-label">
                            <span className="dot" aria-hidden="true" /> Console
                        </span>
                        <span className="iv-terminal-chevron" aria-hidden="true">{consoleOpen ? '▾' : '▸'}</span>
                    </button>
                    {consoleOpen && (
                        <pre className={`iv-terminal-body ${output.startsWith('❌') ? 'error' : ''}`}>
                            {output || "› Ready to run code…"}
                        </pre>
                    )}
                </div>
            </div>
            )}

            {/* RIGHT PANE: CHAT */}
            <div className={`iv-chat-pane ${!isCodingMode(mode) ? 'iv-chat-pane-full' : ''}`}>
                {isConnected && (
                    <div className="persona-header">
                        <div className="persona-avatar">{personaFor(mode).emoji}</div>
                        <div className="persona-info">
                            <div className="persona-name">{personaFor(mode).name}</div>
                            <div className="persona-tag">{personaFor(mode).tagline}</div>
                        </div>
                        <div className="persona-right">
                            <span className="session-status"><span className="live-dot" /> {formatTime(elapsed)}</span>
                            <button className="btn btn-danger btn-sm" onClick={endSession}>■ End</button>
                        </div>
                    </div>
                )}

                <div className="chat-log">
                    {messages.length === 0 && (
                        <div className="chat-empty">Start a session to begin the conversation.</div>
                    )}

                    {messages.map((m, i) => (
                        <div key={i} className={`message ${m.sender}`}>
                            <span className="sender">{m.sender}</span>
                            {m.sender === 'ai' ? (
                                <div className="markdown">
                                    <ReactMarkdown>{m.text}</ReactMarkdown>
                                </div>
                            ) : (
                                <div>{m.text}</div>
                            )}
                        </div>
                    ))}

                    {isAiThinking && (
                        <div className="message ai thinking">
                            <span className="sender">ai</span>
                            <span className="typing"><i /><i /><i /></span>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {/* CHAT INPUT */}
                <div className="chat-input-row">
                    <input
                        type="text"
                        className="input"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendText();
                        }}
                        disabled={!isConnected}
                        placeholder={isConnected ? "Type a message and press Enter…" : "Connect to chat…"}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleSendText}
                        disabled={!isConnected || !chatInput.trim()}
                    >
                        Send
                    </button>
                </div>

                {/* 3. VISUALIZER & MIC AREA */}
                <div className="voice-panel">
                    {!isConnected ? (
                        <div className="voice-disconnected">Connect to start speaking</div>
                    ) : !VOICE_SUPPORTED ? (
                        <div className="voice-note">
                            🎙️ Voice isn't supported on this browser (e.g. iPhone / Safari).
                            <strong> Type your answers in the box above</strong> — the interview works exactly the same.
                        </div>
                    ) : (
                        <>
                            <AudioVisualizer isListening={isListening} isSpeaking={isAiSpeaking} />

                            <button
                                className={`mic-button ${isListening ? 'mic-active' : 'mic-inactive'}`}
                                onClick={toggleMic}
                                aria-label={isListening ? 'Stop recording and send' : 'Start recording'}
                                aria-pressed={isListening}
                            >
                                {isListening ? 'STOP' : 'MIC'}
                            </button>

                            <div className={`voice-status ${isListening ? 'listening' : (isAiSpeaking ? 'speaking' : '')}`}>
                                {isListening
                                    ? "Listening… take your time, click STOP to send"
                                    : (isAiSpeaking ? "AI is speaking…" : "Click to speak")}
                            </div>

                            {isListening && previewText && (
                                <div className="voice-preview">{previewText}</div>
                            )}

                            {/* INTERRUPT BUTTON */}
                            {isAiSpeaking && (
                                <button className="btn btn-danger btn-sm" onClick={stopSpeaking}>
                                    🛑 Stop Audio
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* FEEDBACK REPORT MODAL */}
                {(feedback || isLoadingFeedback) && (
                    <div className="modal-overlay">
                        {isLoadingFeedback ? (
                            <div className="report-loading" role="status">
                                <div className="spinner" aria-hidden="true" />
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Generating your report card…</div>
                            </div>
                        ) : (
                            <div className="report" role="dialog" aria-modal="true" aria-label="Interview results">
                                <h1>Interview Results</h1>
                                <p className="report-sub">Here's how the session went.</p>

                                <div className="score-row">
                                    <div className="score-card">
                                        <div className={`score-value ${feedback?.codingScore && feedback.codingScore >= 7 ? 'good' : 'bad'}`}>
                                            {feedback?.codingScore}<span style={{ fontSize: '1.2rem', color: 'var(--text-3)' }}>/10</span>
                                        </div>
                                        <div className="score-label">Coding</div>
                                    </div>
                                    <div className="score-card">
                                        <div className={`score-value ${feedback?.communicationScore && feedback.communicationScore >= 7 ? 'good' : 'bad'}`}>
                                            {feedback?.communicationScore}<span style={{ fontSize: '1.2rem', color: 'var(--text-3)' }}>/10</span>
                                        </div>
                                        <div className="score-label">Communication</div>
                                    </div>
                                </div>

                                <div className="feedback-box">
                                    <h3>📝 Feedback</h3>
                                    <ul>
                                        {feedback?.feedbackPoints.map((point, i) => (
                                            <li key={i}>{point}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
                                    <button className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={() => navigate('/')}>
                                        🏠 Home
                                    </button>
                                    <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => navigate('/dashboard')}>
                                        📊 View Dashboard
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Interview;