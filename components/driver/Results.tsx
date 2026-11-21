"use client";

import { useMemo, useState } from "react";
import type { Assumptions, Offer } from "@/lib/calc";
import {
  COPY,
  formatDate,
  formatHours,
  formatInt,
  formatMoney,
  missingFieldsText,
  NO_RELAXATION_HINT,
  PRIORITY_LABELS,
  relaxationHint,
  summarySentence,
} from "@/lib/copy";
import type { LoadedOffer, Partner } from "@/lib/data";
import { rankOffers, suggestRelaxations, type DriverAnswers, type RankedOffer } from "@/lib/ranking";

interface ResultsProps {
  offers: LoadedOffer[];
  partners: Partner[];
  assumptions: Assumptions[];
  dataDate: string;
  answers: DriverAnswers;
  onAnswersChange: (answers: DriverAnswers) => void;
  onRestart: () => void;
}

type FuelType = "lpg" | "petrol";

/** Parses a user-typed number ("12,5" or "12.5"). Returns null when empty or invalid. */
function parseNumber(value: string): number | null {
  const n = Number(value.replace(",", ".").trim());
  return value.trim() === "" || !Number.isFinite(n) ? null : n;
}

const pct = (fraction: number) => String(Math.round(fraction * 1000) / 10).replace(".", ",");

