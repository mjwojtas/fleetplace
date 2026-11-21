# FleetPlace

FleetPlace to porównywarka i marketplace partnerów flotowych dla kierowców aplikacji przewozowych
w Polsce (Warszawa, Kraków, Trójmiasto). Kierowca porównuje oferty partnerów według przewidywanego
zarobku albo liczby godzin potrzebnych do osiągnięcia celu. Partnerzy zarządzają swoimi ofertami
w osobnym panelu.

> **Wersja demonstracyjna.** Projekt nie jest uruchomiony komercyjnie. Wszystkie płatności działają
> w trybie testowym Stripe i nie są pobierane żadne prawdziwe opłaty.

## Status

Wczesny etap prac. Gotowy jest szkielet aplikacji. Ścieżka kierowcy, panel partnera i testowe
płatności powstają krok po kroku zgodnie ze specyfikacją.

## Dokumentacja

- [SPEC.md](SPEC.md) — specyfikacja produktu
- [CLAUDE.md](CLAUDE.md) — zasady techniczne obowiązujące w repozytorium

## Technologia

- [Next.js](https://nextjs.org) (App Router, TypeScript) i Tailwind CSS
- Supabase (baza Postgres, logowanie partnerów) — planowane
- Stripe, wyłącznie tryb testowy — planowane
- Hosting na Vercel — planowane

## Uruchomienie

Wymagania: Node.js w wersji 20.9 lub nowszej (projekt rozwijany na aktualnej wersji LTS).

```bash
npm install
npm run dev
```

Strona będzie dostępna pod adresem http://localhost:3000.

| Polecenie | Opis |
|---|---|
| `npm run dev` | serwer deweloperski |
| `npm run build` | wersja produkcyjna |
| `npm test` | testy jednostkowe (Vitest) |
| `npm run lint` | kontrola kodu (ESLint) |

## Zasady

- **Uczciwy ranking:** kolejność zależy wyłącznie od warunków ofert. Płatne promowanie wyświetla się
  w osobnym, oznaczonym bloku, co sprawdza automatyczny test.
- **Prywatność:** strona dla kierowców nie zbiera danych osobowych. Statystyki są anonimowe.
- **Jakość danych:** każda oferta ma link do publicznego źródła i datę weryfikacji.
- **Klucze:** klucze API są wyłącznie w pliku `.env.local`, który nigdy nie trafia do repozytorium.

## Licencja

[MIT](LICENSE)
