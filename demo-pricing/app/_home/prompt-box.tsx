"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Check, Copy, LoaderCircle } from "lucide-react";
import install from "@/content/install.json";
import styles from "./home.module.css";

export const INSTALL_COMMAND = install.default;

export const STYLESEED_PROMPT =
  `Install StyleSeed: \`${INSTALL_COMMAND}\`. Use /styleseed in Claude Code or $styleseed in Codex. Help apply our design decisions, not replace our design system. Inspect approved tokens, components, and choices first; report unsupported choices instead of silently remapping them. Resolve the selected artifact's contract when a registry exists; use STYLESEED.md only for a legacy project. Choose only unresolved grammar, adapter, recipe, and palette inputs. If the direction is open, use ss-studio and require my selection; compile unmodeled references with ss-reference. Build from the resolved contract, score to ≥80, and inspect the rendered result and relevant interactions. Report evidence and unresolved decisions; a score is not my approval.`;

type CopyState = "idle" | "copying" | "copied" | "failed";

function selectForManualCopy(node: HTMLElement | null) {
  if (!node) return;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(node);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function useCopyFeedback() {
  const [state, setState] = useState<CopyState>("idle");
  const request = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { request.current++; if (timer.current) clearTimeout(timer.current); }, []);
  async function copy(text: string, node: HTMLElement | null, onCopied?: () => void) {
    const current = ++request.current;
    if (timer.current) clearTimeout(timer.current);
    setState("copying");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      if (current !== request.current) return;
      selectForManualCopy(node);
      setState("failed");
      return;
    }
    if (current !== request.current) return;
    setState("copied");
    timer.current = setTimeout(() => setState("idle"), 1200);
    onCopied?.();
  }
  return { state, copy };
}

