/**
 * localStorage implementation of WarehouseRepository (v1 storage).
 * Serialises the whole model to JSON. Two slots: `working` and `original`
 * (so "reset to original uploaded workbook" is a copy-back).
 */

import type { Assignment, InventorySnapshot, WarehouseModel } from "../types";
import type { WarehouseRepository } from "./types";

const WORKING_KEY = "cubea.model.working";
const ORIGINAL_KEY = "cubea.model.original";

/** Minimal storage abstraction so the repo also works in non-browser tests. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** In-memory store (used by tests and SSR); mirrors the Storage API subset. */
export class MemoryStore implements KeyValueStore {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

const clone = <T>(v: T): T =>
  typeof structuredClone === "function" ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);

export class LocalStorageRepository implements WarehouseRepository {
  constructor(
    private store: KeyValueStore = typeof localStorage !== "undefined"
      ? localStorage
      : new MemoryStore(),
  ) {}

  private read(key: string): WarehouseModel | null {
    const raw = this.store.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as WarehouseModel;
    } catch {
      return null;
    }
  }

  async load(): Promise<WarehouseModel | null> {
    return this.read(WORKING_KEY);
  }

  async save(model: WarehouseModel): Promise<void> {
    this.store.setItem(WORKING_KEY, JSON.stringify(model));
  }

  async setOriginal(model: WarehouseModel): Promise<void> {
    this.store.setItem(ORIGINAL_KEY, JSON.stringify(model));
    this.store.setItem(WORKING_KEY, JSON.stringify(model));
  }

  async resetToOriginal(): Promise<WarehouseModel | null> {
    const original = this.read(ORIGINAL_KEY);
    if (!original) return null;
    const copy = clone(original);
    await this.save(copy);
    return copy;
  }

  async saveAssignment(bayId: string, assignment: Assignment): Promise<WarehouseModel> {
    const model = (await this.load()) ?? this.requireModel();
    model.assignments[bayId] = { ...assignment, bayId };
    await this.save(model);
    return model;
  }

  async setInventory(snapshot: InventorySnapshot | undefined): Promise<WarehouseModel> {
    const model = (await this.load()) ?? this.requireModel();
    model.inventory = snapshot;
    await this.save(model);
    return model;
  }

  async clear(): Promise<void> {
    this.store.removeItem(WORKING_KEY);
    this.store.removeItem(ORIGINAL_KEY);
  }

  private requireModel(): WarehouseModel {
    throw new Error("No model loaded. Import a workbook or load the sample seed first.");
  }
}
