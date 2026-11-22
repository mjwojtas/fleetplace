/**
 * Driver-facing Polish copy. Texts come from SPEC.md sections 2 and 2a.
 * Keep this file in sync with SPEC.md when wording changes.
 */
import type { City } from "./calc";
import type { CarChoice } from "./data";
import type { DriverAnswers, Priority, RankingResult, Relaxation } from "./ranking";

export const COPY = {
  intro: {
    title: "Znajdź partnera flotowego, który się opłaca",
    body:
      "Odpowiedz na 5 krótkich pytań. Porównamy oferty partnerów w Twoim mieście i pokażemy, ile zarobisz albo ile musisz jeździć. Nie pytamy o imię, telefon ani e-mail.",
    start: "Zaczynamy",
    disclaimerTitle: "Pokażemy szacunek, nie obietnicę.",
    disclaimer:
      "Twój zarobek zależy przede wszystkim od tego, ile pasażerowie zapłacą Ci za godzinę jazdy (miasto, pory i dni jazdy, ruch), oraz od kosztów: prowizji aplikacji, opłat partnera, auta i paliwa. Kwoty traktuj jako rząd wielkości.",
  },
  earningsFactors: {
    title: "Od czego zależy Twój zarobek?",
    items: [
      ["Obrót na godzinę", "miasto, pory i dni jazdy (wieczory, weekendy, wydarzenia), pogoda, Twoje doświadczenie i to, ile kursów przyjmujesz."],
      ["Liczba godzin", "które faktycznie przejeździsz."],
      ["Koszty", "prowizja aplikacji, VAT od przejazdów, opłaty partnera, wynajem auta, paliwo (LPG czy benzyna, spalanie Twojego auta)."],
      ["Bonusy i napiwki", "mogą podnieść zarobek, ale ich nie wliczamy."],
      ["Podatek i ZUS", "nie odejmujemy, bo zależą od Twojej umowy i sytuacji."],
    ] as const,
    closing: "Dlatego pokazujemy przedział, a nie dokładną kwotę. Warunki zawsze potwierdź u partnera.",
  },
  back: "Wstecz",
  next: "Dalej",
  summaryButton: "Pokaż moich partnerów",
  changeAnswers: "Zmień odpowiedzi",
  resultHeading: "Twój zarobek (przed podatkiem)",
  whatDoesItMean: "Co to znaczy?",
  tooltip:
    "To, co zostaje Ci z opłat za przejazdy po odjęciu: prowizji aplikacji, opłat partnera, wynajmu auta i paliwa. Nie odjęliśmy podatku ani ZUS, bo zależą od Twojej umowy i sytuacji, np. wieku czy statusu studenta. Nie wliczyliśmy napiwków ani bonusów.",
  footnote: (date: string) =>
    `To szacunek na podstawie publicznych ofert z dnia ${date} i Twoich założeń. Ostateczne warunki potwierdź u partnera przed podpisaniem umowy.`,
  unrealistic: "Ponad 60 godzin tygodniowo. Ten cel jest nierealny przy tych założeniach. Zmień kwotę albo założenia.",
  loss: "Przy tej liczbie godzin koszty (np. wynajem) są wyższe niż to, co zarobisz. Zwiększ liczbę godzin albo wybierz ofertę bez stałych opłat.",
  rankingRules:
    "Jak układamy ranking: według Twojego zarobku miesięcznego przy podanej liczbie godzin, wyłącznie na podstawie warunków ofert. Płatności partnerów nie wpływają na kolejność.",
  neverProfitable: "Przy tych założeniach ta oferta się nie opłaca: koszty rosną szybciej niż zarobek.",
  vatAssumed: "Oferta nie podaje VAT od przejazdów, przyjęliśmy 8%.",
  needsHourlyInput:
    "Nie mamy publicznego źródła obrotu na godzinę dla tego miasta. Wpisz w „Twoich założeniach”, ile średnio płacą pasażerowie za godzinę jazdy, a policzymy wynik.",
  incompleteHeading: "Oferty z niepełnymi danymi",
  incompleteNote: "Nie liczymy wyniku, bo źródło nie podaje wszystkich warunków.",
  goToPartner: "Przejdź do partnera",
  source: "Źródło",
  verified: "Zweryfikowano",
  emptyTitle: "Żadna oferta nie pasuje do Twoich odpowiedzi.",
  assumptionsTitle: "Twoje założenia",
} as const;

// ---------------------------------------------------------------------------
// Interview (SPEC.md section 2, step 1)
// ---------------------------------------------------------------------------

export const QUESTIONS = {
  city: "Gdzie chcesz jeździć?",
  hours: "Ile czasu chcesz poświęcić na jazdę?",
  target: "Ile chcesz zarobić minimum miesięcznie?",
  targetNote: "(po opłatach i paliwie, przed podatkiem)",
  car: "Czym chcesz jeździć?",
  priorities: "Co jest dla Ciebie ważne?",
  prioritiesNote: "(możesz zaznaczyć kilka albo żadnej)",
} as const;

export const CITY_OPTIONS: Array<{ value: City; label: string }> = [
  { value: "warszawa", label: "Warszawa" },
  { value: "krakow", label: "Kraków" },
  { value: "trojmiasto", label: "Trójmiasto" },
];

export const HOURS_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 12, label: "Dorywczo, np. weekendy (~12 h tyg.)" },
  { value: 20, label: "Pół etatu (~20 h)" },
  { value: 40, label: "Pełen etat (~40 h)" },
  { value: 50, label: "Więcej (~50 h)" },
];

export const TARGET_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: 1500, label: "1500 zł" },
  { value: 3000, label: "3000 zł" },
  { value: 5000, label: "5000 zł" },
  { value: 7000, label: "7000 zł" },
  { value: null, label: "Nie wiem, pokaż, ile zarobię" },
];

