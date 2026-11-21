# FleetPlace — specyfikacja MVP (v2, 21.11.2026)

Zmiany względem v1:
- dodane Trójmiasto,
- nowe pytanie na wejściu o potrzebę kierowcy,
- nowy tryb „Cel zarobku”, czyli obliczenie odwrotne,
- koszt paliwa jako parametr,
- definicja „zarobku” i teksty na stronie (rozdz. 2a),
- prowizja aplikacji i podstawa naliczania opłat partnera w obliczeniach,
- promowanie ofert (rozdz. 3B),
- doprecyzowany cel: nauka budowania produktów z Claude,
- sposób pracy: hybryda (rozdz. 11).

## 1. Cel i zakres
- **Cel:** nauczyć się budować produkty z Claude.
- **Efekt końcowy:**
  - micro-SaaS dostępny publicznie pod adresem w internecie,
  - kod w publicznym repozytorium na GitHubie,
  - **bez komercyjnego uruchomienia**: płatności zostają w trybie testowym Stripe.
- **Model:** strona dla kierowców jest darmowa. Partnerzy mają abonament (Free/Pro) i mogą wykupić promowanie oferty. Wszystkie płatności są testowe.
- **Miasta na start:** Warszawa, Kraków, Trójmiasto.
- **Ograniczenia:**
  - dodatkowe ustalenia organizacyjne są prowadzone poza repozytorium;
  - żadnych prawdziwych przychodów od partnerów;
  - słowo „Bolt” nie pojawia się w nazwie, domenie ani logo;
  - wyłącznie dane z publicznych źródeł, żadnych wewnętrznych danych firm przewozowych;
  - na każdej stronie stały baner: „Wersja demonstracyjna. Płatności są testowe.”

## 2. Ścieżka kierowcy
**Krok 0. Pytanie na wejściu: „Z czym przychodzisz?”**
| Tryb | Kierowca podaje | Wynik | Ranking według |
|---|---|---|---|
| A. Cel zarobku | „Chcę zarobić X zł miesięcznie” | ile godzin tygodniowo musi jeździć u każdego partnera | najmniej godzin |
| B. Dostępny czas | „Mam X godzin tygodniowo” | ile zarobi miesięcznie u każdego partnera | najwyższa kwota |

**Krok 1. Wspólne pytania**
| Wymiar | Warianty | Rola |
|---|---|---|
| Miasto | Warszawa / Kraków / Trójmiasto | twardy filtr |
| Auto | własne / wynajem / bez znaczenia | twardy filtr + koszt wynajmu |
| Aplikacje | tylko Bolt / Bolt i inne | twardy filtr |
| Obrót na godzinę | domyślny, kierowca może zmienić | podstawa obliczeń |
| Paliwo (% obrotu) | domyślny, kierowca może zmienić | koszt, jeśli paliwo nie jest wliczone w ofertę |
| Priorytety (opcjonalnie) | wypłaty codzienne, brak kaucji, język UA/EN | rozstrzyga remisy |

**Krok 2. Wynik:**
- Blok „Promowane” (najwyżej 2 oferty pasujące do filtrów), wyraźnie oznaczony.
- Pod nim ranking ofert, którego kolejności płatność nie zmienia.
- Przy każdej ofercie: wynik (godziny albo kwota), rozbicie kosztów, link do źródła, data weryfikacji, przycisk „Przejdź do partnera”.

## 2a. Definicja „zarobku” (zatwierdzona 21.11.2026)
**Zarobek** = obrót z przejazdów − prowizja aplikacji − opłaty partnera (stała opłata, procent, VAT według oferty) − wynajem auta (jeśli dotyczy) − paliwo (jeśli płaci je kierowca).

