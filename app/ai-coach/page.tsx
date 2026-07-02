"use client";

import { useState, useRef, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Send, Bot, User, Loader2, Sparkles, BrainCircuit, Target, TrendingUp, Zap } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from "@/components/providers/AuthProvider";

export default function AiCoachPage() {
  const { user, plan } = useAuth();
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // BLOCK FREE USERS
  if (plan === "Free Plan") {
    return (
      <AppShell title="AI Coach">
        <div className="h-full flex flex-col items-center justify-center text-center p-10">
          <div className="relative mb-6">
             <div className="absolute inset-0 bg-gold-gradient blur-2xl opacity-30 animate-pulse" />
             <Zap size={64} className="relative text-[#F0B429] z-10" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Pro Feature</h2>
          <p className="text-[#A0A0C0] mb-8 max-w-md">Unlimited AI Coaching is only available for Pro members. Unlock the neural engine to scale your edge.</p>
          <button onClick={() => window.location.href="/upgrade"} className="gold-gradient px-8 py-4 rounded-xl text-black font-black text-sm transition-transform active:scale-95 shadow-[0_0_20px_rgba(240,180,41,0.4)]">
            Upgrade to Pro Now
          </button>
        </div>
      </AppShell>
    );
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          systemPrompt: "You are an Elite Trading Performance Coach. Use Markdown formatting to make your responses professional. Use bold text for key trading concepts, risk rules, and psychological triggers. Be direct and high-impact.",
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
    } catch (error: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `System Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: "Analyze Psychology", icon: <BrainCircuit size={14} />, text: "I'm feeling anxious after a losing streak. How do I reset my mindset?" },
    { label: "Risk Review", icon: <Target size={14} />, text: "Is my risk-to-reward ratio sustainable for a $100k prop account?" },
    { label: "Edge Validation", icon: <TrendingUp size={14} />, text: "How do I determine if my current strategy has a statistical edge?" },
  ];

  return (
    <AppShell title="AI Performance Coach" subtitle="Elite Neural Trading Mentorship">
      <div className="w-full h-[calc(100vh-120px)] flex flex-col gap-4 p-2 md:p-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gold-gradient text-black shadow-[0_0_15px_rgba(240,180,41,0.3)]">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">AI PERFORMANCE ENGINE</h3>
              <p className="text-[10px] text-[#5A5A80] uppercase tracking-widest font-bold">Neural System Active</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#F0B429]/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
          <Card className="flex-1 flex flex-col overflow-hidden bg-[#0D0D1A]/80 backdrop-blur-xl border-[#1E1E38] shadow-2xl relative z-10">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gold-gradient blur-2xl opacity-20 animate-pulse" />
                    <Bot size={64} className="relative text-[#F0B429] z-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white">Welcome, Trader.</h2>
                    <p className="text-sm text-[#A0A0C0] leading-relaxed px-4">
                      Your mental edge is as important as your technical edge. <br/>
                      What are we optimizing today?
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full pt-4">
                    {quickPrompts.map((prompt, i) => (
                      <button key={i} onClick={() => setInput(prompt.text)} className="flex items-center gap-3 p-4 rounded-xl border border-[#1E1E38] bg-[#111120] text-left text-xs text-[#A0A0C0] hover:border-[#F0B429] hover:text-white transition-all group">
                        <span className="p-2 rounded-lg bg-[#1E1E38] group-hover:bg-[#F0B429] group-hover:text-black transition-colors shrink-0">{prompt.icon}</span>
                        <div className="truncate"><p className="font-bold opacity-60 mb-1">{prompt.label}</p><p className="truncate">{prompt.text}</p></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-gold-gradient text-black" : "bg-[#1E1E38] text-[#F0B429] border border-[#2E2E4D]"}`}>
                    {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
                  </div>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === "user" ? "bg-[#F0B429] text-[#080810] rounded-tr-none font-semibold" : "bg-[#16162A] text-[#F0F0FF] rounded-tl-none border border-[#1E1E38]"}`}>
                    {msg.role === "assistant" ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          strong: ({node, ...props}) => <span className="text-[#F0B429] font-black" {...props} />,
                          p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-3 space-y-2" {...props} />,
                          li: ({node, ...props}) => <li className="pl-1" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 flex-row">
                  <div className="w-9 h-9 rounded-xl bg-[#1E1E38] text-[#F0B429] flex items-center justify-center shrink-0 border border-[#2E2E4D]">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                  <div className="bg-[#16162A] text-[#A0A0C0] p-4 rounded-2xl rounded-tl-none text-sm border border-[#1E1E38] italic">
                    Consulting the performance engine...
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 bg-[#0D0D1A]/50 backdrop-blur-md border-t border-[#1E1E38]">
              <form onSubmit={handleSend} className="relative max-w-4xl mx-auto group">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe a trade, an emotion, or a rule-break..." className="w-full bg-[#111120] border border-[#1E1E38] rounded-2xl pl-5 pr-16 py-4 text-sm text-[#F0F0FF] outline-none focus:border-[#F0B429] focus:ring-1 focus:ring-[#F0B429] transition-all placeholder:text-[#5A5A80] shadow-inner" />
                <button disabled={isLoading} className="absolute right-2 top-2 bottom-2 px-4 rounded-xl gold-gradient text-[#080810] disabled:opacity-50 transition-all hover:scale-105 active:scale-95 flex items-center justify-center">
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}