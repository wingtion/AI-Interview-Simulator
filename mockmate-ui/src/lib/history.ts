// Client-side interview history (localStorage).
// Kept deliberately small so it can later be swapped for a real API without
// touching the dashboard UI — the function shapes stay the same.

export interface InterviewRecord {
    id: string;
    date: string; // ISO timestamp
    mode: string;
    language: string;
    topic?: string;
    difficulty?: string;
    codingScore: number;
    communicationScore: number;
    feedbackPoints: string[];
}

export type NewInterviewRecord = Omit<InterviewRecord, 'id' | 'date'>;

const STORAGE_KEY = 'mockmate.history.v1';

export function getHistory(): InterviewRecord[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as InterviewRecord[]) : [];
    } catch {
        return [];
    }
}

export function saveRecord(data: NewInterviewRecord): InterviewRecord {
    const record: InterviewRecord = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        date: new Date().toISOString(),
        ...data,
    };
    const list = [record, ...getHistory()];
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
        // storage full / unavailable — non-fatal
    }
    return record;
}

export function clearHistory(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* noop */
    }
}