- **Obrót:** kwota zapłacona przez pasażerów za przejazdy, **bez napiwków i bonusów**. To założenie ostrożne: napiwki i bonusy tylko podnoszą wynik.
- **Nie odejmujemy:** podatku dochodowego ani składek ZUS i zdrowotnej. Ich wysokość zależy od umowy z partnerem i sytuacji kierowcy.
- **Na stronie nie używamy sformułowania „na rękę”.** Po polsku oznacza ono kwotę po podatkach, więc byłoby mylące. Używamy określenia „Twój zarobek (przed podatkiem)”.

**Teksty na stronie**
| Miejsce | Tekst |
|---|---|
| Pytanie, tryb A | „Ile chcesz zarabiać miesięcznie? (po opłatach i paliwie, przed podatkiem)” |
| Pytanie, tryb B | „Ile godzin tygodniowo chcesz jeździć?” |
| Nagłówek wyniku | „Twój zarobek (przed podatkiem)” |
| Dymek „Co to znaczy?” | „To, co zostaje Ci z opłat za przejazdy po odjęciu: prowizji aplikacji, opłat partnera, wynajmu auta i paliwa. Nie odjęliśmy podatku ani ZUS, bo zależą od Twojej umowy i sytuacji, np. wieku czy statusu studenta. Nie wliczyliśmy napiwków ani bonusów.” |
| Przypis pod rankingiem | „To szacunek na podstawie publicznych ofert z dnia [data] i Twoich założeń. Ostateczne warunki potwierdź u partnera przed podpisaniem umowy.” |
| Ostrzeżenie | „Ponad 60 godzin tygodniowo. Ten cel jest nierealny przy tych założeniach. Zmień kwotę albo założenia.” |
| Etykieta promowania | „Promowane. Partner zapłacił za wyróżnienie. Nie zmienia to rankingu poniżej.” |
| Ranking (pod wynikiem) | „Jak układamy ranking: według Twojego zarobku albo liczby godzin, wyłącznie na podstawie warunków ofert. Płatności partnerów nie wpływają na kolejność.” |

## 3. Funkcje
**A. Strona kierowcy (bez logowania):** ścieżka z punktu 2. Strona nie zbiera danych kierowców, tylko przekierowuje do partnera.

**B. Panel partnera (z logowaniem)**
| Funkcja | Free | Pro (abonament miesięczny) | Promowanie (jednorazowo) |
|---|---|---|---|
| Wpis w rankingu (dane zebrane przez admina) | ✅ | ✅ | — |
| Samodzielna edycja oferty (zatwierdza admin) | — | ✅ | — |
| Statystyki: wyświetlenia, pozycja w obu trybach, przejścia | podstawowe | pełne | — |
| Porównanie z rynkiem w mieście (mediana, kwartyle) | — | ✅ | — |
| Miejsce w bloku „Promowane” (7 lub 30 dni, w wybranym mieście) | — | — | ✅ |

- Płatności są testowe: abonament jako subskrypcja w Stripe, promowanie jako jednorazowa płatność w Stripe.
- Ceny są przykładowe i widoczne tylko w wersji demo.
- **Zasady promowania:**
  - najwyżej 2 miejsca na miasto,
  - wyświetlamy tylko oferty pasujące do filtrów kierowcy,
  - zawsze z etykietą,
  - bez wpływu na kolejność rankingu.

**C. Panel admina (Michał):** weryfikacja i zatwierdzanie ofert, oznaczanie danych starszych niż 30 dni, podgląd abonamentów i promowań.

## 4. Logika obliczeń
Oznaczenia:
- O: tygodniowy obrót
- c: prowizja aplikacji (% obrotu)
- p: procent dla partnera
- b: podstawa naliczania procentu partnera. b = 1, gdy partner liczy od obrotu; b = 1 − c, gdy liczy od kwoty po prowizji aplikacji
- F: stała opłata tygodniowa
- R: wynajem tygodniowy
- f: paliwo jako % obrotu (0, jeśli wliczone w ofertę)
- s: udział kierowcy w modelu podziału, np. 50/50
- h: obrót na godzinę
- 4,33: liczba tygodni w miesiącu (52 ÷ 12)

