# FleetPlace — instrukcje dla Claude Code

## O projekcie
FleetPlace to porównywarka i marketplace partnerów flotowych dla kierowców aplikacji przewozowych w Polsce (Warszawa, Kraków, Trójmiasto).
Pełna specyfikacja jest w `SPEC.md`. Przeczytaj ją przed każdym zadaniem. Jeśli istnieje `PRIVATE.md` (poza gitem), przeczytaj go też: jego ograniczenia obowiązują, ale jego treści nie wolno przenosić do plików w repozytorium. Nie zmieniaj zakresu bez pytania.

## Sposób współpracy
Właściciel produktu prowadzi projekt od strony biznesowej i zatwierdza każdy krok.
- Przed pisaniem kodu przedstaw krótki plan (maks. 5 punktów) i poczekaj na akceptację.
- Po każdym kroku wyjaśnij prostym językiem, co zrobiłeś i jak to sprawdzić w przeglądarce.
- Pracuj małymi krokami. Jeden krok = jeden commit z opisem po angielsku.

## Język
- Interfejs strony: polski. Teksty bierz z SPEC.md, rozdz. 2a.
- Kod, nazwy zmiennych, komentarze, commity: angielski.

## Technologia
- Next.js (App Router, TypeScript), Tailwind CSS
- Supabase: baza Postgres + logowanie partnerów
- Stripe: **WYŁĄCZNIE tryb testowy**
- Hosting: Vercel. Kod: publiczne repozytorium na GitHubie, licencja MIT.

## Zasady, których nie wolno łamać
1. **Sekrety:** klucze API trzymaj tylko w `.env.local` (w `.gitignore`). Nigdy nie commituj kluczy.
2. **Stripe:** akceptuj tylko klucze zaczynające się od `sk_test_` / `pk_test_`. Jeśli ktoś poda klucz `sk_live_`, zatrzymaj się i odmów.
3. **Nazwa:** słowo „Bolt” nie może pojawić się w nazwie, logo ani domenie. W treści wolno pisać o aplikacjach przewozowych (Bolt, Uber, FreeNow) tylko opisowo.
4. **Dane osobowe:** strona dla kierowców nie zbiera żadnych danych osobowych. Statystyki zapisujemy anonimowo.
5. **Ranking:** kolejność rankingu zależy wyłącznie od warunków ofert. Promowanie wyświetla się w osobnym, oznaczonym bloku. Musi istnieć test, który to sprawdza.
6. **Obliczenia:** cała logika z SPEC.md, rozdz. 4, w jednym module (`lib/calc.ts`) z testami jednostkowymi. Obowiązkowy test: wynik trybu A podstawiony do trybu B daje cel z dokładnością do 1 zł.
7. **Dane ofert:** każda oferta ma `source_url` i `verified_at`. Nie wymyślaj danych partnerów. Jeśli czegoś brakuje, oznacz ofertę jako niepełną.
8. **Baner demo** na każdej stronie: „Wersja demonstracyjna. Płatności są testowe.”

## Polecenia
- uruchomienie lokalne: `npm run dev` (adres: http://localhost:3000)
- testy: `npm test` (Vitest)
- lint: `npm run lint`
- Projekt leży na iCloud Drive: `node_modules` i `.next` są wyłączone z synchronizacji przez `scripts/icloud-ignore.mjs` (uruchamia się samo przy `npm install`, `npm run dev`, `npm run build`).
