"use client";

import { useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Send, Mic, Square, Sparkles, Loader2 } from "lucide-react";

type Turn = {
  question: string;
  narrative?: string;
  sql?: string;
  rows?: Record<string, unknown>[];
  provider?: string;
  error?: string;
};

const SUGGESTIONS = [
  "Which segment should get a WhatsApp win-back campaign this week?",
  "Who are our dormant customers by revenue at stake?",
  "What's the best time to send SMS campaigns?",
  "Which segment has the highest lifetime value?",
];

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [asking, setAsking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function ask(question: string) {
    if (!question.trim() || asking) return;
    setAsking(true);
    setTurns((t) => [...t, { question }]);
    setInput("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setTurns((t) => {
        const copy = [...t];
        copy[copy.length - 1] = {
          question,
          narrative: data.narrative,
          sql: data.sql,
          rows: data.rows,
          provider: data.provider,
          error: res.ok ? undefined : data.error,
        };
        return copy;
      });
    } catch (e) {
      setTurns((t) => {
        const copy = [...t];
        copy[copy.length - 1] = { question, error: (e as Error).message };
        return copy;
      });
    } finally {
      setAsking(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "audio/webm" },
            body: blob,
          });
          const data = await res.json();
          if (data.transcript) setInput((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
          else if (data.error) setInput((prev) => prev || "");
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setTurns((t) => [...t, { question: "(voice input)", error: "Microphone access was denied or unavailable." }]);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <PageHeader
        title="AI Assistant"
        subtitle="Ask a business question in plain English (or speak it) — it's turned into read-only SQL, executed live, and answered with a recommendation."
      />

      <div className="flex-1 overflow-y-auto card p-5 mb-4 space-y-5">
        {turns.length === 0 && (
          <div>
            <p className="text-sm text-muted mb-3">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface-2 hover:border-accent/50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className="space-y-2.5">
            <div className="flex justify-end">
              <div className="bg-accent/15 border border-accent/30 rounded-2xl rounded-tr-sm px-4 py-2 text-sm max-w-[80%]">
                {t.question}
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={13} />
              </div>
              <div className="flex-1 min-w-0">
                {t.error ? (
                  <p className="text-sm text-danger">{t.error}</p>
                ) : t.narrative === undefined ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 size={14} className="animate-spin" /> thinking…
                  </div>
                ) : (
                  <>
                    <p className="text-sm mb-2">{t.narrative}</p>
                    {t.sql && (
                      <details className="mb-2">
                        <summary className="text-xs text-muted cursor-pointer hover:text-foreground">
                          View generated SQL {t.provider && `· ${t.provider}`}
                        </summary>
                        <pre className="card-2 p-3 mt-1.5 text-xs mono overflow-x-auto whitespace-pre-wrap text-muted">
                          {t.sql}
                        </pre>
                      </details>
                    )}
                    {t.rows && t.rows.length > 0 && (
                      <div className="overflow-x-auto card-2 p-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-muted border-b border-border">
                              {Object.keys(t.rows[0]).map((k) => (
                                <th key={k} className="px-2 py-1.5 font-medium whitespace-nowrap">{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {t.rows.slice(0, 30).map((row, ri) => (
                              <tr key={ri} className="border-b border-border/40 last:border-0">
                                {Object.values(row).map((v, ci) => (
                                  <td key={ci} className="px-2 py-1.5 whitespace-nowrap">{String(v)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="card p-2.5 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={toggleRecording}
          disabled={transcribing}
          title={recording ? "Stop recording" : "Ask by voice"}
          className={`shrink-0 h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
            recording ? "bg-danger text-white" : "bg-surface-2 border border-border hover:border-accent/50"
          }`}
        >
          {transcribing ? <Loader2 size={15} className="animate-spin" /> : recording ? <Square size={14} /> : <Mic size={15} />}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about customers, segments, or campaigns…"
          className="flex-1 bg-transparent outline-none text-sm px-1"
        />
        <button
          type="submit"
          disabled={asking || !input.trim()}
          className="shrink-0 h-9 w-9 rounded-lg bg-accent text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {asking ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </form>
    </div>
  );
}
