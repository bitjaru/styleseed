"use client";

import { useState } from "react";
import type { SeedId } from "@engine/motion";
import type { ShowcaseProof, SurfaceAdapter } from "@/lib/showcase";
import { getRenderer } from "../_renderers";

type Skin = { id: string; name: string; brand?: string };

type Props = {
  entryId: string;
  entryAdapter: SurfaceAdapter;
  proof: ShowcaseProof;
  defaultSkin: string;
  defaultSeed: SeedId;
  skins: Skin[];
  seeds: ReadonlyArray<{ id: SeedId; name: string; vibe: string }>;
};

const SKIN_STORAGE = "styleseed-showcase-skin";
const SEED_STORAGE = "styleseed-showcase-seed";

export function ShowcaseFrame({
  entryId,
  entryAdapter,
  proof,
  defaultSkin,
  defaultSeed,
  skins,
  seeds,
}: Props) {
  const [skin, setSkin] = useState<string>(() => {
    if (typeof window === "undefined") return defaultSkin;
    return window.localStorage.getItem(SKIN_STORAGE) || defaultSkin;
  });
  const [seed, setSeed] = useState<SeedId>(() => {
    if (typeof window === "undefined") return defaultSeed;
    const stored = window.localStorage.getItem(SEED_STORAGE) as SeedId | null;
    return stored && seeds.some((s) => s.id === stored) ? stored : defaultSeed;
  });

  const pickSkin = (id: string) => {
    setSkin(id);
    if (typeof window !== "undefined") window.localStorage.setItem(SKIN_STORAGE, id);
  };
  const pickSeed = (id: SeedId) => {
    setSeed(id);
    if (typeof window !== "undefined") window.localStorage.setItem(SEED_STORAGE, id);
  };

  const render = getRenderer(entryId);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
        {proof === "interactive" ? (
          <>
            <Toggle
              label="Brand"
              items={skins.map((s) => ({ id: s.id, name: s.name, color: s.brand }))}
              active={skin}
              onPick={pickSkin}
            />
            <Toggle
              label="Motion"
              items={seeds.map((s) => ({ id: s.id, name: s.name, tooltip: s.vibe }))}
              active={seed}
              onPick={(id) => pickSeed(id as SeedId)}
            />
          </>
        ) : (
          <>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                proof === "exported-artifact"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-violet-100 text-violet-800"
              }`}
            >
              {proof === "exported-artifact"
                ? "Exported production artifact"
                : "Rendered concept preview"}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
              Surface · {entryAdapter}
            </span>
          </>
        )}
      </div>
      <div data-skin={skin} className="p-0">
        {render ? render(skin, seed) : <UnknownEntry id={entryId} />}
      </div>
    </div>
  );
}

function UnknownEntry({ id }: { id: string }) {
  return (
    <div className="p-8 text-center text-sm text-gray-500">
      No renderer registered for <code className="font-mono">{id}</code>. Add
      one in <code className="font-mono">app/showcase/_renderers/index.tsx</code>.
    </div>
  );
}

function Toggle({
  label,
  items,
  active,
  onPick,
}: {
  label: string;
  items: Array<{ id: string; name: string; color?: string; tooltip?: string }>;
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item.id)}
            title={item.tooltip}
            className={
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
              (active === item.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900")
            }
          >
            {item.color && (
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ background: item.color }}
              />
            )}
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
