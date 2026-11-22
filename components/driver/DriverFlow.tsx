"use client";

import { useState } from "react";
import type { Assumptions, City } from "@/lib/calc";
import {
  CAR_OPTIONS,
  CITY_OPTIONS,
  COPY,
  HOURS_OPTIONS,
  PRIORITY_LABELS,
  QUESTIONS,
  summarySentence,
  TARGET_OPTIONS,
} from "@/lib/copy";
import type { CarChoice, LoadedOffer, Partner } from "@/lib/data";
import { PRIORITIES, type DriverAnswers, type Priority } from "@/lib/ranking";
import { Results } from "./Results";
import { PrimaryButton, ProgressBar, Tile } from "./ui";

export interface DriverFlowProps {
  offers: LoadedOffer[];
  partners: Partner[];
  assumptions: Assumptions[];
  dataDate: string;
}

type Step = "intro" | 1 | 2 | 3 | 4 | 5 | "summary" | "results";

/** Partial answers while the interview is in progress. */
interface Draft {
  city?: City;
  hours?: number;
  target?: number | null;
  car?: CarChoice;
  priorities: Priority[];
}

const TOTAL_QUESTIONS = 5;

/**
 * The driver path: intro -> 5 questions -> summary -> results.
 * Answers live only in this component's state: nothing is stored or sent anywhere.
 */
export function DriverFlow({ offers, partners, assumptions, dataDate }: DriverFlowProps) {
  const [step, setStep] = useState<Step>("intro");
  const [draft, setDraft] = useState<Draft>({ priorities: [] });

  const answers: DriverAnswers | null =
    draft.city !== undefined && draft.hours !== undefined && draft.target !== undefined && draft.car !== undefined
      ? { city: draft.city, hours: draft.hours, target: draft.target, car: draft.car, priorities: draft.priorities }
      : null;

  const goBack = () => {
    if (step === "summary") setStep(5);
    else if (step === 1) setStep("intro");
    else if (typeof step === "number") setStep((step - 1) as Step);
  };

  const choose = (patch: Partial<Draft>, next: Step) => {
    setDraft((d) => ({ ...d, ...patch }));
    setStep(next);
  };

  if (step === "intro") {
    return (
      <Screen>
        <div className="flex flex-col gap-6 pt-6 sm:pt-12">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{COPY.intro.title}</h1>
          <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">{COPY.intro.body}</p>
          <aside className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{COPY.intro.disclaimerTitle}</strong>{" "}
            {COPY.intro.disclaimer}
          </aside>
          <PrimaryButton onClick={() => setStep(1)}>{COPY.intro.start}</PrimaryButton>
        </div>
      </Screen>
    );
  }

  if (step === "results" && answers) {
    return (
      <Results
        offers={offers}
        partners={partners}
        assumptions={assumptions}
        dataDate={dataDate}
        answers={answers}
        onAnswersChange={(a) => setDraft({ ...a })}
        onRestart={() => setStep(1)}
      />
    );
  }

  if (step === "summary" && answers) {
    return (
      <Screen>
        <BackButton onClick={goBack} />
        <div className="flex flex-col gap-6 pt-4">
          <p className="text-2xl font-medium leading-snug">{summarySentence(answers)}</p>
          <PrimaryButton onClick={() => setStep("results")}>{COPY.summaryButton}</PrimaryButton>
        </div>
      </Screen>
    );
  }

  const n = typeof step === "number" ? step : 1;
  return (
    <Screen>
      <div className="flex items-center justify-between gap-4">
        <BackButton onClick={goBack} />
        <span className="text-sm text-zinc-500">
          {n}/{TOTAL_QUESTIONS}
        </span>
      </div>
      <ProgressBar current={n} total={TOTAL_QUESTIONS} />

      {step === 1 && (
        <Question title={QUESTIONS.city}>
          {CITY_OPTIONS.map((o) => (
            <Tile key={o.value} selected={draft.city === o.value} onClick={() => choose({ city: o.value }, 2)}>
              {o.label}
            </Tile>
          ))}
        </Question>
      )}

      {step === 2 && (
        <Question title={QUESTIONS.hours}>
          {HOURS_OPTIONS.map((o) => (
            <Tile key={o.value} selected={draft.hours === o.value} onClick={() => choose({ hours: o.value }, 3)}>
              {o.label}
            </Tile>
          ))}
        </Question>
      )}

      {step === 3 && (
        <Question title={QUESTIONS.target} note={QUESTIONS.targetNote}>
          {TARGET_OPTIONS.map((o) => (
            <Tile
              key={o.label}
              selected={draft.target === o.value}
              onClick={() => choose({ target: o.value }, 4)}
            >
              {o.label}
            </Tile>
          ))}
        </Question>
      )}

      {step === 4 && (
        <Question title={QUESTIONS.car}>
          {CAR_OPTIONS.map((o) => (
            <Tile key={o.value} selected={draft.car === o.value} onClick={() => choose({ car: o.value }, 5)}>
              {o.label}
            </Tile>
          ))}
        </Question>
      )}

      {step === 5 && (
        <Question title={QUESTIONS.priorities} note={QUESTIONS.prioritiesNote}>
          {PRIORITIES.map((p) => {
            const selected = draft.priorities.includes(p);
            return (
              <Tile
                key={p}
                selected={selected}
                multi
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    priorities: selected ? d.priorities.filter((x) => x !== p) : [...d.priorities, p],
                  }))
                }
              >
                {PRIORITY_LABELS[p]}
              </Tile>
            );
          })}
          <div className="pt-2">
            <PrimaryButton onClick={() => setStep("summary")}>{COPY.next}</PrimaryButton>
          </div>
        </Question>
      )}
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6 sm:py-10">{children}</main>;
}

function Question({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 pt-2">
      <h1 className="text-2xl font-semibold leading-snug">
        {title}
        {note && <span className="mt-1 block text-base font-normal text-zinc-500">{note}</span>}
      </h1>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 self-start rounded-lg px-2 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      ← {COPY.back}
    </button>
  );
}
