# ♠ Alpha Poker

En liten webapp for å følge et fast hjemmespill i poker. Opprett en **serie**,
del én **invitasjonslenke** med bordet, logg hver kvelds **innkjøp / utbetaling**,
og få en løpende **stilling**. Klikk på et spill for å se hvem som gikk i pluss
eller minus.

Bygget med **Next.js** (App Router) + **Supabase** (Postgres). Laget for å kjøre
helt gratis på gratisnivåene — 0 kr/måned for et hjemmespill på 7 personer.

## Slik fungerer det

- **Ingen brukerkonto.** En serie nås via en hemmelig lenke (`/s/<token>`) eller
  en kort **kode** som skrives inn på forsiden. Alle med lenken/koden kan se og
  legge til spill. Hold den innad i gjengen.
- **Spillere som hopper innom.** Noen som spiller én kveld legges til direkte i
  spillskjemaet — de vises kun på stillingen for de spillene de faktisk var med på.
- **Hemmeligheter kun på server.** Appen snakker med databasen fra serveren med
  Supabase sin service-role-nøkkel. Med row-level security på og ingen offentlige
  policyer er en lekket anon-nøkkel verdiløs.

## Engangsoppsett (~5 minutter)

### 1. Opprett databasen (Supabase)

1. Registrer deg på [supabase.com](https://supabase.com) og opprett et nytt
   prosjekt (**Free**-planen holder). Velg et databasepassord og en region nær deg.
2. Når det er klart, åpne **SQL Editor → New query**, lim inn innholdet i
   [`supabase/schema.sql`](supabase/schema.sql), og klikk **Run**.
3. Gå til **Project Settings → API** og kopier:
   - **Project URL**
   - **`service_role`**-nøkkelen (under "Project API keys" — *ikke* anon-nøkkelen)

### 2. Konfigurer appen

```bash
cp .env.local.example .env.local
```

Rediger `.env.local` og lim inn de to verdiene:

```
SUPABASE_URL=https://DITT-PROSJEKT-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=din-service-role-nokkel
```

### 3. Kjør lokalt

```bash
pnpm install
pnpm dev
```

Åpne <http://localhost:3000>, opprett en serie, og du er i gang.

## Legg ut gratis (Vercel)

1. Push denne mappa til et GitHub-repo.
2. På [vercel.com](https://vercel.com): **Add New → Project**, importer repoet.
3. Under **Environment Variables**, legg til `SUPABASE_URL` og
   `SUPABASE_SERVICE_ROLE_KEY` (samme verdier som i `.env.local`).
4. **Deploy.** Invitasjonslenkene blir `https://din-app.vercel.app/s/<token>`.

Både Supabase Free og Vercel Hobby dekker et ukentlig hjemmespill med god margin —
hele datamengden er noen få hundre KB.

## Filstruktur

```
supabase/schema.sql              Databaseskjema (kjøres én gang i Supabase)
src/lib/supabase.ts              Server-only Supabase-klient (service-role)
src/lib/data.ts                  Spørringer: serie, stilling, spilldetaljer
src/app/actions.ts               Opprett en serie
src/app/s/[token]/page.tsx       Serie-dashbord: stilling + spill
src/app/s/[token]/actions.ts     Legg til / slett et spill
src/app/s/[token]/AddGameForm.tsx  Skjema for innkjøp / utbetaling
src/app/s/[token]/g/[gameId]/    Detaljvisning for ett spill
```

## Datamodell

| tabell         | hva den inneholder                                       |
| -------------- | -------------------------------------------------------- |
| `series`       | en fast spillgruppe + invitasjonstoken og valuta         |
| `players`      | personer i en serie                                      |
| `games`        | én rad per kveld                                          |
| `game_results` | én rad per spiller per spill (innkjøp, utbetaling)       |

`netto = utbetaling - innkjøp`. Stillingen er summen av netto gjennom serien.
