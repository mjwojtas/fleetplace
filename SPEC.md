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

## 2. Ścieżka kierowcy (zatwierdzona 22.11.2026)
**Krok 1. Wywiad: 5 pytań, jedno na ekran, odpowiedzi jako kafelki, pasek postępu 1/5, przycisk „Wstecz”, bez danych osobowych**
| # | Pytanie | Odpowiedzi | Rola |
|---|---|---|---|
| 1 | Gdzie chcesz jeździć? | Warszawa / Kraków / Trójmiasto | twardy filtr miasta + domyślne założenia |
| 2 | Ile czasu chcesz poświęcić na jazdę? | Dorywczo, np. weekendy (~12 h tyg.) / Pół etatu (~20 h) / Pełen etat (~40 h) / Więcej (~50 h) | dostępne godziny H |
| 3 | Ile chcesz zarobić minimum miesięcznie? *(po opłatach i paliwie, przed podatkiem)* | 1500 / 3000 / 5000 / 7000 zł / „Nie wiem, pokaż, ile zarobię” | cel minimalny X (tryb A); „Nie wiem” = tryb B |
| 4 | Czym chcesz jeździć? | Własnym autem / Wynajętym autem tylko dla mnie / Autem na zmiany z innym kierowcą / Jeszcze nie wiem | twardy filtr: own / rental / split / brak filtra |
| 5 | Co jest dla Ciebie ważne? *(dowolna liczba odpowiedzi, także żadna)* | Kilka aplikacji naraz / Bez kaucji / Szybkie wypłaty / Obsługa po ukraińsku lub angielsku / Brak opłat w tygodniu bez jazdy | „Kilka aplikacji” = twardy filtr; pozostałe = oznaczenia na kartach i rozstrzyganie remisów |

**Krok 2. Podsumowanie (moment zaangażowania):** jedno zdanie, np. „Szukamy partnera dla kierowcy z Krakowa, który chce zarobić minimum 3000 zł miesięcznie, jeżdżąc około 20 godzin tygodniowo własnym autem.” Przycisk: „Pokaż moich partnerów”.

**Krok 3. Wynik:**
- Blok „Promowane” (najwyżej 2 oferty pasujące do filtrów), wyraźnie oznaczony.
- Ranking (tryb A, gdy podano X):
  - dla każdej oferty liczymy godziny potrzebne do X;
  - porównujemy z H: „✅ Mieścisz się w H h” albo „⚠ Potrzebujesz N h, czyli o N − H h więcej”.
- Kolejność w obu trybach (zmienione 22.11.2026): zarobek miesięczny przy H godzinach, malejąco. Przy stałym H oferty mieszczące się w H i tak są na górze, bo dają co najmniej X.
- Przy każdej ofercie na pierwszym planie: „Zarobisz [kwota] zł miesięcznie, pracując [H] h tygodniowo”, do tego zarobek na godzinę jazdy, a w trybie A godziny potrzebne do X.
- Przy każdej ofercie: wynik, rozbicie kosztów, oznaczenia priorytetów, link do źródła, data weryfikacji, przycisk „Przejdź do partnera”.
- Panel „Twoje założenia” (można zmienić): obrót na godzinę, paliwo (% obrotu, LPG / benzyna), prowizja aplikacji, godziny H.
- Gdy nic nie pasuje: podpowiedź, który filtr poluzować.

**Pomiar:** anonimowe zdarzenia dla każdego pytania (ile osób przechodzi dalej i ile kończy wywiad).

## 2a. Definicja „zarobku” (zatwierdzona 21.11.2026)
**Zarobek** = obrót z przejazdów − prowizja aplikacji − VAT od przejazdów (według oferty, domyślnie 8%) − opłaty partnera (stała opłata, procent) − wynajem auta (jeśli dotyczy) − paliwo (jeśli płaci je kierowca).

- **Obrót:** kwota zapłacona przez pasażerów za przejazdy, **bez napiwków i bonusów**. To założenie ostrożne: napiwki i bonusy tylko podnoszą wynik.
- **Nie odejmujemy:** podatku dochodowego ani składek ZUS i zdrowotnej. Ich wysokość zależy od umowy z partnerem i sytuacji kierowcy.
- **Na stronie nie używamy sformułowania „na rękę”.** Po polsku oznacza ono kwotę po podatkach, więc byłoby mylące. Używamy określenia „Twój zarobek (przed podatkiem)”.

