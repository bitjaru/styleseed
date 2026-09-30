import type { SeedId } from "@engine/motion";

/**
 * Stub renderer used by every showcase entry until the real layout
 * lands. Confirms the skin + seed wiring works end-to-end.
 */
export function Placeholder({
  id,
  skin,
  seed,
}: {
  id: string;
  skin: string;
  seed: SeedId;
}) {
  return (
    <div
      className="flex min-h-[480px] flex-col items-center justify-center gap-3 p-12 text-center"
      style={{
        background: "var(--background, #fafafa)",
        color: "var(--foreground, #1a1a1a)",
        borderRadius: "var(--radius, 16px)",
      }}
    >
      <div className="text-xs uppercase tracking-widest opacity-60">
        Showcase placeholder
      </div>
      <div className="text-2xl font-bold tracking-tight">{id}</div>
      <div className="font-mono text-sm opacity-80">
        skin = {skin} · seed = {seed}
      </div>
      <div className="mt-2 max-w-md text-sm opacity-60">
        This entry has no layout yet — the routing skeleton just wires up the
        skin and motion toggles. Run <code>/styleseed page {id}</code> or hand-author
        a layout in <code>app/showcase/examples/{id}.tsx</code>.
      </div>
    </div>
  );
}
