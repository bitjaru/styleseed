"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export const STYLESEED_PROMPT =
  "Install StyleSeed so its checks actually run: `npx skills add bitjaru/styleseed` (if you can't, read https://styleseed-demo.vercel.app/llms-full.txt instead). Then use it for every UI in this project. First, in plan mode, lock my key color, font, and motion with me and save them to STYLESEED.md so they don't drift. Build to the rules with ONE focal point and one accent. Before showing me anything, run the quality gate (/ss-score to ≥ 80: one accent, one radius, normal states grey not rainbow, real empty/error states) and fix what fails. If you're building a full screen, just run /ss-build — it enforces this whole loop.";

/**
 * The lowest-friction way to use StyleSeed: one sentence you paste into Claude
 * Code / Cursor / any agent. Click to copy.
 */
export function PromptBox({
  prompt = STYLESEED_PROMPT,
  tone = "light",
}: {
  prompt?: string;
  tone?: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the text is still selectable */
    }
  };

  const dark = tone === "dark";

  return (
    <button
      onClick={copy}
      className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
        dark
          ? "bg-black/40 ring-1 ring-white/10 hover:ring-white/25"
          : "bg-neutral-900 hover:bg-black"
      }`}
    >
      <code className={`flex-1 font-mono text-[13px] leading-relaxed ${dark ? "text-neutral-100" : "text-neutral-100"}`}>
        {prompt}
      </code>
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[14px] font-bold ${
          copied ? "bg-emerald-500 text-white" : dark ? "bg-white/10 text-white group-hover:bg-white/20" : "bg-white/10 text-white group-hover:bg-white/20"
        }`}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}
