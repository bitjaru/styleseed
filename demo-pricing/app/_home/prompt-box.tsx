"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export const STYLESEED_PROMPT =
  "Install StyleSeed: `npx skills add bitjaru/styleseed` (or read https://styleseed-demo.vercel.app/llms.txt). Use `/ss-*` in Claude Code or `$ss-*` in Codex. Before building, choose the output grammar, surface adapter, brand recipe, and semantic palette. If the direction is still open, run `/ss-studio` or `$ss-studio` to produce three directions, require my selection, plan image/video assets and interaction scenes, then build a working prototype before recording a reel. If my references are not modeled, compile a project-local rule set with `/ss-reference` or `$ss-reference` instead of copying them. Save approved decisions to STYLESEED.md, resolve them, build, score to ≥80, then inspect the rendered screen and temporal interaction before showing me.";

/**
 * The lowest-friction way to use StyleSeed: one sentence you paste into Claude
 * Code / Codex / Cursor / any agent. Click to copy.
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
