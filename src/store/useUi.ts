/**
 * UI / view state (zustand).
 * =========================
 * Selection, hover, map coloring mode, search and filters — everything the map,
 * rack panel and dashboard share but that is NOT part of the persisted warehouse
 * model. Kept separate from useWarehouse so data mutations and view state don't
 * entangle.
 */

import { create } from "zustand";

export type ColorBy = "utilization" | "zone" | "department" | "rackType";

export interface Filters {
  zone: string | "all";
  assignment: "all" | "assigned" | "unassigned";
  rackCode: string | "all";
  /** utilization range (gross), 0..1 */
  utilMin: number;
  utilMax: number;
}

export const EMPTY_FILTERS: Filters = {
  zone: "all",
  assignment: "all",
  rackCode: "all",
  utilMin: 0,
  utilMax: 1,
};

interface UiState {
  selectedId: string | null;
  hoverId: string | null;
  colorBy: ColorBy;
  /** free-text search over id / address / code / department */
  search: string;
  filters: Filters;

  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setColorBy: (c: ColorBy) => void;
  setSearch: (s: string) => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
}

export const useUi = create<UiState>((set) => ({
  selectedId: null,
  hoverId: null,
  colorBy: "utilization",
  search: "",
  filters: { ...EMPTY_FILTERS },

  select: (id) => set({ selectedId: id }),
  hover: (id) => set({ hoverId: id }),
  setColorBy: (colorBy) => set({ colorBy }),
  setSearch: (search) => set({ search }),
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...EMPTY_FILTERS }, search: "" }),
}));
