# Våre hjem — Utviklingsplan

## Status: Phase 3 delvis fullført

---

## ✅ Fullført

### Phase 1: Core
- [x] Home type med `homeType` (house, summerCabin, winterCabin, apartment)
- [x] Custom SVG-ikoner for alle typer + `instruksjon` + `paintColor` + `vedlikehold`
- [x] `homeService.ts` med full CRUD for hjem, prosjekter, fargekoder
- [x] HomeSpaceScreen — legg til/rediger/slett hjem med bilde, adresse, kart
- [x] HomeDetailScreen — tile-grid med Instruksjoner, Vedlikehold og Prosjekter
- [x] Tile-kort: ikon → navn → beskrivelse → bilde → kart
- [x] Google Places autofullføring med postnummer/sted
- [x] Aktivert i Våre steder ("Våre hjem")
- [x] Navigasjon, Firestore-regler, indekser, oversettelser (5 språk)

### Phase 2: Prosjekter
- [x] HomeProjectListScreen — legg til/rediger/slett prosjekter med status (Aktiv/På vent/Ferdig)
- [x] HomeProjectDetailScreen — prosjektdetalj med Fargekoder-seksjon
- [x] CRUD for prosjekter i `homeService.ts`

### Phase 3: Farger + AI (delvis)
- [x] AI cloud function `homeExtractColor` — GPT-4o-mini vision for bilde + tekst-oppslag
- [x] Kamera og galleri-alternativer for etiketter og vegger
- [x] "Hent farge"-knapp — skriv inn en kode, AI slår opp hex-farge
- [x] Farge-swatch-visning med hex-farge
- [x] Lang-press for å slette farger

---

## 📋 Gjenstående

### Phase 3: Farger (resterende)
- [ ] Legg til manuelt hex-farge-input-felt (så brukere kan skrive hex uten AI)
- [ ] Fargevelger for visuell valg

### Phase 3.5: Instruksjoner
- [ ] Seksjon "Komme hjem" og "Forlate hjem" — instruksjoner for ankomst og avreise
- [x] AI foto-til-tekst: ta bilde av håndskrevne notater, AI leser og skriver til instruksjonene
- [x] Manuell legg til/rediger/slett instruksjoner
- [ ] Mulighet til å laste opp bilder av instruksjoner

### Phase 3.6: Vedlikehold
- [x] Serviceavtaler-seksjon med kalender-ikon
- [x] Legg til/rediger/slett service med type, dato, intervall, påminnelse
- [x] Intervall: en gang, månedlig, kvartalsvis, årlig
- [x] Påminnelser: Ingen, 30 min, 1 time, 2 timer, 1 dag, 1 uke
- [x] Farger-seksjon med AI foto-uttrekk og "Hent farge"
- [x] Custom ikoner for vedlikehold-seksjonene

### Phase 4: Handleliste + Tilbud
- [x] Handleliste per prosjekt med priser og totalberegning
- [x] Prisberegning: totalpris for alle varer + sjekkede varer
- [x] Budsjett-oversikt: antall varer, totalkostnad, sjekket kostnad
- [ ] Tilbud-opplasting med AI OCR-uttrekk (leverandør, pris, varer)
- [ ] Budsjett-sammenligning: tilbud vs. faktiske kostnader

### Phase 5: Oppgavetavle (Kanban)
- [ ] Tavle med 3 kolonner: Todo → Pågående → Ferdig
- [ ] Koble oppgaver til handleliste-varer
- [ ] Legg til oppgaver direkte fra handleliste
- [ ] Dra og slipp mellom kolonner

### AI-funksjoner
- [x] Fargeuttrekk fra bilder (etiketter + vegger)
- [ ] Fargeoppslag fra kode (Jotun, NCS, RAL)
- [ ] Prosjektforslag basert på prosjekt-tittel
- [ ] Handleliste fra bilde/kvittering

---

## Filstruktur

```
src/
  types/index.ts              — Home, HomeProject, HomePaintColor
  services/homeService.ts     — CRUD for hjem, prosjekter, fargekoder
  screens/HomeSpaceScreen.tsx — Liste over hjem
  screens/HomeDetailScreen.tsx — Tile-grid per hjem
  screens/HomeProjectListScreen.tsx — Liste over prosjekter
  screens/HomeProjectDetailScreen.tsx — Prosjektdetalj med farger
functions/index.js            — homeExtractColor AI-funksjon
firestore.rules                — Regler for homes, homeProjects, homePaintColors
firestore.indexes.json         — Indekser for homes, homeProjects, homePaintColors
```

## Firestore-samlinger
- `homes` — hjem (familyId-scoped)
- `homeProjects` — prosjekter (familyId + homeId)
- `homePaintColors` — fargekoder (familyId + homeId)

## AI Cloud Functions
- `homeExtractColor` — bilde-OCR + fargekode-oppslag via GPT-4o-mini