**Tryb B (czas → zarobek):**
- O = godziny × h
- model z opłatami: zarobek tygodniowo = O × (1 − c − p × b − f) − F − R
- model podziału: zarobek tygodniowo = O × (1 − c) × s, minus O × f, jeśli paliwo płaci kierowca
- zarobek miesięcznie = zarobek tygodniowo × 4,33

**Tryb A (zarobek → czas), wzór odwrotny:**
- cel tygodniowo T = cel miesięczny ÷ 4,33
- model z opłatami: O = (T + F + R) ÷ (1 − c − p × b − f)
- model podziału: O = T ÷ ((1 − c) × s − f), jeśli paliwo płaci kierowca, albo O = T ÷ ((1 − c) × s), jeśli płaci partner
- godziny tygodniowo = O ÷ h

**Kontrola realności:** wynik powyżej 60 godzin tygodniowo oznaczamy jako „nierealne”. Mianownik ≤ 0 oznacza, że oferta nigdy się nie opłaca.

**Przykład na wymyślonych liczbach** (cel 3000 zł miesięcznie, h = 50 zł, f = 15%, c = 0 dla uproszczenia):
| Oferta | Warunki | Potrzebny obrót tygodniowo | Godziny tygodniowo |
|---|---|---|---|
| A | własne auto, F = 50 zł | 874 zł | 17,5 |
| B | wynajem R = 400 zł | 1286 zł | 25,7 |
| C | podział 50/50, paliwo płaci partner | 1386 zł | 27,7 |

## 5. Model danych (wersja robocza)
- **partners:** id, nazwa, miasta[], aplikacje[], www, status (szkic / zweryfikowany / archiwalny)
- **offers:** partner_id, miasto, typ_rozliczenia (stała / procent / mieszany / podział), opłata_stała_tyg, procent, podstawa_naliczania (obrót / po prowizji aplikacji), vat_od (netto / brutto), udział_kierowcy, wynajem_tyg, typ_auta, paliwo_w_cenie, kaucja, częstotliwość_wypłat, języki[], źródło_url, data_weryfikacji, uwagi
- **assumptions:** miasto, obrót_na_godz_domyślny, paliwo_proc_domyślne, prowizja_aplikacji, źródło_url, data
- **subscriptions:** partner_id, plan (free / pro), status, stripe_customer_id, stripe_subscription_id (tryb testowy)
- **promotions:** partner_id, offer_id, miasto, od, do, stripe_payment_id (tryb testowy), status
- **events:** offer_id, tryb (A/B), typ (wyświetlenie / przejście), promowane (tak/nie), data. Zapis anonimowy.

## 6. Technologia
| Warstwa | Wybór | Co daje | Minus |
|---|---|---|---|
| Strona i API | Next.js | jedna baza kodu, najwięcej przykładów i dokumentacji | trudniejszy na start niż sam HTML |
| Baza i logowanie | Supabase (Postgres + logowanie) | gotowe logowanie i baza, darmowy plan | limity darmowego planu do sprawdzenia |
| Płatności | Stripe, tryb testowy: subskrypcje + płatności jednorazowe | prawdziwa obsługa płatności bez pieniędzy | brak |
| Hosting | Vercel | wdrożenie automatycznie przy każdej zmianie na GitHubie | warunki darmowego planu do sprawdzenia |
| Kod | publiczne repozytorium na GitHubie, licencja MIT | otwarty kod, portfolio | kod widoczny dla wszystkich |