**Teksty na stronie**
| Miejsce | Tekst |
|---|---|
| Pytanie 3 wywiadu | „Ile chcesz zarobić minimum miesięcznie? (po opłatach i paliwie, przed podatkiem)” |
| Pytanie 2 wywiadu | „Ile czasu chcesz poświęcić na jazdę?” |
| Nagłówek wyniku | „Twój zarobek (przed podatkiem)” |
| Dymek „Co to znaczy?” | „To, co zostaje Ci z opłat za przejazdy po odjęciu: prowizji aplikacji, opłat partnera, wynajmu auta i paliwa. Nie odjęliśmy podatku ani ZUS, bo zależą od Twojej umowy i sytuacji, np. wieku czy statusu studenta. Nie wliczyliśmy napiwków ani bonusów.” |
| Przypis pod rankingiem | „To szacunek na podstawie publicznych ofert z dnia [data] i Twoich założeń. Ostateczne warunki potwierdź u partnera przed podpisaniem umowy.” |
| Ostrzeżenie | „Ponad 60 godzin tygodniowo. Ten cel jest nierealny przy tych założeniach. Zmień kwotę albo założenia.” |
| Strata (tryb B, zarobek < 0) | „Przy tej liczbie godzin koszty (np. wynajem) są wyższe niż to, co zarobisz. Zwiększ liczbę godzin albo wybierz ofertę bez stałych opłat.” |
| Etykieta promowania | „Promowane. Partner zapłacił za wyróżnienie. Nie zmienia to rankingu poniżej.” |
| Ranking (pod wynikiem) | „Jak układamy ranking: według Twojego zarobku miesięcznego przy podanej liczbie godzin, wyłącznie na podstawie warunków ofert. Płatności partnerów nie wpływają na kolejność.” |
| Wprowadzenie, tytuł *(propozycja, krok 3)* | „Znajdź partnera flotowego, który się opłaca” |
| Wprowadzenie, tekst *(propozycja)* | „Odpowiedz na 5 krótkich pytań. Porównamy oferty partnerów w Twoim mieście i pokażemy, ile zarobisz albo ile musisz jeździć. Nie pytamy o imię, telefon ani e-mail.” |
| Podsumowanie, tryb B *(propozycja)* | „Szukamy partnera dla kierowcy z [miasta], który chce sprawdzić, ile zarobi, jeżdżąc około [H] godzin tygodniowo [autem].” |
| Brak obrotu na godzinę *(propozycja)* | „Nie mamy publicznego źródła obrotu na godzinę dla tego miasta. Wpisz w „Twoich założeniach”, ile średnio płacą pasażerowie za godzinę jazdy, a policzymy wynik.” |
| VAT założony *(propozycja)* | „Oferta nie podaje VAT od przejazdów, przyjęliśmy 8%.” |
| Nigdy się nie opłaca *(propozycja)* | „Przy tych założeniach ta oferta się nie opłaca: koszty rosną szybciej niż zarobek.” |
| Oferty niepełne *(propozycja)* | Nagłówek „Oferty z niepełnymi danymi”, tekst „Nie liczymy wyniku, bo źródło nie podaje wszystkich warunków.”, przy ofercie „Brak informacji o: [pola].” |
| Pusty wynik *(propozycja)* | „Żadna oferta nie pasuje do Twoich odpowiedzi.” + podpowiedź, np. „Odznacz „Kilka aplikacji naraz”: znajdziesz N ofert.” albo „Zmień odpowiedź „Czym chcesz jeździć?” na „Jeszcze nie wiem”: znajdziesz N ofert.” |
| Pusty wynik, brak podpowiedzi *(propozycja)* | „W tym mieście nie mamy jeszcze ofert spełniających te warunki. Spróbuj innego miasta albo wróć wkrótce.” |

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
- v: VAT od przejazdów ponoszony przez kierowcę, jako % obrotu (z oferty; gdy brak, założenie domyślne 8%, oznaczone w wyniku)
- s: udział kierowcy w modelu podziału, np. 50/50
- h: obrót na godzinę
- 4,33: liczba tygodni w miesiącu (52 ÷ 12)

