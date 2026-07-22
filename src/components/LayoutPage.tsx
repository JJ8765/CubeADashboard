/**
 * Interactive Layout page — the app's centerpiece.
 * ===============================================
 * Filter rail · warehouse map · rack detail/assignment panel, side by side.
 */

import { MapControls } from "./map/MapControls";
import { WarehouseMap } from "./map/WarehouseMap";
import { RackPanel } from "./RackPanel";

export function LayoutPage() {
  return (
    <div className="flex h-full min-h-0 gap-4">
      <MapControls />
      <div className="min-w-0 flex-1">
        <WarehouseMap />
      </div>
      <RackPanel />
    </div>
  );
}
