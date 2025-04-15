# Polish Tax Information Assistant

Backend serwisu do automatycznego pozyskiwania informacji podatkowych ze strony podatki.gov.pl, zapisywania ich w wektorowej bazie danych i udostępniania API do zadawania pytań w oparciu o zgromadzoną wiedzę. Aplikacja została napisana w TypeScript z wykorzystaniem AI do przetwarzania języka naturalnego.

## Funkcje

- Automatyczne pobieranie danych z mapy serwisu podatki.gov.pl co 4 godziny
- Zapisywanie treści w bazie danych wektorowej Qdrant
- API do zadawania pytań i uzyskiwania odpowiedzi na podstawie pobranych danych

## Technologie

- **Backend:** Node.js, TypeScript, Express.js (lub odpowiednik)
- **Scraping:** Playwright
- **Baza Danych:** Qdrant (wektorowa)
- **AI/LLM:** OpenAI API
- **Deployment:** Docker, PM2 (opcjonalnie)

## Wymagania

- Node.js 18+
- Docker & Docker Compose (do wdrożenia produkcyjnego)
- TypeScript

## Instalacja

### Instalacja lokalna

1. Sklonuj repozytorium:
   ```bash
   git clone <URL_REPOZYTORIUM>
   cd <NAZWA_KATALOGU_REPO>
   ```

2. Zainstaluj zależności:
   ```bash
   npm install
   ```

3. Zainstaluj przeglądarkę dla Playwright:
   ```bash
   npx playwright install chromium --with-deps
   ```

4. Skopiuj przykładowy plik .env:
   ```bash
   cp .env.example .env
   ```

5. Edytuj plik `.env` i uzupełnij klucze API.

### Wdrożenie produkcyjne z użyciem Docker

1. Skopiuj przykładowy plik .env:
   ```bash
   cp .env.example .env
   ```

2. Edytuj plik `.env` i uzupełnij klucze API.

3. Zbuduj i uruchom kontenery:
   ```bash
   docker compose up -d
   ```

### Wdrożenie za pomocą PM2 (bez Docker)

1. Skopiuj przykładowy plik .env:
   ```bash
   cp .env.example .env
   ```

2. Edytuj plik `.env` i uzupełnij klucze API.

3. Skompiluj kod TypeScript:
   ```bash
   npm run build
   ```

4. Zainstaluj PM2 globalnie:
   ```bash
   npm install -g pm2
   ```

5. Uruchom aplikację z PM2:
   ```bash
   pm2 start ecosystem.config.js
   ```

6. Skonfiguruj automatyczny start po reboocie:
   ```bash
   pm2 startup
   pm2 save
   ```

## Rozwój

### Uruchomienie w trybie rozwojowym

```bash
npm run dev
```

### Kompilacja kodu TypeScript

```bash
npm run build
```

### Lintowanie kodu

```bash
npm run lint
```

## Użycie

### API Endpoints

#### Zadawanie pytań

```
POST /api/ask
Content-Type: application/json

{
  "question": "Jakie są stawki podatku VAT w Polsce?"
}
```

Przykładowa odpowiedź:
```json
{
  "answer": "W Polsce obowiązują następujące stawki podatku VAT: 23% (stawka podstawowa), 8% i 5% (stawki obniżone) oraz 0% dla niektórych towarów i usług eksportowych.",
  "source": "https://www.podatki.gov.pl/vat/stawki-podatkowe/",
  "timestamp": "2023-06-14T14:27:33.620Z"
}
```

#### Sprawdzenie stanu serwera

```
GET /health
```
Zwraca status działania aplikacji (np. `{"status": "ok"}`).

#### Metryki

```
GET /metrics
```
Zwraca metryki serwera w formacie Prometheus, przydatne do monitorowania wydajności.

### Przykład użycia z curl

```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Jakie są stawki podatku VAT w Polsce?"}'
```

## Monitorowanie

Możesz monitorować logi aplikacji:

```bash
# Jeśli używasz Docker
docker compose logs -f

# Jeśli używasz PM2
pm2 logs tax-assistant
```

## Konfiguracja

Wszystkie opcje konfiguracyjne są dostępne w pliku `.env`. Najważniejsze z nich to:

| Zmienna             | Opis                                            | Domyślna wartość |
| ------------------- | ----------------------------------------------- | ---------------- |
| OPENAI_API_KEY      | Klucz API OpenAI                                | -                |
| QDRANT_URL          | URL do instancji Qdrant                         | -                |
| QDRANT_API_KEY      | Klucz API Qdrant                                | -                |
| PORT                | Port, na którym działa serwer                   | 3000             |
| LOG_LEVEL           | Poziom logowania (debug, info, warn, error)     | info             |
| SKIP_INITIAL_SCRAPE | Czy pomijać początkowe scrapowanie przy starcie | false            |

**Ważne:** Klucze API (`OPENAI_API_KEY`, `QDRANT_API_KEY`) są danymi wrażliwymi. Przechowuj je bezpiecznie i nigdy nie umieszczaj ich bezpośrednio w kodzie ani nie dodawaj do repozytorium Git. Używaj pliku `.env` (który powinien być w `.gitignore`) do ich przechowywania.

## Licencja

[MIT](LICENSE) 