export function Results({ offers, partners, assumptions, dataDate, answers, onAnswersChange, onRestart }: ResultsProps) {
  const base = assumptions.find((a) => a.city === answers.city) as Assumptions;
  // Petrol costs about twice as much as LPG per km (seed data note); LPG is the city default.
  const fuelDefaults: Record<FuelType, number> = { lpg: base.fuelPercent, petrol: base.fuelPercent * 2 };

  const [hourly, setHourly] = useState(base.hourlyTurnover === null ? "" : String(base.hourlyTurnover));
  const [fuelType, setFuelType] = useState<FuelType>("lpg");
  const [fuel, setFuel] = useState(pct(fuelDefaults.lpg));
  const [commission, setCommission] = useState(pct(base.appCommission));
  const [hours, setHours] = useState(String(answers.hours));
  // Collapsed on phones so the ranking is visible first; always open on desktop (lg).
  // Opens by default when the city has no hourly turnover and the driver must type it.
  const [panelOpen, setPanelOpen] = useState(base.hourlyTurnover === null);

  const effective: Assumptions = useMemo(() => {
    const h = parseNumber(hourly);
    const f = parseNumber(fuel);
    const c = parseNumber(commission);
    return {
      ...base,
      hourlyTurnover: h !== null && h > 0 ? h : null,
      fuelPercent: f !== null && f >= 0 && f < 100 ? f / 100 : base.fuelPercent,
      appCommission: c !== null && c >= 0 && c < 100 ? c / 100 : base.appCommission,
    };
  }, [base, hourly, fuel, commission]);

  const ranking = useMemo(() => rankOffers(offers, partners, answers, effective), [offers, partners, answers, effective]);
  const suggestions = useMemo(
    () => (ranking.matchCount === 0 ? suggestRelaxations(offers, answers) : []),
    [offers, answers, ranking.matchCount],
  );

  const ranked = ranking.items.filter((i) => i.group !== "incomplete");
  const incomplete = ranking.items.filter((i) => i.group === "incomplete");
  const needsHourly = effective.hourlyTurnover === null;

  const updateHours = (value: string) => {
    setHours(value);
    const n = parseNumber(value);
    if (n !== null && n > 0 && n <= 100) onAnswersChange({ ...answers, hours: n });
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-3">
        <p className="text-base text-zinc-600 dark:text-zinc-400">{summarySentence(answers)}</p>
        <button
          type="button"
          onClick={onRestart}
          className="self-start text-sm font-medium text-emerald-700 underline underline-offset-4 dark:text-emerald-400"
        >
          {COPY.changeAnswers}
        </button>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Assumptions panel: first on mobile, sidebar on desktop */}
        <aside className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-14 lg:w-80 lg:shrink-0">
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls="assumptions-panel"
            onClick={() => setPanelOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 text-left lg:pointer-events-none"
          >
            <span className="text-lg font-semibold">{COPY.assumptionsTitle}</span>
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400 lg:hidden">
              {panelOpen ? "Zwiń" : "Zmień"}
            </span>
          </button>
          {!panelOpen && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 lg:hidden">
              {effective.hourlyTurnover === null ? "obrót: wpisz" : `${formatInt(effective.hourlyTurnover)} zł/h`} ·{" "}
              {fuelType === "lpg" ? "LPG" : "benzyna"} {fuel}% · prowizja {commission}% · {hours} h tyg.
            </p>
          )}
          <div id="assumptions-panel" className={panelOpen ? "block" : "hidden lg:block"}>
            <div className="mt-4 flex flex-col gap-4">
              <NumberField
                label="Obrót na godzinę (zł)"
                hint="Ile płacą pasażerowie za godzinę jazdy, przed prowizją."
                value={hourly}
                onChange={setHourly}
                highlight={needsHourly}
              />
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Paliwo (% obrotu)</span>
                <div className="flex gap-2" role="group" aria-label="Rodzaj paliwa">
                  {(["lpg", "petrol"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={fuelType === t}
                      onClick={() => {
                        setFuelType(t);
                        setFuel(pct(fuelDefaults[t]));
                      }}
                      className={[
                        "flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium",
                        fuelType === t
                          ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950"
                          : "border-zinc-200 dark:border-zinc-700",
                      ].join(" ")}
                    >
                      {t === "lpg" ? "LPG" : "Benzyna"}
                    </button>
                  ))}
                </div>
                <NumberField label="" value={fuel} onChange={setFuel} suffix="%" ariaLabel="Paliwo, procent obrotu" />
              </div>
              <NumberField label="Prowizja aplikacji" value={commission} onChange={setCommission} suffix="%" />
              <NumberField label="Godziny jazdy tygodniowo" value={hours} onChange={updateHours} suffix="h" />
              {base.sourceUrl && (
                <p className="text-xs text-zinc-500">
                  Wartości domyślne:{" "}
                  <a href={base.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    źródło
                  </a>
                  , {formatDate(base.date)}.
                </p>
              )}
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4" aria-label="Ranking ofert">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold">{COPY.resultHeading}</h1>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-emerald-700 underline underline-offset-4 dark:text-emerald-400">
                {COPY.whatDoesItMean}
              </summary>
              <p className="mt-2 max-w-prose rounded-lg bg-zinc-100 p-3 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {COPY.tooltip}
              </p>
            </details>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{COPY.rankingRules}</p>

          {ranking.matchCount === 0 ? (
            <EmptyState suggestions={suggestions} onApply={onAnswersChange} />
          ) : (
            <>
              {needsHourly && (
                <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                  {COPY.needsHourlyInput}
                </p>
              )}
              <ol className="flex flex-col gap-4">
                {ranked.map((item, index) => (
                  <li key={item.offer.id}>
                    <OfferCard
                      item={item}
                      mode={ranking.mode}
                      position={item.group === "ranked" ? index + 1 : null}
                      hours={answers.hours}
                      target={answers.target}
                    />
                  </li>
                ))}
              </ol>
              {incomplete.length > 0 && (
                <div className="flex flex-col gap-3 pt-4">
                  <h2 className="text-lg font-semibold">{COPY.incompleteHeading}</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{COPY.incompleteNote}</p>
                  <ul className="flex flex-col gap-4">
                    {incomplete.map((item) => (
                      <li key={item.offer.id}>
                        <OfferCard item={item} mode={ranking.mode} position={null} hours={answers.hours} target={answers.target} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <p className="border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
            {COPY.footnote(formatDate(dataDate))}
          </p>
        </section>
      </div>
    </main>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  suffix,
  highlight,
  ariaLabel,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  highlight?: boolean;
  ariaLabel?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium">{label}</span>}
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      <span className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.value)}
          className={[
            "w-full rounded-lg border-2 bg-transparent px-3 py-2 text-base",
            highlight ? "border-amber-500" : "border-zinc-200 dark:border-zinc-700",
          ].join(" ")}
        />
        {suffix && <span className="text-sm text-zinc-500">{suffix}</span>}
      </span>
    </label>
  );
}

function EmptyState({
  suggestions,
  onApply,
}: {
  suggestions: ReturnType<typeof suggestRelaxations>;
  onApply: (a: DriverAnswers) => void;
}) {
  const best = suggestions[0];
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-lg font-semibold">{COPY.emptyTitle}</p>
      {best ? (
        <>
          <p className="text-zinc-700 dark:text-zinc-300">{relaxationHint(best.relax, best.count)}</p>
          <button
            type="button"
            onClick={() => onApply(best.answers)}
            className="self-start rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Pokaż te oferty
          </button>
        </>
      ) : (
        <p className="text-zinc-700 dark:text-zinc-300">{NO_RELAXATION_HINT}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Offer card
// ---------------------------------------------------------------------------

const APP_NAMES: Record<string, string> = { bolt: "Bolt", uber: "Uber", freenow: "FreeNow" };

function offerTerms(offer: Offer): string {
  const parts: string[] = [];
  const pctText = (p: number) => `${pct(p)}%`;
  const base = offer.feeBase === "afterAppCommission" ? " kwoty po prowizji aplikacji" : offer.feeBase === "turnover" ? " obrotu" : "";
  if (offer.settlementType === "split" && offer.driverShare != null) {
    const s = Math.round(offer.driverShare * 100);
    parts.push(`Podział ${s}/${100 - s} (Ty/partner)`);
  }
  if (offer.settlementType === "fixed" || offer.settlementType === "mixed") {
    parts.push(offer.weeklyFee != null ? `Opłata ${formatMoney(offer.weeklyFee)} zł/tydz.` : "Opłata stała (kwota nieznana)");
  }
  if ((offer.settlementType === "percent" || offer.settlementType === "mixed") && offer.percent != null) {
    parts.push(`${pctText(offer.percent)}${base}`);
  }
  if (offer.carType === "rental" && offer.weeklyRent != null && offer.weeklyRent > 0) {
    parts.push(`Auto ${formatMoney(offer.weeklyRent)} zł/tydz.`);
  }
  if (offer.fuelIncluded) parts.push("paliwo w cenie");
  return parts.join(" + ") || "Warunki rozliczenia";
}

const MARK_ICON = { yes: "✓", no: "✗", unknown: "?" } as const;
const MARK_TEXT = { yes: "", no: "nie", unknown: "brak informacji" } as const;

function OfferCard({
  item,
  mode,
  position,
  hours,
  target,
}: {
  item: RankedOffer;
  mode: "A" | "B";
  position: number | null;
  hours: number;
  target: number | null;
}) {
  const { offer, partner, result, group } = item;
  // Money is always shown at the driver's hours H (in mode A as well).
  const money = item.earningsAtHours;
  const w = money?.weekly ?? null;
  const perHour = w && hours > 0 ? w.earnings / hours : null;
  const href = partner?.www ?? offer.sourceUrl;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">
            {position !== null && <span className="mr-2 text-zinc-400">{position}.</span>}
            {partner?.name ?? offer.partnerId}
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{offerTerms(offer)}</p>
          <p className="text-xs text-zinc-500">
            Aplikacje: {offer.appsIncluded.map((a) => APP_NAMES[a] ?? a).join(", ")}
          </p>
        </div>
      </div>

      {group === "ranked" && money?.monthlyEarnings != null && (
        <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
          <p className="text-lg leading-snug">
            Zarobisz{" "}
            <strong
              className={[
                "whitespace-nowrap text-3xl font-bold tabular-nums",
                money.monthlyEarnings < 0 ? "text-red-700 dark:text-red-400" : "text-emerald-800 dark:text-emerald-300",
              ].join(" ")}
            >
              {formatInt(money.monthlyEarnings)} zł
            </strong>{" "}
            miesięcznie,
          </p>
          <p className="text-lg leading-snug">
            pracując{" "}
            <strong className="whitespace-nowrap text-3xl font-bold tabular-nums">{formatHours(hours)} h</strong>{" "}
            tygodniowo
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {perHour !== null && perHour > 0 && <>ok. {formatInt(perHour)} zł za godzinę jazdy · </>}przed podatkiem
          </p>
        </div>
      )}

      {mode === "A" && item.fitsHours !== null && (
        <p
          className={[
            "rounded-lg px-3 py-2 text-sm font-medium",
            item.fitsHours
              ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
              : "bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
          ].join(" ")}
        >
          {item.fitsHours
            ? `✅ Cel ${formatInt(target ?? 0)} zł osiągniesz w ${formatHours(result.weeklyHours!)} h tygodniowo. Mieścisz się w ${formatHours(hours)} h.`
            : `⚠ Na cel ${formatInt(target ?? 0)} zł potrzebujesz ${formatHours(result.weeklyHours!)} h tygodniowo, czyli o ${formatHours(item.extraHours!)} h więcej.`}
        </p>
      )}

      {result.flags.unrealistic && mode === "A" && <Warning>{COPY.unrealistic}</Warning>}
      {group === "ranked" && money?.flags.loss && <Warning>{COPY.loss}</Warning>}
      {group === "neverProfitable" && <Warning>{COPY.neverProfitable}</Warning>}
      {group === "incomplete" && <Warning>{missingFieldsText(result.missingFields)}</Warning>}

      {item.marks.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Twoje priorytety">
          {item.marks.map((m) => (
            <li
              key={m.priority}
              className={[
                "rounded-full px-3 py-1 text-xs font-medium",
                m.status === "yes"
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
              ].join(" ")}
            >
              {MARK_ICON[m.status]} {PRIORITY_LABELS[m.priority]}
              {MARK_TEXT[m.status] && `: ${MARK_TEXT[m.status]}`}
            </li>
          ))}
        </ul>
      )}

      {w && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
            Rozbicie kosztów (tygodniowo, przy {formatHours(hours)} h)
          </summary>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
            <Row label="Obrót z przejazdów" value={w.turnover} />
            <Row label="Prowizja aplikacji" value={-w.appCommission} />
            <Row label={`VAT od przejazdów${money?.flags.vatAssumed ? " (założenie 8%)" : ""}`} value={-w.rideVat} />
            {w.partnerPercentFee > 0 && <Row label="Opłata procentowa partnera" value={-w.partnerPercentFee} />}
            {w.partnerFixedFee > 0 && <Row label="Opłata stała partnera" value={-w.partnerFixedFee} />}
            {w.partnerSplitShare > 0 && <Row label="Udział partnera" value={-w.partnerSplitShare} />}
            {w.rent > 0 && <Row label="Auto" value={-w.rent} />}
            {w.fuel > 0 && <Row label="Paliwo" value={-w.fuel} />}
            <dt className="border-t border-zinc-200 pt-1 font-semibold dark:border-zinc-700">Twój zarobek tygodniowo</dt>
            <dd className="border-t border-zinc-200 pt-1 text-right font-semibold dark:border-zinc-700">
              {formatInt(w.earnings)} zł
            </dd>
            {money?.monthlyEarnings != null && (
              <>
                <dt className="font-semibold">Twój zarobek miesięcznie</dt>
                <dd className="text-right font-semibold">{formatInt(money.monthlyEarnings)} zł</dd>
              </>
            )}
          </dl>
          {money?.flags.vatAssumed && <p className="mt-2 text-xs text-zinc-500">{COPY.vatAssumed}</p>}
        </details>
      )}

      <div className="flex flex-col gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500">
          <a href={offer.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {COPY.source}
          </a>
          {" · "}
          {COPY.verified}: {formatDate(offer.verifiedAt)}
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="rounded-xl border-2 border-emerald-700 px-4 py-2 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950"
        >
          {COPY.goToPartner}
        </a>
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <>
      <dt className="text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className="text-right">{value < 0 ? `− ${formatInt(-value)}` : formatInt(value)} zł</dd>
    </>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      {children}
    </p>
  );
}
