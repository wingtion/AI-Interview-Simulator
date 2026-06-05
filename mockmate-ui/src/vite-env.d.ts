/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
}