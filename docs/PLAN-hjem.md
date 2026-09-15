# Våre hjem — Utviklingsplan

## Status: Phase 4 fullført, Phase 5 gjenstående

---

## ✅ Fullført

### Phase 1: Core
- [x] Home type med `homeType` (house, summerCabin, winterCabin, apartment)
- [x] Custom SVG-ikoner for alle typer + `instruksjon` + `paintColor` + `vedlikehold` + `comingHome` + `leavingHome`
- [x] `homeService.ts` med full CRUD for hjem, prosjekter, fargekoder, instruksjoner, service, handleliste, tilbud
- [x] HomeSpaceScreen — legg til/rediger/slett hjem med bilde, adresse, kart
- [x] HomeDetailScreen — tile-grid med Instruksjoner, Vedlikehold og Prosjekter
- [x] Tile-kort: ikon → navn → beskrivelse → bilde → kart
- [x] Google Places autofullføring med postnummer/sted
- [x] Aktivert i Våre steder ("Våre hjem")
- [x] Navigasjon, Firestore-regler, indekser, oversettelser (5 språk)

### Phase 2: Prosjekter
- [x] HomeProjectListScreen — legg til/rediger/slett prosjekter med status og budsjett
- [x] HomeProjectDetailScreen — prosjektdetalj med alle seksjoner
- [x] CRUD for prosjekter i `homeService.ts`
- [x] Budsjett-felt på prosjekt
- [x] Budsjett-oversikt i header: budsjett, forbrukt, gjenstående

### Phase 3: Farger + AI
- [x] AI cloud function `homeExtractColor` — bilde-OCR + fargekode-oppslag via GPT-4o-mini
- [x] Kamera og galleri-alternativer for etiketter og vegger
- [x] "Hent farge"-knapp — skriv inn en kode, AI slår opp hex-farge
- [x] Farge-swatch-visning med hex-farge
- [x] Lang-press for å slette farger
- [ ] Manuelt hex-farge-input-felt

### Phase 3.5: Instruksjoner
- [x] Seksjon "Komme hjem" og "Forlate hjem" med custom ikoner
- [x] AI foto-til-tekst: ta bilde av håndskrevne notater
- [x] Manuell legg til/rediger/slett instruksjoner

### Phase 3.6: Vedlikehold
- [x] Serviceavtaler-seksjon med kalender-ikon
- [x] Legg til/rediger/slett service med type, dato, intervall, påminnelse
- [x] Intervall: en gang, månedlig, kvartalsvis, årlig
- [x] Påminnelser: Ingen, 30 min, 1 time, 2 timer, 1 dag, 1 uke
- [x] Farger-seksjon med AI foto-uttrekk og "Hent farge"
- [x] Prosjektnavn vises på farger i Vedlikehold

### Phase 4: Handleliste + Tilbud
- [x] Handleliste per prosjekt med priser og totalberegning
- [x] Prisberegning: totalpris for alle varer + sjekkede varer
- [x] Budsjett-oversikt: antall varer, totalkostnad, sjekket kostnad
- [x] Tilbud-opplasting med AI OCR-uttrekk (leverandør, pris, varer)
- [x] Tilbud-seksjon med budsjett-oversikt
- [x] Kvitteringsskanning: AI leser kvittering og legger til varer automatisk
- [x] Kvitteringsopplasting per vare

---

## 📋 Gjenstående

### Phase 5: Oppgavetavle (Kanban)
- [ ] Tavle med 3 kolonner: Todo → Pågående → Ferdig
- [ ] Koble oppgaver til handleliste-varer
- [ ] Legg til oppgaver direkte fra handleliste
- [ ] Dra og slipp mellom kolonner

### AI-funksjoner
- [x] Fargeuttrekk fra bilder (etiketter + vegger)
- [x] Fargeoppslag fra kode (Jotun, NCS, RAL)
- [x] Instruksjoner fra håndskrevne notater
- [x] Kvitteringsskanning for handleliste
- [ ] Prosjektforslag basert på prosjekt-tittel
- [ ] Handleliste fra bilde/kvittering (utenfor prosjekt)

### Mindre forbedringer
- [ ] Manuelt hex-farge-input-felt
- [ ] Fargevelger for visuell valg
- [ ] Mulighet til å laste opp bilder av instruksjoner
