/**
 * Undertale-style dialog box: a black panel with a thick white border and a
 * typewriter reveal. Optionally renders action buttons (Eat / Leave it) beneath
 * the text when the player is inspecting a worm.
 */

import { useEffect, useState } from "react";

interface DialogAction {
  label: string;
  onClick: () => void;
  tone?: "eat" | "leave";
}

interface DialogBoxProps {
  text: string;
  actions?: DialogAction[];
}

export function DialogBox({ text, actions }: DialogBoxProps) {
  const [shown, setShown] = useState("");

  // Typewriter: re-run whenever the line changes.
  useEffect(() => {
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 18);
    return () => window.clearInterval(id);
  }, [text]);

  return (
    <div className="mx-auto w-full max-w-2xl rounded-md border-4 border-white bg-black p-4 font-mono text-sm text-white shadow-[0_0_0_4px_rgba(0,0,0,0.4)]">
      <p className="min-h-[2.5rem] leading-relaxed">
        {shown}
        <span className="ml-0.5 inline-block w-2 animate-pulse">▎</span>
      </p>
      {actions && actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 border-t border-white/25 pt-3">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className={`rounded border-2 px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition ${
                a.tone === "eat"
                  ? "border-yellow-300 text-yellow-300 hover:bg-yellow-300 hover:text-black"
                  : "border-white/70 text-white/90 hover:bg-white hover:text-black"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
