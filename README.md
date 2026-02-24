# MockMate - Real-Time AI Technical Interview Simulator

MockMate is a full-stack, low-latency AI interview simulator. It combines real-time voice-to-voice communication, a live code editor, and document parsing to replicate the exact pressure and environment of a FAANG-level technical interview.

## Key Features
* **🎙️ Live Voice Interaction:** Speak naturally with an AI interviewer using the Web Speech API and SignalR WebSockets. Supports "barge-in" (interrupting the AI).
* **💻 Live Code Evaluation:** The AI reads your code in real-time via the integrated Monaco Editor and critiques your Big-O time complexity.
* **🤖 AI Compiler:** Safely execute C#, Java, Python, and JavaScript directly in the browser using an AI-simulated code execution engine.
* **📄 Resume Grilling:** Upload a PDF resume. The .NET backend extracts the text using `PdfPig`, and the AI tailors its questions to your actual past projects.
* **📊 Automated Report Card:** Get an automated score (out of 10) on Coding and Communication, plus personalized feedback at the end of the session.

## 🛠️ Tech Stack
**Backend:**
* .NET 8 Web API
* Microsoft SignalR (Real-time WebSockets)
* UglyToad.PdfPig (PDF Parsing)

**Frontend:**
* React 18 + TypeScript + Vite
* Monaco Editor (VS Code engine)
* HTML5 Canvas (Audio Visualizer)

**AI & Engine:**
* Groq API (Llama-3 8b / 70b models) for ultra-low latency inference.

## Getting Started (Run Locally)

### Prerequisites
* .NET 8 SDK
* Node.js (v18+)
* A free Groq API Key

### 1. Backend Setup
Navigate to the API folder:
`cd MockMate.API`

Open `appsettings.json` and add your Groq API Key:
`"GroqApiKey": "gsk_your_real_key_here"`

Run the server:
`dotnet run`
*(The backend will start on http://localhost:5000)*

### 2. Frontend Setup
Open a new terminal window and navigate to the UI folder:
`cd mockmate-ui`

Install dependencies and start the development server:
`npm install`
`npm run dev`
*(The frontend will start on http://localhost:5173. Open this in your browser.)*

## Usage
1. Open the web app.
2. Click **Grill My Resume** to upload your CV, or select a standard mode (Google, Startup, Behavioral).
3. Select your programming language (C#, JS, Python, Java).
4. Use the **Mic** button to talk to the AI, and type your code in the editor.
5. Click **Run** to test your code.
6. Click **End Session** to receive your graded Report Card.