export function InstallCommand({ tone = "light", agent = "default", onCopied, variant = "default", showOptions = true }: {
  tone?: "light" | "dark";
  agent?: "default" | "codex" | "claude";
  onCopied?: () => void;
  variant?: "default" | "terminal";
  showOptions?: boolean;
}) {
  const { state, copy } = useCopyFeedback();
  const commandRef = useRef<HTMLElement>(null);
  const dark = tone === "dark";
  const command = install[agent];
  const target = agent === "default" ? "Codex + Claude Code" : agent === "codex" ? "Codex" : "Claude Code";

  if (variant === "terminal") {
    return (
      <div>
        <div className={styles.installLine}>
          <code ref={commandRef} className={styles.installCode} tabIndex={0} aria-label="Install command">
            {command.split(" ").map((argument, index) => <Fragment key={`${index}-${argument}`}>{index > 0 ? " " : ""}<span className={styles.commandArgument}>{argument}</span></Fragment>)}
          </code>
          <button type="button" className={styles.copyButton} data-copy-state={state} aria-busy={state === "copying"} disabled={state === "copying"}
            onClick={() => copy(command, commandRef.current, onCopied)}
            aria-label={`Copy install command: ${command}`}>
            {state === "copying" ? <LoaderCircle className={styles.copySpinner} size={16} aria-hidden="true" /> : state === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            <span className={styles.copyLabel}>Copy</span>
          </button>
        </div>
        <p aria-live="polite" className={styles.copyStatus}>
          {state === "failed"
            ? "Clipboard access was blocked. The command is selected — copy it manually."
            : state === "copied" ? "Copied. Run this in your project’s terminal." : ""}
        </p>
        {showOptions && (
          <details className={`${styles.disclosure} ${styles.installOptions}`}>
            <summary>Another agent or install options?</summary>
            <p>Run in your project’s terminal. This copies the skill for {target} into this project and skips the selection menus.</p>
            <p>For Cursor or another agent, run <code>{install.interactive}</code>. Choose your agent, Project, then Copy. Codex is included under Universal.</p>
            <p><a href="/codex-ui-design">Codex setup</a> · <a href="/claude-code-ui-design">Claude Code setup</a>. If skills do not appear after installation, start a fresh agent session.</p>
          </details>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => copy(command, commandRef.current, onCopied)}
        className="group flex w-full items-center justify-between gap-3 rounded-xl bg-teal-700 px-4 py-4 text-left text-white shadow-[0_14px_30px_-18px_rgba(15,118,110,0.9)] transition-colors hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 sm:gap-4 sm:px-5"
        aria-label={`Copy install command: ${command}`}
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-teal-100">
            Install for {target}
          </span>
          <code ref={commandRef} className="mt-1 block whitespace-normal break-words font-mono text-[12px] font-semibold sm:text-[15px]">
            {command}
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
          : state === "copied"
            ? "Copied. Run this in your project’s terminal."
            : "Run in your project’s terminal. Copies the StyleSeed skill into this project; skips the selection menus."}
      </p>
      <details className={`mt-2 text-[12px] ${dark ? "text-neutral-300" : "text-neutral-600"}`}>
        <summary className="w-fit cursor-pointer py-3 underline underline-offset-4">Another agent or install options?</summary>
        <p className="mt-2 leading-relaxed">
          For Cursor or another agent, run <code className="break-words">{install.interactive}</code>.
          Choose your agent, Project, then Copy. Codex is already included under Universal.
          Use this interactive command to review each installer choice.
        </p>
        <p className="mt-2 leading-relaxed">
          Only use one? <a href="/codex-ui-design" className="underline">Codex setup</a> ·{" "}
          <a href="/claude-code-ui-design" className="underline">Claude Code setup</a>.
          If skills do not appear after installation, start a fresh agent session.
        </p>
      </details>
    </div>
  );
}

/** Advanced, portable orchestration prompt. Installation stays the primary path. */
export function PromptBox({
  prompt = STYLESEED_PROMPT,
  tone = "light",
  onCopied,
  hint,
  copyLabel,
  variant = "default",
}: {
  prompt?: string;
  hint?: string;
  copyLabel?: string;
  onCopied?: () => void;
  tone?: "light" | "dark";
  variant?: "default" | "terminal";
}) {
  const { state, copy } = useCopyFeedback();
  const promptRef = useRef<HTMLElement>(null);
  const dark = tone === "dark";

  if (variant === "terminal") {
    return (
      <div className={styles.prompt}>
        <div className={styles.promptBody}>
          <code ref={promptRef}>{prompt}</code>
          <button type="button" className={styles.copyButton} data-copy-state={state} aria-busy={state === "copying"} disabled={state === "copying"}
            onClick={() => copy(prompt, promptRef.current, onCopied)}
            aria-label={copyLabel ?? "Copy the advanced StyleSeed prompt"}>
            {state === "copying" ? <LoaderCircle className={styles.copySpinner} size={16} aria-hidden="true" /> : state === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            <span className={styles.copyLabel}>Copy</span>
          </button>
        </div>
        <p aria-live="polite" className={styles.copyStatus}>
          {state === "failed"
            ? "Clipboard access was blocked. The prompt is selected — copy it manually."
            : state === "copied" ? "Copied. Paste into your coding agent."
            : hint ?? "Use this when you need the full workflow in one portable prompt."}
        </p>
      </div>
    );
  }

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
          onClick={() => copy(prompt, promptRef.current, onCopied)}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-2 text-[13px] font-bold text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label={copyLabel ?? (prompt === STYLESEED_PROMPT ? "Copy the advanced StyleSeed prompt" : "Copy this task prompt")}
        >
          {state === "copied" ? <Check size={13} /> : <Copy size={13} />}
          {state === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <p aria-live="polite" className={`mt-2 min-h-5 text-[12px] ${dark ? "text-neutral-400" : "text-neutral-500"}`}>
        {state === "failed"
          ? "Clipboard access was blocked. The prompt is selected — copy it manually."
          : hint ?? (prompt === STYLESEED_PROMPT ? "Use this when you need the full workflow in one portable prompt." : "Paste into your coding agent and add your screen or reference.")}
      </p>
    </div>
  );
}