**Tryb B (czas → zarobek):**
- O = godziny × h
- model z opłatami: zarobek tygodniowo = O × (1 − c − p × b − f − v) − F − R
- model podziału: zarobek tygodniowo = O × ((1 − c) × s − f − v) − R (R = opłata za auto, jeśli jest; f = 0, gdy paliwo płaci partner)
- zarobek miesięcznie = zarobek tygodniowo × 4,33

**Tryb A (zarobek → czas), wzór odwrotny:**
- cel tygodniowo T = cel miesięczny ÷ 4,33
- model z opłatami: O = (T + F + R) ÷ (1 − c − p × b − f − v)
- model podziału: O = (T + R) ÷ ((1 − c) × s − f − v)
- godziny tygodniowo = O ÷ h

**Kontrola realności:** wynik powyżej 60 godzin tygodniowo oznaczamy jako „nierealne”. Mianownik ≤ 0 oznacza, że oferta nigdy się nie opłaca.

**Przykład na wymyślonych liczbach** (cel 3000 zł miesięcznie, h = 50 zł, f = 15%, c = 0, v = 0 dla uproszczenia):
| Oferta | Warunki | Potrzebny obrót tygodniowo | Godziny tygodniowo |
|---|---|---|---|
| A | własne auto, F = 50 zł | 874 zł | 17,5 |
| B | wynajem R = 400 zł | 1286 zł | 25,7 |
| C | podział 50/50, paliwo płaci partner | 1386 zł | 27,7 |

## 5. Model danych (wersja robocza)
- **partners:** id, nazwa, miasta[], aplikacje[], www, status (szkic / zweryfikowany / archiwalny)
- **offers:** partner_id, miasto, typ_rozliczenia (stała / procent / mieszany / podział), opłata_stała_tyg, procent, podstawa_naliczania (obrót / po prowizji aplikacji), vat_od (netto / brutto), udział_kierowcy, wynajem_tyg, typ_auta, paliwo_w_cenie, kaucja, częstotliwość_wypłat, języki[], vat_od_przejazdów (ułamek obrotu lub brak), aplikacje_w_cenie[], brak_opłaty_bez_jazdy (tak/nie/brak), źródło_url, data_weryfikacji, uwagi
- **assumptions:** miasto, obrót_na_godz_domyślny (może być pusty — wtedy kierowca wpisuje sam), paliwo_proc_domyślne, prowizja_aplikacji, vat_od_przejazdów_domyślny, źródło_url, data
- **subscriptions:** partner_id, plan (free / pro), status, stripe_customer_id, stripe_subscription_id (tryb testowy)
- **promotions:** partner_id, offer_id, miasto, od, do, stripe_payment_id (tryb testowy), status
- **events:** offer_id (opcjonalnie), tryb (A/B), typ (pytanie_1…5 / podsumowanie / wyświetlenie / przejście), promowane (tak/nie), data. Zapis anonimowy.

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
- Kierowca przechodzi całą ścieżkę w obu trybach: wywiad (5 pytań) → podsumowanie → ranking → przejście do partnera.
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
7. VAT (poprawione 21.11.2026): (a) VAT od opłat partnera — przy wpisywaniu danych podajemy kwoty, które kierowca faktycznie płaci; (b) VAT od przejazdów — osobne pole oferty v (np. 8%, 5%, 0%), bo różni się między partnerami i jest jednym z największych kosztów; gdy brak informacji, założenie 8% oznaczone w wyniku.
8. Walidacja danych: procenty jako ułamki 0–1, kwoty ≥ 0. Oferta z błędnymi danymi nie trafia do rankingu.

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

## 12. Dane startowe (21.11.2026)
- Plik seed-offers.json: 16 partnerów, 26 ofert (Warszawa 11, Kraków 9, Trójmiasto 6), status „draft” do ręcznej weryfikacji.
- 10 ofert niepełnych: brak podstawy naliczania procentu, brak cen albo brak obrotu na godzinę dla Trójmiasta.
- Do rozszerzenia obliczeń: model progowy (np. brak opłat powyżej 3000 zł obrotu tygodniowo).
