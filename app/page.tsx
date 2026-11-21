import { SITE_NAME } from "@/lib/site";

// Placeholder home page. The driver flow (SPEC.md section 2) comes in a later step.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">{SITE_NAME}</h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Porównywarka partnerów flotowych dla kierowców aplikacji przewozowych.
      </p>
    </main>
  );
}