## 7. Plan prac
1. Zakres i specyfikacja ✅
2. Dane: model danych + 15–20 partnerów (Warszawa, Kraków, Trójmiasto) + założenia (obrót na godzinę, paliwo, prowizja aplikacji) z publicznych źródeł
3. Strona kierowcy: pytanie na wejściu, tryby A/B, ranking, karty ofert
4. Panel partnera: logowanie, edycja oferty, statystyki, porównanie z rynkiem
5. Płatności testowe w Stripe: abonament Pro + promowanie; panel admina
6. GitHub + wdrożenie pod publicznym adresem + polityka prywatności + baner demo
7. Etap 2: scraping stron partnerów (zgodnie z robots.txt), AI zamienia tekst na dane, człowiek zatwierdza
8. Start (bez komercyjnego uruchomienia) i pomiar

## 8. Kryteria „gotowe”
- Strona działa pod publicznym adresem, a kod jest w publicznym repozytorium na GitHubie.
- Kierowca przechodzi całą ścieżkę w obu trybach: pytanie na wejściu → filtry → ranking → przejście do partnera.
- Partner przechodzi całą ścieżkę: rejestracja → edycja oferty → testowy abonament Pro → testowe promowanie → oferta w bloku „Promowane” → statystyki.
- Co najmniej 15 partnerów w 3 miastach, każda oferta ma źródło i datę weryfikacji nie starszą niż 30 dni.
- Testy obliczeń: wynik trybu A podstawiony do trybu B daje cel z dokładnością do 1 zł.
- Test promowania: zakup promowania nie zmienia kolejności rankingu.

## 9. Otwarte decyzje
1. ~~Konto na GitHubie~~ założone
2. ~~Definicja „zarobku”~~ zatwierdzona, zob. rozdz. 2a
3. Domyślny obrót na godzinę, koszt paliwa i prowizja aplikacji dla każdego miasta, z publicznych źródeł
4. Próg „nierealne” (propozycja: 60 godzin tygodniowo)
5. Licencja (propozycja: MIT)
6. ~~Sposób pracy~~ zatwierdzony: hybryda, zob. rozdz. 11
7. Uwzględnianie VAT w opłatach partnera (pole `vat_od`). Do czasu decyzji obliczenia nie doliczają VAT.

## 10. Ryzyka
| Ryzyko | Skutek | Jak ograniczamy |
|---|---|---|
| Jakość danych | błędne rekomendacje | źródło i data przy każdej ofercie, ręczna weryfikacja |
| Błędne założenia (obrót na godzinę, paliwo, prowizja) | tryb A obiecuje nierealne godziny | publiczne źródło, możliwość zmiany przez kierowcę, wyraźne oznaczenie szacunku |
| Niejasna podstawa naliczania opłat partnera | porównanie ofert nie jest uczciwe | pole „podstawa naliczania” w każdej ofercie; jeśli brak informacji, oferta oznaczona jako niepełna |
| Płatne promowanie podważa zaufanie lub łamie wymogi oznaczania reklam | utrata wiarygodności, ryzyko prawne | osobny, oznaczony blok; ranking niezależny od płatności; opis zasad rankingu na stronie; wymogi prawne do sprawdzenia |
| Ktoś uzna wersję demo za prawdziwą usługę | wprowadzenie w błąd | stały baner demo, płatności tylko testowe |
| Prawo: scraping, RODO | roszczenia | tylko strony partnerów zgodnie z robots.txt, brak danych kierowców |
| Znak towarowy | spór o nazwę | bez „Bolt” w nazwie, sprawdzenie nazwy FleetPlace przed startem |

## 11. Sposób pracy (zatwierdzony 21.11.2026)
- **Michał** buduje w Claude Code (aplikacja Claude na Macu, zakładka Code), w folderze projektu z plikami CLAUDE.md i SPEC.md.
- **Claude w osobnym projekcie (czat):** specyfikacja, polecenia na każdy krok, przegląd wyników, pilnowanie zakresu.
- **Rytm każdego kroku:**
  1. polecenie z projektu,
  2. Claude Code przedstawia plan i Michał go akceptuje,
  3. Claude Code pisze kod i testy,
  4. Michał sprawdza wynik w przeglądarce,
  5. commit,
  6. krótki raport do projektu.
