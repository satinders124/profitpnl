"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Send,
  User,
  BrainCircuit,
  Target,
  TrendingUp,
  Zap,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { buildTradingContext, TradingContext } from "@/lib/ai-context";

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

function chatKey(uid: string) {
  return `profitpnl_chat_v1_${uid}`;
}

function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M4 19V5m0 14h16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 14l4-4 3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const BASE_SYSTEM =
  "You are an Elite Trading Performance Coach embedded inside ProfitPnL, a trading journal app. Use Markdown formatting. Use bold for key concepts, risk rules, and psychological triggers. Be direct, concise, and high-impact.";

export default function AiCoachPage() {
  const { user, plan } = useAuth();
  const { playSend, playReceive, playError } = useSoundEffects();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [tradingContext, setTradingContext] = useState<TradingContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoScrollRef = useRef(true);
  const contextRef = useRef<string>("");

  const isFreePlan = plan === "Free Plan";

  // ── Load chat history from localStorage ──
  useEffect(() => {
    if (isFreePlan || !user) return;
    try {
      const raw = localStorage.getItem(chatKey(user.id));
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed.slice(-100)); // cap at 100 messages
        }
      }
    } catch {
      // ignore corrupt localStorage
    }
  }, [isFreePlan, user]);

  // ── Persist chat history to localStorage ──
  useEffect(() => {
    if (isFreePlan || !user) return;
    if (!messages.length) {
      localStorage.removeItem(chatKey(user.id));
      return;
    }
    localStorage.setItem(chatKey(user.id), JSON.stringify(messages.slice(-100)));
  }, [messages, isFreePlan, user]);

  // ── Load trading context once ──
  useEffect(() => {
    if (isFreePlan || !user) {
      setLoadingContext(false);
      return;
    }
    let cancelled = false;
    buildTradingContext(user.id)
      .then((ctx) => {
        if (cancelled) return;
        setTradingContext(ctx);
        contextRef.current = ctx.summary;
      })
      .catch((err) => {
        console.error("Failed to load trading context:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isFreePlan, user]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setShowJumpToBottom(false);
  }, []);

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

  useEffect(() => {
    if (isFreePlan) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [isFreePlan, input]);

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

    // Build enriched system prompt with live trading context
    const systemPrompt = contextRef.current
      ? `${BASE_SYSTEM}\n\n${contextRef.current}`
      : BASE_SYSTEM;

    try {
      const response = await fetch("/api/ai/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          systemPrompt,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;

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
          playReceive();
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
      playError();
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
    playSend();

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
    if (user) localStorage.removeItem(chatKey(user.id));
  }

  async function handleRetry() {
    if (isThinking || isStreaming) return;
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIndex === -1) return;
    const cutIndex = messages.length - 1 - lastUserIndex;
    const history = messages.slice(0, cutIndex + 1);
    setMessages(history);
    await streamReply(history);
  }

  const quickPrompts = [
    {
      label: "Analyze My Edge",
      icon: <BrainCircuit size={14} />,
      text: "Based on my trading data, which setup is my most profitable and what mistakes are costing me the most R?",
    },
    {
      label: "Review Last Session",
      icon: <Target size={14} />,
      text: "Review my last 5 trades. What patterns do you see in my execution and emotion?",
    },
    {
      label: "Risk Check",
      icon: <TrendingUp size={14} />,
      text: "Am I on track with my risk rules? What's my current drawdown status vs my limits?",
    },
  ];

  const busy = isThinking || isStreaming;

  return (
    <AppShell title="AI Coach" subtitle={busy ? "Generating response…" : "Elite Neural Trading Mentorship"}>
      <div className="-mx-4 -mt-6 -mb-24 flex h-[calc(100%+120px)] flex-col bg-[#08080C] lg:-mx-8 lg:-mt-8 lg:-mb-12 lg:h-[calc(100%+80px)]">
        {messages.length > 0 && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-b border-[#1E1E38] bg-[#0D0D1A]/60 px-4 py-2.5 backdrop-blur-md">
            <button
              onClick={handleRetry}
              disabled={busy}
              title="Regenerate last response"
              className="flex items-center gap-1.5 rounded-lg border border-[#1E1E38] bg-[#111120] px-3 py-1.5 text-[11px] font-bold text-[#A0A0C0] transition-colors hover:border-[#F0B429]/50 hover:text-white disabled:opacity-40"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Retry</span>
            </button>
            <button
              onClick={handleClear}
              title="Clear conversation"
              className="flex items-center gap-1.5 rounded-lg border border-[#1E1E38] bg-[#111120] px-3 py-1.5 text-[11px] font-bold text-[#A0A0C0] transition-colors hover:border-[#FF4565]/50 hover:text-[#FF4565]"
            >
              <Trash2 size={12} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        )}

        <div className="relative flex flex-1 flex-col overflow-hidden">
          <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-[#F0B429]/5 blur-[120px]" />
          <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500/5 blur-[120px]" />

          <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth sm:px-6 lg:px-10">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center space-y-6 text-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gold-gradient blur-2xl opacity-25 animate-pulse" />
                  <div className="gold-gradient relative flex h-16 w-16 items-center justify-center rounded-2xl text-[#080810] shadow-[0_0_35px_rgba(240,180,41,0.4)]">
                    <BrandMark size={30} />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white">Welcome, Trader.</h2>
                  <p className="px-4 text-sm leading-relaxed text-[#A0A0C0]">
                    Your mental edge is as important as your technical edge. <br />
                    What are we optimizing today?
                  </p>
                </div>

                {/* Trading context status */}
                {loadingContext ? (
                  <div className="flex items-center gap-2 text-[11px] text-[#5A5A80]">
                    <Loader2 size={12} className="animate-spin" />
                    Loading your trading data…
                  </div>
                ) : tradingContext && tradingContext.tradeCount > 0 ? (
                  <div className="flex items-center gap-2 rounded-full border border-[#1E1E38] bg-[#111120] px-3 py-1.5 text-[11px] text-[#8080A0]">
                    <Check size={12} className="text-emerald-400" />
                    <span>
                      {tradingContext.tradeCount} trades loaded · {tradingContext.winRate.toFixed(0)}% WR ·{" "}
                      {tradingContext.totalR > 0 ? "+" : ""}
                      {tradingContext.totalR.toFixed(1)}R
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-full border border-[#1E1E38] bg-[#111120] px-3 py-1.5 text-[11px] text-[#5A5A80]">
                    <Zap size={12} className="text-[#F0B429]" />
                    <span>No trades logged yet — AI will guide you from scratch</span>
                  </div>
                )}

                <div className="grid w-full grid-cols-1 gap-3 pt-4 md:grid-cols-3">
                  {quickPrompts.map((prompt, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                      onClick={() => setInput(prompt.text)}
                      className="group flex items-center gap-3 rounded-xl border border-[#1E1E38] bg-[#111120] p-4 text-left text-xs text-[#A0A0C0] transition-all hover:border-[#F0B429] hover:text-white"
                    >
                      <span className="shrink-0 rounded-lg bg-[#1E1E38] p-2 transition-colors group-hover:bg-[#F0B429] group-hover:text-black">
                        {prompt.icon}
                      </span>
                      <div className="truncate">
                        <p className="mb-1 font-bold opacity-60">{prompt.label}</p>
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
                    className={`group mx-auto flex max-w-3xl gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isUser
                          ? "bg-gold-gradient text-black"
                          : "border border-[#2E2E4D] bg-[#1E1E38] text-[#F0B429]"
                      }`}
                    >
                      {isUser ? <User size={18} /> : <BrandMark size={17} />}
                    </div>

                    <div className={`flex max-w-[85%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                      <div
                        className={`rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                          isUser
                            ? "rounded-tr-none bg-[#F0B429] font-semibold text-[#080810]"
                            : "rounded-tl-none border border-[#1E1E38] bg-[#16162A] text-[#F0F0FF]"
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
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-[#1E1E38] hover:text-white"
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
                className="mx-auto flex max-w-3xl flex-row gap-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#2E2E4D] bg-[#1E1E38] text-[#F0B429]">
                  <BrandMark size={17} />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-none border border-[#1E1E38] bg-[#16162A] px-4 py-3.5 text-[#A0A0C0]">
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
                className="mx-auto flex max-w-3xl items-center gap-2 rounded-xl border border-[#FF4565]/30 bg-[#FF4565]/10 px-4 py-3 text-xs font-semibold text-[#FF4565]"
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
                className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#1E1E38] bg-[#111120]/95 px-3.5 py-1.5 text-[11px] font-bold text-[#A0A0C0] shadow-lg backdrop-blur transition-colors hover:border-[#F0B429]/50 hover:text-white"
              >
                <ChevronDown size={13} />
                New messages
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="shrink-0 border-t border-[#1E1E38] bg-[#0D0D1A]/70 px-4 pt-3 pb-20 lg:pb-3 backdrop-blur-md sm:px-6 lg:px-10">
          <form onSubmit={handleSend} className="relative mx-auto max-w-3xl">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe a trade, an emotion, or a rule-break..."
              rows={1}
              className="w-full resize-none rounded-2xl border border-[#1E1E38] bg-[#111120] py-3 pl-5 pr-14 text-sm leading-relaxed text-[#F0F0FF] shadow-inner outline-none transition-all placeholder:text-[#5A5A80] focus:border-[#F0B429] focus:ring-1 focus:ring-[#F0B429]"
              style={{ maxHeight: 160 }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="absolute right-2 bottom-1.5 flex h-9 w-9 items-center justify-center rounded-xl gold-gradient text-[#080810] transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              {busy ? (
                <span className="h-4 w-4 rounded-full border-2 border-[#080810]/30 border-t-[#080810] animate-spin" />
              ) : (
                <Send size={17} />
              )}
            </button>
          </form>
          <p className="mx-auto mt-1 mb-1 max-w-3xl text-center text-[10px] text-[#5A5A80]">
            Press <span className="font-bold text-[#8080A0]">Enter</span> to send,{" "}
            <span className="font-bold text-[#8080A0]">Shift + Enter</span> for a new line.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