export const CAR_OPTIONS: Array<{ value: CarChoice; label: string }> = [
  { value: "own", label: "Własnym autem" },
  { value: "rental", label: "Wynajętym autem tylko dla mnie" },
  { value: "split", label: "Autem na zmiany z innym kierowcą" },
  { value: "any", label: "Jeszcze nie wiem" },
];

export const PRIORITY_LABELS: Record<Priority, string> = {
  multiApp: "Kilka aplikacji naraz",
  noDeposit: "Bez kaucji",
  fastPayout: "Szybkie wypłaty",
  language: "Obsługa po ukraińsku lub angielsku",
  noIdleFee: "Brak opłat w tygodniu bez jazdy",
};

// ---------------------------------------------------------------------------
// Summary sentence (SPEC.md section 2, step 2)
// ---------------------------------------------------------------------------

const CITY_GENITIVE: Record<City, string> = {
  warszawa: "Warszawy",
  krakow: "Krakowa",
  trojmiasto: "Trójmiasta",
};

const CAR_INSTRUMENTAL: Record<CarChoice, string> = {
  own: " własnym autem",
  rental: " wynajętym autem",
  split: " autem na zmiany z innym kierowcą",
  any: "",
};

export function summarySentence(a: DriverAnswers): string {
  const goal =
    a.target === null
      ? "który chce sprawdzić, ile zarobi"
      : `który chce zarobić minimum ${formatInt(a.target)} zł miesięcznie`;
  return `Szukamy partnera dla kierowcy z ${CITY_GENITIVE[a.city]}, ${goal}, jeżdżąc około ${a.hours} godzin tygodniowo${CAR_INSTRUMENTAL[a.car]}.`;
}

// ---------------------------------------------------------------------------
// Empty result hints
// ---------------------------------------------------------------------------

/** Polish plural for "oferta": 1 ofertę, 2–4 oferty, 5+ ofert (accusative). */
export function offersCount(n: number): string {
  if (n === 1) return "1 ofertę";
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${n} oferty`;
  return `${n} ofert`;
}

export function relaxationHint(relax: Relaxation, count: number): string {
  const found = `znajdziesz ${offersCount(count)}`;
  switch (relax) {
    case "car":
      return `Zmień odpowiedź „Czym chcesz jeździć?” na „Jeszcze nie wiem”: ${found}.`;
    case "multiApp":
      return `Odznacz „Kilka aplikacji naraz”: ${found}.`;
    case "carAndMultiApp":
      return `Zmień odpowiedź „Czym chcesz jeździć?” na „Jeszcze nie wiem” i odznacz „Kilka aplikacji naraz”: ${found}.`;
  }
}

export const NO_RELAXATION_HINT =
  "W tym mieście nie mamy jeszcze ofert spełniających te warunki. Spróbuj innego miasta albo wróć wkrótce.";

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const intFormat = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 });

export function formatInt(n: number): string {
  return intFormat.format(Math.round(n));
}

const moneyFormat = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });

/** Offer amounts as quoted by the partner, e.g. 11,54 or 80. */
export function formatMoney(n: number): string {
  return moneyFormat.format(n);
}

export function formatHours(n: number): string {
  return oneDecimal.format(Math.round(n * 10) / 10);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export const MISSING_FIELD_LABELS: Record<string, string> = {
  weeklyFee: "kwoty opłaty stałej",
  percent: "procentu dla partnera",
  feeBase: "podstawy naliczania procentu",
  driverShare: "udziału kierowcy",
  weeklyRent: "kosztu wynajmu auta",
};

export function missingFieldsText(fields: string[]): string {
  return `Brakuje: ${fields.map((f) => MISSING_FIELD_LABELS[f] ?? f).join(", ")}.`;
}

// ---------------------------------------------------------------------------
// Verdict sentence at the top of the results (SPEC.md section 2a)
// ---------------------------------------------------------------------------

/** "1 oferta da", "3 oferty dadzą", "5 ofert da" (nominative with the verb). */
function offersWillGive(n: number): string {
  if (n === 1) return "1 oferta da";
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${n} oferty dadzą`;
  return `${n} ofert da`;
}

/** One-sentence verdict for the ranking. Null when no offer could be calculated. */
export function verdictSentence(ranking: RankingResult, answers: DriverAnswers): string | null {
  const ranked = ranking.items.filter((i) => i.group === "ranked" && i.earningsAtHours?.monthlyEarnings != null);
  if (ranked.length === 0) return null;
  const name = (i: (typeof ranked)[number]) => i.partner?.name ?? i.offer.partnerId;
  const H = formatHours(answers.hours);
  const best = ranked[0];
  const bestAmount = formatInt(best.earningsAtHours!.monthlyEarnings!);

  if (ranking.mode === "B" || answers.target === null) {
    return `Najwięcej zarobisz u ${name(best)}: ${bestAmount} zł miesięcznie przy ${H} h.`;
  }

  const X = formatInt(answers.target);
  const fitting = ranked.filter((i) => i.fitsHours);
  if (fitting.length > 0) {
    return `${offersWillGive(fitting.length)} Ci minimum ${X} zł przy ${H} h tygodniowo. Najlepsza: ${name(best)}, ${bestAmount} zł.`;
  }
  const closest = ranked
    .filter((i) => i.extraHours !== null)
    .reduce((a, b) => (b.extraHours! < a.extraHours! ? b : a));
  return `Przy ${H} h tygodniowo żadna oferta nie da ${X} zł. Najbliżej: ${name(closest)}, potrzebujesz o ${formatHours(closest.extraHours!)} h więcej.`;
}
