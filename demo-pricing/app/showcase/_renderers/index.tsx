"use client";

import type { ReactNode } from "react";
import type { SeedId } from "@engine/motion";
import { Placeholder } from "../_placeholder";
import { FinancePage } from "./finance";
import { ChatPage } from "./chat";
import { PricingPage } from "./pricing";
import { IssuesPage } from "./issues";
import { SettingsPage } from "./settings";
import { MarketingPage } from "./marketing";
import { NotesPage } from "./notes";
import { WalletPage } from "./wallet";
import { FoodPage } from "./food";
import { FitnessPage } from "./fitness";
import { MusicPage } from "./music";
import {
  FieldReport,
  NightPoster,
  OrbitDeck,
  SignalCarousel,
} from "./artifact-proofs";

export type ShowcaseRenderer = (skin: string, seed: SeedId) => ReactNode;

/**
 * Client-side registry of showcase render functions. The server page
 * resolves the entry by id and passes the id (not the function) to the
 * client frame, which looks the renderer up here.
 */
export const renderers: Record<string, ShowcaseRenderer> = {
  finance: (skin, seed) => <FinancePage skin={skin} seed={seed} />,
  chat: (skin, seed) => <ChatPage skin={skin} seed={seed} />,
  pricing: (skin, seed) => <PricingPage skin={skin} seed={seed} />,
  issues: (skin, seed) => <IssuesPage skin={skin} seed={seed} />,
  settings: (skin, seed) => <SettingsPage skin={skin} seed={seed} />,
  marketing: (skin, seed) => <MarketingPage skin={skin} seed={seed} />,
  notes: (skin, seed) => <NotesPage skin={skin} seed={seed} />,
  wallet: (skin, seed) => <WalletPage skin={skin} seed={seed} />,
  food: (skin, seed) => <FoodPage skin={skin} seed={seed} />,
  fitness: (skin, seed) => <FitnessPage skin={skin} seed={seed} />,
  music: (skin, seed) => <MusicPage skin={skin} seed={seed} />,
  "signal-carousel": (skin, seed) => <SignalCarousel skin={skin} seed={seed} />,
  "orbit-deck": (skin, seed) => <OrbitDeck skin={skin} seed={seed} />,
  "field-report": (skin, seed) => <FieldReport skin={skin} seed={seed} />,
  "night-poster": (skin, seed) => <NightPoster skin={skin} seed={seed} />,
};

export function getRenderer(id: string): ShowcaseRenderer | undefined {
  return renderers[id];
}
