"use client";

import type { ReactNode } from "react";

export function Tile({
  selected,
  disabled,
  multi,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  /** Multi-select tile: shows a checkbox and exposes aria-pressed. */
  multi?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={multi ? selected : undefined}
      className={[
        "flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base font-medium transition-colors",
        selected
          ? "border-burgundy-600 bg-burgundy-50 text-burgundy-950 dark:border-burgundy-500 dark:bg-burgundy-950 dark:text-burgundy-50"
          : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500",
        disabled ? "cursor-not-allowed opacity-40 hover:border-zinc-200" : "cursor-pointer",
      ].join(" ")}
    >
      {multi && (
        <span
          aria-hidden
          className={[
            "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs",
            selected ? "border-burgundy-600 bg-burgundy-600 text-white" : "border-zinc-400",
          ].join(" ")}
        >
          {selected ? "✓" : ""}
        </span>
      )}
      <span>{children}</span>
    </button>
  );
}

export function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl bg-burgundy-700 px-5 py-4 text-base font-semibold text-white hover:bg-burgundy-800 sm:w-auto"
    >
      {children}
    </button>
  );
}

export function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`Pytanie ${current} z ${total}`}
      className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
    >
      <div className="h-full rounded-full bg-burgundy-600 transition-all" style={{ width: `${(current / total) * 100}%` }} />
    </div>
  );
}
