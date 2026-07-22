/**
 * App state store (zustand).
 * =========================
 * Holds the active WarehouseModel and mediates all mutations through the
 * repository, so persistence stays in one place and the calc engine/UI read a
 * single source of truth. The interactive map + dashboard will subscribe here.
 */

import { create } from "zustand";
import type { Assignment, InventorySnapshot, WarehouseModel } from "@/domain/types";
import { LocalStorageRepository } from "@/domain/repository/localStorageRepo";
import type { WarehouseRepository } from "@/domain/repository/types";
import { buildSampleModel } from "@/domain/sample/seed";

interface WarehouseState {
  model: WarehouseModel | null;
  repo: WarehouseRepository;
  loading: boolean;
  /** Load persisted model, or seed the sample if storage is empty. */
  init: () => Promise<void>;
  /** Install a freshly-imported model as the working + original copy. */
  importModel: (model: WarehouseModel) => Promise<void>;
  loadSample: () => Promise<void>;
  setAssignment: (bayId: string, assignment: Assignment) => Promise<void>;
  setInventory: (snapshot: InventorySnapshot | undefined) => Promise<void>;
  resetToOriginal: () => Promise<void>;
}

export const useWarehouse = create<WarehouseState>((set, get) => ({
  model: null,
  repo: new LocalStorageRepository(),
  loading: true,

  async init() {
    const { repo } = get();
    let model = await repo.load();
    if (!model) {
      model = buildSampleModel();
      await repo.setOriginal(model);
    }
    set({ model, loading: false });
  },

  async importModel(model) {
    await get().repo.setOriginal(model);
    set({ model });
  },

  async loadSample() {
    const model = buildSampleModel();
    await get().repo.setOriginal(model);
    set({ model });
  },

  async setAssignment(bayId, assignment) {
    const model = await get().repo.saveAssignment(bayId, assignment);
    set({ model: { ...model } });
  },

  async setInventory(snapshot) {
    const model = await get().repo.setInventory(snapshot);
    set({ model: { ...model } });
  },

  async resetToOriginal() {
    const model = await get().repo.resetToOriginal();
    if (model) set({ model });
  },
}));
