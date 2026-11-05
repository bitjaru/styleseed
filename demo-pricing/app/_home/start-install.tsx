"use client";

import { useEffect, useState } from "react";
import { InstallCommand } from "./prompt-box";
import styles from "./home.module.css";

export function StartInstall() {
  const [agent, setAgent] = useState<"codex" | "claude">("codex");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <div className={styles.startInstall}>
      <InstallCommand key={agent} variant="terminal" agent={agent} showOptions={false} />
      {ready && <div className={styles.agentChoices} role="group" aria-label="Choose an agent for the install command">
        {(["codex", "claude"] as const).map((value) => (
          <button type="button" key={value} aria-pressed={agent === value} onClick={() => setAgent(value)}>
            {value === "codex" ? "Codex" : "Claude Code"}
          </button>
        ))}
      </div>}
    </div>
  );
}
