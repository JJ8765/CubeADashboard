/**
 * App shell.
 * =========
 * Tabbed navigation over the core interactive loop: the warehouse Layout map
 * (centerpiece), the Dashboard, and a Verify tab holding the live workbook
 * reconciliation. All three read one shared model (useWarehouse) so an
 * assignment on the map updates every view at once.
 */

import { useEffect, useState } from "react";
import { useWarehouse } from "@/store/useWarehouse";
import { LayoutPage } from "@/components/LayoutPage";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ReconcilePanel } from "@/components/ReconcilePanel";

type Tab = "layout" | "dashboard" | "verify";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "layout", label: "Layout" },
  { id: "dashboard", label: "Dashboard" },
  { id: "verify", label: "Verify" },
];

export default function App() {
  const { model, loading, init, resetToOriginal } = useWarehouse();
  const [tab, setTab] = useState<Tab>("layout");

  useEffect(() => {
    void init();
  }, [init]);

  if (loading || !model) {
    return <div className="grid h-full place-items-center text-ink-mut">Loading model…</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-line/50 px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-accent-deep" />
            <div>
              <h1 className="text-base font-semibold leading-tight">CubeA</h1>
              <p className="text-[11px] text-ink-mut">
                Building {model.building} · {model.bays.length.toLocaleString()} bays
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 rounded-lg border border-line/60 bg-surf-1 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  tab === t.id ? "bg-surf-3 text-ink" : "text-ink-2 hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {model.meta.isSample && (
            <span className="rounded-md bg-util-mod px-2 py-1 font-mono text-[10px] font-bold text-plane">
              SAMPLE DATA
            </span>
          )}
          <button
            onClick={() => void resetToOriginal()}
            className="rounded-lg border border-line/60 bg-surf-2 px-3 py-1.5 text-xs text-ink-2 hover:text-ink"
          >
            Reset to original
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden p-4">
        {tab === "layout" && <LayoutPage />}
        {tab === "dashboard" && (
          <div className="h-full overflow-y-auto pr-1">
            <Dashboard />
          </div>
        )}
        {tab === "verify" && (
          <div className="mx-auto h-full max-w-4xl overflow-y-auto pr-1">
            <ReconcilePanel />
          </div>
        )}
      </main>
    </div>
  );
}
