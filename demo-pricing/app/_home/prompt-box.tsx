"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

export const INSTALL_COMMAND = "npx skills add bitjaru/styleseed";

export const STYLESEED_PROMPT =
  "Install StyleSeed: `npx skills add bitjaru/styleseed` (or read https://styleseed-demo.vercel.app/llms.txt). Use `/ss-*` in Claude Code or `$ss-*` in Codex. Before building, choose the output grammar, surface adapter, brand recipe, and semantic palette. If the direction is still open, run `/ss-studio` or `$ss-studio` to produce three directions, require my selection, plan image/video assets and interaction scenes, then build a working prototype before recording a reel. If my references are not modeled, compile a project-local rule set with `/ss-reference` or `$ss-reference` instead of copying them. Save approved decisions to STYLESEED.md, resolve them, build, score to ≥80, then inspect the rendered screen and temporal interaction before showing me.";

type CopyState = "idle" | "copied" | "failed";

function selectForManualCopy(node: HTMLElement | null) {
  if (!node) return;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(node);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

async function copyText(
  text: string,
  node: HTMLElement | null,
  setState: (state: CopyState) => void,
) {
  try {
    if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(text);
    setState("copied");
    window.setTimeout(() => setState("idle"), 1800);
  } catch {
    selectForManualCopy(node);
    setState("failed");
  }
}

export function InstallCommand({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [state, setState] = useState<CopyState>("idle");
  const commandRef = useRef<HTMLElement>(null);
  const dark = tone === "dark";

  return (
    <div>
      <button
        type="button"
        onClick={() => copyText(INSTALL_COMMAND, commandRef.current, setState)}
        className="group flex w-full items-center justify-between gap-3 rounded-xl bg-teal-700 px-4 py-4 text-left text-white shadow-[0_14px_30px_-18px_rgba(15,118,110,0.9)] transition-colors hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 sm:gap-4 sm:px-5"
        aria-label={`Copy install command: ${INSTALL_COMMAND}`}
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-teal-100">
            Install StyleSeed
          </span>
          <code ref={commandRef} className="mt-1 block whitespace-nowrap font-mono text-[12px] font-semibold sm:text-[15px]">
            {INSTALL_COMMAND}
          </code>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-2 text-[13px] font-bold group-hover:bg-white/20">
          {state === "copied" ? <Check size={14} /> : <Copy size={14} />}
          <span className="hidden sm:inline">{state === "copied" ? "Copied" : "Copy"}</span>
        </span>
      </button>
      <p
        aria-live="polite"
        className={`mt-2 min-h-5 text-[12px] ${dark ? "text-neutral-400" : "text-neutral-500"}`}
      >
        {state === "failed"
          ? "Clipboard access was blocked. The command is selected — copy it manually."
          : "Works with Codex, Claude Code, Cursor, and other skills-compatible agents."}
      </p>
    </div>
  );
}

/** Advanced, portable orchestration prompt. Installation stays the primary path. */
export function PromptBox({
  prompt = STYLESEED_PROMPT,
  tone = "light",
}: {
  prompt?: string;
  tone?: "light" | "dark";
}) {
  const [state, setState] = useState<CopyState>("idle");
  const promptRef = useRef<HTMLElement>(null);
  const dark = tone === "dark";

  return (
    <div>
      <div
        className={`relative rounded-xl p-4 pr-24 text-left ring-1 ${
          dark ? "bg-black/35 ring-white/10" : "bg-neutral-950 ring-black/10"
        }`}
      >
        <code
          ref={promptRef}
          className="block select-text whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-neutral-200 sm:text-[13px]"
        >
          {prompt}
        </code>
        <button
          type="button"
          onClick={() => copyText(prompt, promptRef.current, setState)}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-2 text-[13px] font-bold text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Copy the advanced StyleSeed prompt"
        >
          {state === "copied" ? <Check size={13} /> : <Copy size={13} />}
          {state === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <p aria-live="polite" className={`mt-2 min-h-5 text-[12px] ${dark ? "text-neutral-400" : "text-neutral-500"}`}>
        {state === "failed"
          ? "Clipboard access was blocked. The prompt is selected — copy it manually."
          : "Use this when you need the full workflow in one portable prompt."}
      </p>
    </div>
  );
}
