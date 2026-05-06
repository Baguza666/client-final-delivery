"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { MessageCircle, X, Send, Sparkles, Database, AlertCircle, Trash2 } from "lucide-react";

const STORAGE_KEY = "invoicify_chat_history";

function getMessageText(parts: ReadonlyArray<{ type: string }>): string {
    return parts
        .filter((p) => p.type === "text")
        .map((p) => (p as { type: "text"; text: string }).text)
        .join("");
}

// Strip raw JSON blobs that small models sometimes leak into their text response.
// Only removes JSON structures that appear after natural-language prose; leaves
// intentional code examples (surrounded by backticks) untouched.
function sanitizeAssistantText(text: string): string {
    // Remove a JSON object or array that appears after a sentence/line, not inside backticks
    return text
        .replace(/(?<![`])\s*[\[{][\s\S]*?[\]}]\s*$/g, "")
        .trim();
}

function hasPendingTool(parts: ReadonlyArray<{ type: string }>): boolean {
    return parts.some((p) => {
        if (!p.type.startsWith("tool-") && p.type !== "dynamic-tool") return false;
        const state = (p as { state?: string }).state;
        return state === "input-streaming" || state === "input-available";
    });
}

// When the model calls a tool but generates no follow-up text, extract any
// confirmPrompt from the tool output so the user sees something.
function getToolFallbackText(parts: ReadonlyArray<{ type: string }>): string {
    for (const p of parts) {
        if (!p.type.startsWith("tool-")) continue;
        const tp = p as { state?: string; output?: unknown };
        if (tp.state === "output-available" && tp.output && typeof tp.output === "object") {
            const out = tp.output as Record<string, unknown>;
            if (typeof out.confirmPrompt === "string") return out.confirmPrompt;
            if (typeof out.error === "string") return `Erreur : ${out.error}`;
        }
    }
    return "";
}

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { messages, sendMessage, status, error, setMessages } = useChat();

    const isLoading = status === "submitted" || status === "streaming";

    // Load history from localStorage after mount (useEffect runs only on client)
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed);
                }
            }
        } catch {
            // ignore corrupt storage
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist messages to localStorage whenever they change
    useEffect(() => {
        try {
            if (messages.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {
            // ignore quota errors
        }
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const text = input.trim();
        if (!text || isLoading) return;
        setInput("");
        await sendMessage({ text });
    }

    function handleClear() {
        setMessages([]);
        localStorage.removeItem(STORAGE_KEY);
    }

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end print:hidden">
            {isOpen && (
                <div className="w-96 h-[500px] bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col mb-4 overflow-hidden">
                    <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-white" />
                            </div>
                            <h3 className="text-white font-medium text-sm">Assistant Invoicify</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {messages.length > 0 && !isLoading && (
                                <button
                                    onClick={handleClear}
                                    className="text-slate-400 hover:text-rose-400 transition-colors"
                                    aria-label="Effacer l'historique"
                                    title="Effacer l'historique"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                                aria-label="Fermer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                        {messages.length === 0 && !error && (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-indigo-400" />
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Bonjour ! Je suis votre assistant Invoicify. Comment puis-je vous aider ?
                                </p>
                            </div>
                        )}

                        {messages.map((m) => {
                            const rawText = getMessageText(m.parts ?? []);
                            const text = m.role === "assistant" ? sanitizeAssistantText(rawText) : rawText;
                            const pending = hasPendingTool(m.parts ?? []);
                            // Fallback: if model called a tool but produced no text, show the tool output directly
                            const fallback = !text && !pending && m.role === "assistant" ? getToolFallbackText(m.parts ?? []) : "";

                            return (
                                <div key={m.id} className="flex flex-col gap-2">
                                    {pending && (
                                        <div className="flex justify-start">
                                            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-indigo-400">
                                                <Database className="w-3 h-3 shrink-0 animate-pulse" />
                                                <span>Consultation des données…</span>
                                            </div>
                                        </div>
                                    )}

                                    {(text || fallback) && (
                                        <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                                                    m.role === "user"
                                                        ? "bg-indigo-600 text-white rounded-br-sm"
                                                        : "bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-sm"
                                                }`}
                                            >
                                                {text || fallback}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {error && (
                            <div className="flex justify-start">
                                <div className="flex items-start gap-2 bg-rose-950/60 border border-rose-800/60 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-rose-300 max-w-[85%]">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div className="flex flex-col gap-1 min-w-0">
                                        <span className="font-medium">Erreur</span>
                                        <span className="text-xs text-rose-300/80 break-words whitespace-pre-wrap">
                                            {error.message || "Erreur inconnue. Veuillez réessayer."}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isLoading && !messages.some((m) => hasPendingTool(m.parts ?? [])) && (
                            <div className="flex justify-start">
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-sm px-3 py-2">
                                    <div className="flex gap-1 items-center h-4">
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800 flex gap-2 shrink-0">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Posez votre question..."
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
                            aria-label="Envoyer"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg shadow-indigo-500/20 transition-transform hover:scale-105"
                    aria-label="Ouvrir l'assistant"
                >
                    <MessageCircle className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}
