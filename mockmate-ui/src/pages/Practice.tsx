/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '../components/Toast';
import { defineMockmateTheme } from '../lib/editorTheme';
import { API_URL } from '../config';
import '../App.css';

const STARTER = "// Pick a topic, generate a problem, then solve it here…\n";

function Practice() {
    const navigate = useNavigate();
    const showToast = useToast();

    const [topic, setTopic] = useState('Arrays');
    const [difficulty, setDifficulty] = useState('Medium');
    const [language, setLanguage] = useState('javascript');
    const [problem, setProblem] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const [code, setCode] = useState(STARTER);
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [consoleOpen, setConsoleOpen] = useState(true);

    const codeRef = useRef(code);
    codeRef.current = code;
    const runCodeRef = useRef<() => void>(() => {});

    const generateProblem = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch(`${API_URL}/api/problem/generate?topic=${topic}&difficulty=${difficulty}`);
            const data = await res.json();
            setProblem(data.problem || 'No problem generated.');
        } catch (e) {
            console.error(e);
            showToast('Could not generate a problem. Is the backend running?', 'error');
        }
        setIsGenerating(false);
    };

    const runCode = async () => {
        setIsRunning(true);
        setConsoleOpen(true);
        setOutput('Running…');
        try {
            const res = await fetch(`${API_URL}/api/code/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language, code: codeRef.current }),
            });
            const data = await res.json();
            setOutput(data.error ? `❌ Error:\n${data.error}` : (data.output || 'No output returned.'));
        } catch (e) {
            console.error(e);
            setOutput('❌ Failed to reach the execution server.');
        }
        setIsRunning(false);
    };
    runCodeRef.current = runCode;

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(codeRef.current);
            showToast('Code copied to clipboard', 'success');
        } catch {
            showToast('Could not copy code', 'error');
        }
    };

    const resetCode = () => {
        setCode(STARTER);
        showToast('Editor reset', 'info');
    };

    const handleEditorMount = (editor: any, monaco: any) => {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runCodeRef.current());
    };

    return (
        <div className="iv-container">
            {/* LEFT: PROBLEM */}
            <div className="pr-problem-pane">
                <div className="iv-toolbar">
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Exit</button>

                    <div className="divider" />

                    <select className="select select-sm" style={{ width: 'auto' }} value={topic} onChange={(e) => setTopic(e.target.value)}>
                        <option value="Arrays">Arrays</option>
                        <option value="Strings">Strings</option>
                        <option value="LinkedLists">Linked Lists</option>
                        <option value="Trees">Trees</option>
                        <option value="Graphs">Graphs</option>
                        <option value="DynamicProgramming">DP</option>
                    </select>

                    <select className="select select-sm" style={{ width: 'auto' }} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                    </select>

                    <button className="btn btn-primary btn-sm spacer" onClick={generateProblem} disabled={isGenerating}>
                        {isGenerating ? 'Generating…' : (problem ? '🎲 New problem' : '🎲 Generate')}
                    </button>
                </div>

                <div className="pr-problem-body">
                    {isGenerating ? (
                        <div className="pr-skeleton" aria-hidden="true">
                            <div className="sk-line sk-title" />
                            <div className="sk-line" />
                            <div className="sk-line" />
                            <div className="sk-line short" />
                            <div className="sk-block" />
                            <div className="sk-line" />
                            <div className="sk-line short" />
                        </div>
                    ) : problem ? (
                        <div className="markdown pr-markdown">
                            <ReactMarkdown>{problem}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="pr-empty">
                            <div className="pr-empty-icon">🧩</div>
                            <h2>Generate a problem to begin</h2>
                            <p>Pick a topic and difficulty above, then hit Generate. Solve it in the editor and run your code.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: EDITOR + CONSOLE */}
            <div className="iv-editor-pane">
                <div className="iv-toolbar">
                    <select
                        className="select select-sm"
                        style={{ width: 'auto' }}
                        value={language}
                        onChange={(e) => { setLanguage(e.target.value); setCode(STARTER); }}
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="csharp">C#</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                    </select>

                    <div className="spacer" />

                    <button className="btn btn-ghost btn-sm" onClick={copyCode} title="Copy code">⧉ Copy</button>
                    <button className="btn btn-ghost btn-sm" onClick={resetCode} title="Reset editor">↺ Reset</button>
                    <button className="btn btn-primary btn-sm" onClick={runCode} disabled={isRunning} title="Run (Ctrl+Enter)">
                        {isRunning ? 'Running…' : '▶ Run'}
                    </button>
                </div>

                <div className="iv-editor-wrap">
                    <Editor
                        height="100%"
                        language={language}
                        theme="mockmate-dark"
                        value={code}
                        onChange={(val) => setCode(val || '')}
                        beforeMount={defineMockmateTheme}
                        onMount={handleEditorMount}
                        options={{
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
                        <span className="iv-terminal-label"><span className="dot" aria-hidden="true" /> Console</span>
                        <span className="iv-terminal-chevron" aria-hidden="true">{consoleOpen ? '▾' : '▸'}</span>
                    </button>
                    {consoleOpen && (
                        <pre className={`iv-terminal-body ${output.startsWith('❌') ? 'error' : ''}`}>
                            {output || '› Ready to run code…'}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Practice;
