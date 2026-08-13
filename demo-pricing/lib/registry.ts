import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Component = {
  id: string;
  type: "ui" | "pattern";
  name: string;
  exports: string[];
  description: string;
  source: string;
  sourceUrl: string;
  imports: string[];
  bytes: number;
  digest: string;
  code: string;
};

export type Skin = {
  id: string;
  name: string;
  description: string;
  brand?: string;
  brandDark?: string;
  font?: string;
  source?: string;
  themeUrl: string;
};

export type Registry = {
  version: string;
  generated?: string;
  repository: string;
  counts: {
    components: number;
    byType: { ui: number; pattern: number };
    skins: number;
  };
  components: Component[];
  skins: Skin[];
};

let cache: Registry | null = null;

export function loadRegistry(): Registry {
  if (cache) return cache;
  const path = join(
    process.cwd(),
    "public",
    ".well-known",
    "styleseed",
    "registry.json"
  );
  cache = JSON.parse(readFileSync(path, "utf-8")) as Registry;
  return cache;
}

export function getComponent(id: string): Component | undefined {
  return loadRegistry().components.find((c) => c.id === id);
}
