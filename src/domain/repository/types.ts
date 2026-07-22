/**
 * Repository interface — the seam between the app and its storage.
 * ==============================================================
 * v1 implements this against localStorage. Because everything goes through this
 * interface, moving to a real database later means writing one new class, with
 * zero changes to the calc engine or UI.
 */

import type { Assignment, InventorySnapshot, WarehouseModel } from "../types";

export interface WarehouseRepository {
  /** Load the working model, or null if nothing is stored yet. */
  load(): Promise<WarehouseModel | null>;
  /** Persist the working model. */
  save(model: WarehouseModel): Promise<void>;

  /** Install a freshly-imported model as both the working AND the original copy. */
  setOriginal(model: WarehouseModel): Promise<void>;
  /** Restore the working model to the last imported original. */
  resetToOriginal(): Promise<WarehouseModel | null>;

  /** Upsert a single bay assignment on the working model. */
  saveAssignment(bayId: string, assignment: Assignment): Promise<WarehouseModel>;
  /** Attach / replace the inventory occupancy snapshot. */
  setInventory(snapshot: InventorySnapshot | undefined): Promise<WarehouseModel>;

  /** Remove everything (working + original). */
  clear(): Promise<void>;
}
