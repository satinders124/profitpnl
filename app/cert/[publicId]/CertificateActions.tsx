"use client";

import { useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";

export function CertificateActions({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function shareCertificate() {
    if (navigator.share) {
      await navigator.share({ title, text: "My ProfitPnL trading performance certificate", url });
    } else {
      await copyLink();
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel/70 px-4 py-2.5 text-sm font-semibold text-txt transition-colors hover:border-gold/50 hover:text-gold"
      >
        {copied ? <Check size={16} className="text-bull" /> : <Copy size={16} />}
        {copied ? "Copied" : "Copy Link"}
      </button>
      <button
        type="button"
        onClick={shareCertificate}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel/70 px-4 py-2.5 text-sm font-semibold text-txt transition-colors hover:border-gold/50 hover:text-gold"
      >
        <Share2 size={16} />
        Share
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="gold-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-ink shadow-[0_0_24px_rgba(240,180,41,0.25)] transition-shadow hover:shadow-[0_0_34px_rgba(240,180,41,0.45)]"
      >
        <Download size={16} />
        Save PDF
      </button>
    </div>
  );
}
