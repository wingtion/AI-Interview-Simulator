/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import Editor from '@monaco-editor/react';
import AudioVisualizer from '../components/AudioVisualizer';
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

function Interview() {
    const { modeParam } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // --- STATE ---
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [code, setCode] = useState<string>("// Select Language, Click Start, then use the Mic...\n");
    const [mode, setMode] = useState<string>(modeParam || "Standard");
    const [language, setLanguage] = useState<string>("javascript");
    const [isAiSpeaking, setIsAiSpeaking] = useState(false); 
    const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const resumeText = location.state?.resumeText || "";

    // Execution State
    const [output, setOutput] = useState<string>("");
    const [isRunning, setIsRunning] = useState(false);

    // Feedback State
    const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

    // Question Bank State
    const [topic, setTopic] = useState("Arrays");
    const [isGenerating, setIsGenerating] = useState(false);

    const [chatInput, setChatInput] = useState("");

    const codeRef = useRef<string>(code);
    const recognitionRef = useRef<any>(null);

    const isSessionActive = useRef(false);

    useEffect(() => {
        codeRef.current = code;
    }, [code]);

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
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const sendToBackend = async (text: string) => {
        setMessages(prev => [...prev, { sender: 'user', text: text }]);

        if (connection) {
            try {
                await connection.invoke("ProcessUserAudio", {
                    text: text,
                    currentCode: codeRef.current,
                    mode: mode
                });
            } catch (error) {
                console.error("Error sending data:", error);
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
                .withUrl("http://localhost:5000/interviewHub")
                .withAutomaticReconnect()
                .build();

            newConnection.on("ReceiveSystemStatus", (msg: string) => {
                console.log(msg);
            });

            newConnection.on("ReceiveAiResponse", (response: AiResponse) => {
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
            alert('Backend not running! Check .NET console.');
            isSessionActive.current = false; 
        }
    };

    const endSession = async () => {
        isSessionActive.current = false;
        stopSpeaking();

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
            } catch (e) {
                console.error("Error getting feedback:", e);
            }

            await connection.stop();
        }
        setIsLoadingFeedback(false);
    };

    const runCode = async () => {
        setIsRunning(true);
        setOutput("Running...");

        try {
            const response = await fetch("http://localhost:5000/api/code/run", {
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

    // GENERATE PROBLEM LOGIC
    const generateProblem = async () => {
        setIsGenerating(true);
        setCode("// Generating problem from AI...\n" + codeRef.current);

        try {
            const response = await fetch(`http://localhost:5000/api/problem/generate?topic=${topic}&difficulty=Medium`);
            const data = await response.json();

            // Put the problem description at the TOP of the editor
            setCode(data.problem + "\n\n// --------------------------\n// YOUR SOLUTION:\n\n" + codeRef.current);
        } catch (e) {
            console.error(e);
            setOutput("Error generating problem.");
        }
        setIsGenerating(false);
    };

    
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.lang = 'en-US';
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                sendToBackend(transcript);
            };

            recognitionRef.current.onend = () => setIsListening(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connection]);

    //  Cleanup Effect
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
            if (connection) connection.stop();
        };
    }, [connection]);

    return (
        <div className="container">

            {/* LEFT PANE: EDITOR */}
            <div className="editor-pane">
                <div className="header" style={{ background: '#252526', borderBottom: '1px solid #333', justifyContent: 'flex-start', gap: '10px' }}>
                    <button
                        onClick={() => { stopSpeaking(); navigate('/'); }}
                        style={{ background: '#444', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer' }}
                    >
                        ← Exit
                    </button>

                    <select
                        value={language}
                        onChange={(e) => { setLanguage(e.target.value); setCode("// Start coding...\n"); }}
                        style={{ background: '#3c3c3c', color: 'white', border: '1px solid #555', fontSize: '0.8rem' }}
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="csharp">C#</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                    </select>

                    <span style={{ color: '#555' }}>|</span>

                    {/* 🆕 TOPIC SELECTOR */}
                    <select
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        style={{ background: '#3c3c3c', color: 'white', border: '1px solid #555', fontSize: '0.8rem' }}
                    >
                        <option value="Arrays">Arrays</option>
                        <option value="Strings">Strings</option>
                        <option value="LinkedLists">Linked Lists</option>
                        <option value="Trees">Trees</option>
                        <option value="DynamicProgramming">DP</option>
                    </select>

                    {/*  GENERATE BUTTON */}
                    <button
                        onClick={generateProblem}
                        disabled={isGenerating}
                        style={{
                            background: '#d35400', color: 'white', border: 'none',
                            padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem'
                        }}
                    >
                        {isGenerating ? '...' : '🎲 Generate Problem'}
                    </button>

                    {/* RUN BUTTON */}
                    <button
                        onClick={runCode}
                        disabled={isRunning}
                        style={{
                            marginLeft: 'auto',
                            background: isRunning ? '#555' : '#28a745',
                            color: 'white', border: 'none', padding: '5px 15px',
                            cursor: isRunning ? 'wait' : 'pointer', fontWeight: 'bold'
                        }}
                    >
                        {isRunning ? 'Running...' : '▶ Run'}
                    </button>
                </div>

                <div style={{ flex: 2, minHeight: '300px' }}>
                    <Editor
                        height="100%"
                        language={language}
                        theme="vs-dark"
                        value={code}
                        onChange={(val) => setCode(val || "")}
                        options={{ minimap: { enabled: false }, fontSize: 16 }}
                    />
                </div>

                <div style={{
                    flex: 1,
                    background: '#1e1e1e',
                    borderTop: '2px solid #333',
                    padding: '10px',
                    fontFamily: 'monospace',
                    overflowY: 'auto'
                }}>
                    <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '5px' }}>TERMINAL OUTPUT</div>
                    <pre style={{ margin: 0, color: output.startsWith('❌') ? '#ff4444' : '#ddd', whiteSpace: 'pre-wrap' }}>
                        {output || "> Ready to run code..."}
                    </pre>
                </div>
            </div>

            {/* RIGHT PANE: CHAT */}
            <div className="chat-pane">
                <div className="controls">
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa' }}>Target Company:</label>
                        <select
                            disabled={isConnected}
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                            style={{ width: '100%', marginTop: '5px', padding: '10px' }}
                        >
                            <option value="Standard">Standard</option>
                            <option value="Google">Google (Algorithms)</option>
                            <option value="Startup">Startup (Speed)</option>
                            <option value="Behavioral">Behavioral (HR)</option>
                        </select>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                        {!isConnected ? (
                            <button className="btn-start" onClick={startInterview}>START SESSION</button>
                        ) : (
                            <button className="btn-stop" onClick={endSession}>END SESSION</button>
                        )}
                    </div>
                </div>

                <div className="chat-log">
                    {messages.length === 0 && <div style={{ color: '#555', textAlign: 'center', marginTop: '20px' }}>Ready...</div>}

                    {messages.map((m, i) => (
                        <div key={i} className={`message ${m.sender}`}>
                            <strong>{m.sender.toUpperCase()}:</strong>
                            <div style={{ marginTop: '5px' }}>{m.text}</div>
                        </div>
                    ))}
                </div>

                {/*  */}
                <div style={{ display: 'flex', gap: '10px', padding: '10px 0', borderTop: '1px solid #333' }}>
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendText();
                        }}
                        disabled={!isConnected}
                        placeholder={isConnected ? "Type a message and press Enter..." : "Connect to chat..."}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '8px',
                            border: '1px solid #444', background: '#121212', color: 'white',
                            outline: 'none', fontSize: '0.9rem'
                        }}
                    />
                    <button
                        onClick={handleSendText}
                        disabled={!isConnected || !chatInput.trim()}
                        style={{
                            padding: '0 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold',
                            background: isConnected && chatInput.trim() ? '#44ff44' : '#333',
                            color: isConnected && chatInput.trim() ? 'black' : '#666',
                            cursor: isConnected && chatInput.trim() ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s'
                        }}
                    >
                        Send
                    </button>
                </div>
                {/* ------------------------------------- */}

                {/* 3. VISUALIZER & MIC AREA */}
                <div style={{
                    // 🛑 Removed fixed height! Added flex-shrink: 0 so it doesn't get crushed
                    flexShrink: 0,
                    padding: '20px 0', // Let padding dictate the breathing room
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderTop: '1px solid #333'
                }}>

                    {isConnected ? (
                        <>
                            {/* THE WAVEFORM */}
                            <div style={{ marginBottom: '15px' }}>
                                <AudioVisualizer isListening={isListening} isSpeaking={isAiSpeaking} />
                            </div>

                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <button
                                    className={`mic-button ${isListening ? 'mic-active' : 'mic-inactive'}`}
                                    onClick={toggleMic}
                                >
                                    {isListening ? 'STOP' : 'MIC'}
                                </button>

                                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: isListening ? '#ff4444' : '#888' }}>
                                    {isListening ? "Listening..." : (isAiSpeaking ? "AI is Speaking..." : "Click to Speak")}
                                </div>

                                {/* INTERRUPT BUTTON */}
                                {isAiSpeaking && (
                                    <button
                                        onClick={stopSpeaking}
                                        style={{
                                            marginTop: '12px', background: '#2a1111', color: '#ff4444',
                                            border: '1px solid #551111', padding: '6px 12px',
                                            borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem',
                                            fontWeight: 'bold', transition: 'all 0.2s',
                                            boxShadow: '0 2px 8px rgba(255,0,0,0.1)'
                                        }}
                                    >
                                        🛑 Stop Audio
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ color: '#666', padding: '30px 0' }}>Connect to start speaking</div>
                    )}
                </div>

                {/* MODAL */}
                {(feedback || isLoadingFeedback) && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                        zIndex: 1000
                    }}>
                        {isLoadingFeedback ? (
                            <div style={{ color: 'white', fontSize: '2rem' }}>📊 Generating Report Card...</div>
                        ) : (
                            <div style={{
                                backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '12px',
                                border: '2px solid #44ff44', width: '500px', textAlign: 'center',
                                boxShadow: '0 0 50px rgba(68,255,68,0.2)'
                            }}>
                                <h1 style={{ color: '#fff', marginBottom: '20px' }}>Interview Results</h1>

                                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '30px' }}>
                                    <div>
                                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: feedback?.codingScore && feedback.codingScore >= 7 ? '#44ff44' : '#ff4444' }}>
                                            {feedback?.codingScore}/10
                                        </div>
                                        <div style={{ color: '#aaa' }}>Coding</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: feedback?.communicationScore && feedback.communicationScore >= 7 ? '#44ff44' : '#ff4444' }}>
                                            {feedback?.communicationScore}/10
                                        </div>
                                        <div style={{ color: '#aaa' }}>Communication</div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'left', background: '#252526', padding: '20px', borderRadius: '8px' }}>
                                    <h3 style={{ marginTop: 0, color: '#ddd' }}>📝 Feedback:</h3>
                                    <ul style={{ color: '#ccc', lineHeight: '1.6' }}>
                                        {feedback?.feedbackPoints.map((point, i) => (
                                            <li key={i}>{point}</li>
                                        ))}
                                    </ul>
                                </div>

                                <button
                                    onClick={() => navigate('/')}
                                    style={{
                                        marginTop: '30px', padding: '15px 30px', background: '#007acc',
                                        color: 'white', border: 'none', borderRadius: '5px', fontSize: '1.2rem', cursor: 'pointer'
                                    }}
                                >
                                    🏠 Back to Home
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Interview;