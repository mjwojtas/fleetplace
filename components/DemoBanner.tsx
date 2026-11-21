import { DEMO_BANNER_TEXT } from "@/lib/site";

// Fixed demo notice shown at the top of every page (rendered from the root layout).
export function DemoBanner() {
  return (
    <div
      role="note"
      className="sticky top-0 z-50 w-full bg-amber-400 px-4 py-2 text-center text-sm font-medium text-black"
    >
      {DEMO_BANNER_TEXT}
    </div>
  );
}
