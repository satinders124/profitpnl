"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import {
  Send,
  Bot,
  User,
  Sparkles,
  BrainCircuit,
  Target,
  TrendingUp,
  Zap,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/components/providers/AuthProvider";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const SYSTEM_PROMPT =
  "You are an Elite Trading Performance Coach. Use Markdown formatting to make your responses professional. Use bold text for key trading concepts, risk rules, and psychological triggers. Be direct and high-impact.";

export default function AiCoachPage() {
  const { user, plan } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false); // waiting for first token
  const [isStreaming, setIsStreaming] = useState(false); // tokens actively arriving
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoScrollRef = useRef(true);

  const isFreePlan = plan === "Free Plan";

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setShowJumpToBottom(false);
  }, []);

  // Track whether the user has scrolled up (to stop auto-scroll while they
  // read history) and toggle the "jump to bottom" affordance.
  useEffect(() => {
    if (isFreePlan) return;
    const el = scrollRef.current;
    if (!el) return;

    function handleScroll() {
      if (!el) return;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      autoScrollRef.current = distanceFromBottom < 80;
      setShowJumpToBottom(distanceFromBottom > 200);
    }

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [isFreePlan]);

  useEffect(() => {
    if (isFreePlan) return;
    if (autoScrollRef.current) scrollToBottom(messages.length <= 1 ? "auto" : "smooth");
  }, [isFreePlan, messages, scrollToBottom]);

  // Auto-grow the textarea up to a max height instead of a fixed-height
  // single-line input.
  useEffect(() => {
    if (isFreePlan) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [isFreePlan, input]);

  // BLOCK FREE USERS — rendered after all hooks above so hook order never
  // changes between renders (React requires this).
  if (isFreePlan) {
    return (
      <AppShell title="AI Coach">
        <div className="h-full flex flex-col items-center justify-center text-center p-10">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gold-gradient blur-2xl opacity-30 animate-pulse" />
            <Zap size={64} className="relative text-[#F0B429] z-10" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Pro Feature</h2>
          <p className="text-[#A0A0C0] mb-8 max-w-md">
            Unlimited AI Coaching is only available for Pro members. Unlock the
            neural engine to scale your edge.
          </p>
          <button
            onClick={() => (window.location.href = "/upgrade")}
            className="gold-gradient px-8 py-4 rounded-xl text-black font-black text-sm transition-transform active:scale-95 shadow-[0_0_20px_rgba(240,180,41,0.4)]"
          >
            Upgrade to Pro Now
          </button>
        </div>
      </AppShell>
    );
  }


  async function streamReply(history: ChatMessage[]) {
    setErrorText(null);
    setIsThinking(true);
    setIsStreaming(false);

    const assistantId = newId();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          systemPrompt: SYSTEM_PROMPT,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;

      // Reserve the assistant bubble now so the "thinking" dots can hand
      // off smoothly to live-streamed text with no visual gap.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        if (firstChunk) {
          firstChunk = false;
          setIsThinking(false);
          setIsStreaming(true);
          setStreamingId(assistantId);
          setMessages((prev) => [
            ...prev,
            { id: assistantId, role: "assistant", content: chunk, createdAt: Date.now() },
          ]);
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
          );
        }
      }

      if (firstChunk) {
        // Stream closed with zero bytes — surface as an error bubble.
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "No response received. Please try again.",
            createdAt: Date.now(),
          },
        ]);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setErrorText(message);
    } finally {
      setIsThinking(false);
      setIsStreaming(false);
      setStreamingId(null);
      abortRef.current = null;
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isThinking || isStreaming) return;

    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    autoScrollRef.current = true;

    await streamReply(history);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  }

  function handleCopy(id: string, content: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1600);
    });
  }

  function handleClear() {
    abortRef.current?.abort();
    setMessages([]);
    setErrorText(null);
    setIsThinking(false);
    setIsStreaming(false);
    setStreamingId(null);
  }

  async function handleRetry() {
    if (isThinking || isStreaming) return;
    // Drop the last assistant message (if any) and re-ask with the same
    // history up to the last user message.
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIndex === -1) return;
    const cutIndex = messages.length - 1 - lastUserIndex;
    const history = messages.slice(0, cutIndex + 1);
    setMessages(history);
    await streamReply(history);
  }

  const quickPrompts = [
    {
      label: "Analyze Psychology",
      icon: <BrainCircuit size={14} />,
      text: "I'm feeling anxious after a losing streak. How do I reset my mindset?",
    },
    {
      label: "Risk Review",
      icon: <Target size={14} />,
      text: "Is my risk-to-reward ratio sustainable for a $100k prop account?",
    },
    {
      label: "Edge Validation",
      icon: <TrendingUp size={14} />,
      text: "How do I determine if my current strategy has a statistical edge?",
    },
  ];

  const busy = isThinking || isStreaming;

  return (
    <AppShell title="AI Performance Coach" subtitle="Elite Neural Trading Mentorship">
      <div className="w-full h-[calc(100vh-120px)] flex flex-col gap-4 p-2 md:p-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="relative p-2 rounded-lg bg-gold-gradient text-black shadow-[0_0_15px_rgba(240,180,41,0.3)]">
              <Sparkles size={20} />
              <span
                className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-[#08080C] transition-colors ${
                  busy ? "bg-[#00D084] animate-pulse" : "bg-[#00D084]"
                }`}
              />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">
                AI PERFORMANCE ENGINE
              </h3>
              <p className="text-[10px] text-[#5A5A80] uppercase tracking-widest font-bold">
                {busy ? "Generating response…" : "Neural System Active"}
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetry}
                disabled={busy}
                title="Regenerate last response"
                className="flex items-center gap-1.5 rounded-lg border border-[#1E1E38] bg-[#111120] px-3 py-2 text-[11px] font-bold text-[#A0A0C0] transition-colors hover:border-[#F0B429]/50 hover:text-white disabled:opacity-40"
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline">Retry</span>
              </button>
              <button
                onClick={handleClear}
                title="Clear conversation"
                className="flex items-center gap-1.5 rounded-lg border border-[#1E1E38] bg-[#111120] px-3 py-2 text-[11px] font-bold text-[#A0A0C0] transition-colors hover:border-[#FF4565]/50 hover:text-[#FF4565]"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#F0B429]/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

          <Card className="flex-1 flex flex-col overflow-hidden bg-[#0D0D1A]/80 backdrop-blur-xl border-[#1E1E38] shadow-2xl relative z-10">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gold-gradient blur-2xl opacity-20 animate-pulse" />
                    <Bot size={64} className="relative text-[#F0B429] z-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white">Welcome, Trader.</h2>
                    <p className="text-sm text-[#A0A0C0] leading-relaxed px-4">
                      Your mental edge is as important as your technical edge. <br />
                      What are we optimizing today?
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full pt-4">
                    {quickPrompts.map((prompt, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                        onClick={() => setInput(prompt.text)}
                        className="flex items-center gap-3 p-4 rounded-xl border border-[#1E1E38] bg-[#111120] text-left text-xs text-[#A0A0C0] hover:border-[#F0B429] hover:text-white transition-all group"
                      >
                        <span className="p-2 rounded-lg bg-[#1E1E38] group-hover:bg-[#F0B429] group-hover:text-black transition-colors shrink-0">
                          {prompt.icon}
                        </span>
                        <div className="truncate">
                          <p className="font-bold opacity-60 mb-1">{prompt.label}</p>
                          <p className="truncate">{prompt.text}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  const isThisStreaming = streamingId === msg.id;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className={`group flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isUser
                            ? "bg-gold-gradient text-black"
                            : "bg-[#1E1E38] text-[#F0B429] border border-[#2E2E4D]"
                        }`}
                      >
                        {isUser ? <User size={18} /> : <Bot size={18} />}
                      </div>

                      <div className={`flex flex-col gap-1 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
                        <div
                          className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            isUser
                              ? "bg-[#F0B429] text-[#080810] rounded-tr-none font-semibold"
                              : "bg-[#16162A] text-[#F0F0FF] rounded-tl-none border border-[#1E1E38]"
                          }`}
                        >
                          {isUser ? (
                            msg.content
                          ) : (
                            <>
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  strong: ({ ...props }) => (
                                    <span className="text-[#F0B429] font-black" {...props} />
                                  ),
                                  p: ({ ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                                  ul: ({ ...props }) => (
                                    <ul className="list-disc ml-4 mb-3 space-y-2" {...props} />
                                  ),
                                  li: ({ ...props }) => <li className="pl-1" {...props} />,
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                              {isThisStreaming && (
                                <span className="inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-[#F0B429]" />
                              )}
                            </>
                          )}
                        </div>

                        <div
                          className={`flex items-center gap-2 px-1 text-[10px] text-[#5A5A80] opacity-0 transition-opacity group-hover:opacity-100 ${
                            isUser ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          <span>{formatTime(msg.createdAt)}</span>
                          {!isUser && msg.content && !isThisStreaming && (
                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[#1E1E38] hover:text-white transition-colors"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check size={11} /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={11} /> Copy
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {isThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 flex-row"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#1E1E38] text-[#F0B429] flex items-center justify-center shrink-0 border border-[#2E2E4D]">
                    <Bot size={18} />
                  </div>
                  <div className="bg-[#16162A] text-[#A0A0C0] px-4 py-3.5 rounded-2xl rounded-tl-none border border-[#1E1E38] flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F0B429] animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F0B429] animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F0B429] animate-bounce" />
                  </div>
                </motion.div>
              )}

              {errorText && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 rounded-xl border border-[#FF4565]/30 bg-[#FF4565]/10 px-4 py-3 text-xs font-semibold text-[#FF4565]"
                >
                  <Zap size={14} className="shrink-0" />
                  {errorText}
                </motion.div>
              )}
            </div>

            <AnimatePresence>
              {showJumpToBottom && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  onClick={() => scrollToBottom()}
                  className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-[#1E1E38] bg-[#111120]/95 backdrop-blur px-3.5 py-1.5 text-[11px] font-bold text-[#A0A0C0] shadow-lg hover:text-white hover:border-[#F0B429]/50 transition-colors z-20"
                >
                  <ChevronDown size={13} />
                  New messages
                </motion.button>
              )}
            </AnimatePresence>

            <div className="p-6 bg-[#0D0D1A]/50 backdrop-blur-md border-t border-[#1E1E38]">
              <form onSubmit={handleSend} className="relative max-w-4xl mx-auto group">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe a trade, an emotion, or a rule-break..."
                  rows={1}
                  className="w-full resize-none bg-[#111120] border border-[#1E1E38] rounded-2xl pl-5 pr-16 py-4 text-sm text-[#F0F0FF] outline-none focus:border-[#F0B429] focus:ring-1 focus:ring-[#F0B429] transition-all placeholder:text-[#5A5A80] shadow-inner leading-relaxed"
                  style={{ maxHeight: 160 }}
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="absolute right-2 bottom-2 h-11 w-11 rounded-xl gold-gradient text-[#080810] disabled:opacity-40 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                >
                  {busy ? (
                    <span className="flex h-4 w-4 items-center justify-center">
                      <span className="h-4 w-4 rounded-full border-2 border-[#080810]/30 border-t-[#080810] animate-spin" />
                    </span>
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>
              <p className="mt-2 max-w-4xl mx-auto text-center text-[10px] text-[#5A5A80]">
                Press <span className="font-bold text-[#8080A0]">Enter</span> to send,{" "}
                <span className="font-bold text-[#8080A0]">Shift + Enter</span> for a new line.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
