# fampad — Brukerveiledning

<p align="center">
  <img src="../../assets/icon.png" alt="fampad Logo" width="120" height="120" />
</p>

<p align="center"><strong>Familiens alt-i-ett organisasjonshub</strong></p>

---

## Innholdsfortegnelse

1. [Kom i gang](#kom-i-gang)
2. [Navigasjonsoversikt](#navigasjonsoversikt)
3. [Avtaler og kalender](#avtaler-og-kalender)
4. [Chat](#chat)
5. [Hurtigopprett-knappen (+)](#hurtigopprett-knappen)
6. [AI-assistent](#ai-assistent)
7. [Din uke](#din-uke)
8. [Våre steder (moduler)](#våre-steder-moduler)
   - [Våre reiser](#våre-reiser)
   - [Vår helse](#vår-helse)
   - [Vår skole](#vår-skole)
   - [Vår barnehage](#vår-barnehage)
   - [Våre bursdager](#våre-bursdager)
   - [Våre kjæledyr](#våre-kjæledyr)
   - [Vår mat (Matsenter)](#vår-mat)
   - [Våre hjem](#våre-hjem)
   - [Handlelister](#handlelister)
9. [Tale- og fotooppretting](#tale-og-fotooppretting)
10. [Datovelger og påminnelser](#datovelger-og-påminnelser)
11. [Profil og innstillinger](#profil-og-innstillinger)
12. [Kalendersynk](#kalendersynk)
13. [Temaer](#temaer)
14. [Språk](#språk)
15. [PWA og installasjon](#pwa-og-installasjon)
16. [Tips og triks](#tips-og-triks)

---

## Kom i gang

### Opprette konto

1. Åpne fampad i nettleseren (eller som installert PWA)
2. Registrer deg med e-post og passord — eller logg inn hvis du allerede har konto
3. Velg språk i steg 2 i velkomst-guiden (norsk, svensk, dansk, engelsk, finsk)
4. Opprett eller bli med i en familie i steg 3 — eller hopp over og gjør det senere i Profilen

### Oppsett av familie

Etter innlogging må du opprette eller bli med i en familie:

**Alternativ A: Opprett ny familie**
1. Gå til **Profil**-fanen
2. Trykk «Opprett familie»
3. Skriv inn familienavnet
4. Du blir familiens **eier**

**Alternativ B: Bli med i eksisterende familie**
1. Be en eier/admin generere en invitasjonskode (Profil > Familie > «Inviter medlem»)
2. Åpne invitasjonslenken som deles, eller skriv inn den 6-tegns koden
3. Du blir med som **medlem**

### Forstå familieroller

| Rolle | Rettigheter |
|-------|-------------|
| **Eier** | Full kontroll. Kan administrere alle medlemmer. Kan ikke forlate familien. |
| **Admin** | Kan invitere, fjerne medlemmer og endre roller. |
| **Medlem** | Kan opprette og redigere innhold. Kan ikke administrere andre medlemmer. |

---

## Navigasjonsoversikt

fampad bruker en bunntab-bar med fire faner rundt en sentral «+»-knapp.

| # | Fane | Ikon | Beskrivelse |
|---|------|------|-------------|
| 1 | **Avtaler** | Kalender | Samlet kalender fra alle familiekilder (manuelle avtaler, Spond, helse, kjæledyr, skole/barnehage, hjem, bursdager) |
| 2 | **Chat** | Boble | Familiemeldinger med bilder og reaksjoner |
| 3 | **Våre steder** | Hus | Inngang til alle moduler |
| 4 | **Profil** | Person | Innstillinger, familieadministrasjon, integrasjoner |

Den sentrale **+**-knappen åpner **Hurtigopprett**-menyen. Tab-bar skjules automatisk når du skriver i chatten.

---

## Avtaler og kalender

Avtaler-fanen viser en samlet kalender for hele familien.

### Visning

- **Listevisning**: Avtaler gruppert per dag med ukenummer-banner
- **Kalendervisning**: Månedsvgridd med prikker per dag — trykk på en prikk/dag for å se dagen
- Vis/skjul tidligere avtaler
- Filtrér på modul og kilde (inkl. Spond-grupper med logoer)
- «**Din uke**»-knappen øverst åpner ukentlig oppsummering (se egen seksjon)

### Kilder av avtaler

Avtaler kommer fra mange kilder og er fargekodet etter modul:

| Kilde | Farge |
|-------|-------|
| Manuelle avtaler | #3b5a75 |
| Reiser | #7EC8E3 |
| Helse (timer/medisiner/vaksiner) | #C67B5C |
| Skoleaktiviteter og -fridager | #6B8F71 |
| Barnehageaktiviteter | #E8836A |
| Kjæledyr (vet/besøk/vaksiner) | #9B7DB8 |
| Bursdager | #E6A817 |
| Hjem (serviceavtaler) | #6B7B8D |
| Måltider (Matsenter) | #E8906C |
| Spond-arrangementer | Vist med gruppelogo |

### Opprette en avtale

1. Trykk **+** → «Manuelt» → «Avtale»
2. Fyll ut:
   - **Tittel** (påkrevd)
   - **Dato** og valgfri sluttdato
   - **Tid** og valgfri sluttid
   - **Adresse** (Google Places-søk)
   - **Ikon** (20 forhåndsdefinerte, f.eks. Middag, Bursdag, Sport, Kino, Trening, Fjelltur)
   - **Personer** (velg familiemedlemmer)
   - **Beskrivelse** (valgfrie notater)
   - **Påminnelse** (Ingen, 30 min, 1 time, 2 timer, 1 dag, 1 uke)
   - **Gjentakelse** (planlegg dager/uker, oddetall og partall-uker — f.eks. «annenhver uke»)
   - **Dokumenter** (last opp vedlegg)
3. Trykk «Lagre»

### Avtaledetaljer

Trykk på en avtale for å se:
- Full dato, tid, sted
- Statisk kart + «Åpne i Google Maps» (når adresse finnes)
- Notat, dokumenter, ikon og personer koblet til avtalen
- «Legg til i Google/Outlook-kalender»-knapper (web)
- Rediger/slett via lang-trykk (ActionModal)
- Spond-arrangementer: respondentstatus-stempler (akseptert/avslått/ikke svart, inkludert barn) og mulighet til å endre eget svar

### Spond-arrangementer

Hvis du har koblet til Spond i Profil-innstillingene:
- Spond-arrangementer fra gruppene dine vises automatisk
- Du ser svarstatus for familiemedlemmer
- Trykk på arrangementet for detaljer og endre eget svar
- Gruppelogoer lastes opp i Profilen (egendefinert logo per gruppe)
- Spond-synkroniseringen kjører automatisk hvert 30. minutt

---

## Chat

Chat-fanen gir familiemeldinger i sanntid.

### Sende meldinger

1. Skriv meldingen (maks 500 tegn)
2. Trykk send-knappen

### Dele bilder

1. Trykk bilde-ikonet ved tekstfeltet
2. Velg fra bildebibliotek eller ta nytt foto
3. Forhåndsvis bildet
4. Send — bildet lastes opp til Firebase Storage

### Reaksjoner

- Trykk «+»-knappen ved meldingen for å åpne reaksjonsvelgeren
- Tilgjengelige reaksjoner: Like 👍, Smile 😊, Heart ❤️
- Antall vises per reaksjon; trykk på en reaksjons-badge for å like/ulike
- Dine egne reaksjoner er uthevede

### Funksjoner

- Sanntidsoppdatering via Firestore
- Dagsskiller «I dag» / «I går» mellom meldingsgrupper
- Avatare ved meldinger
- Siste 100 meldinger lastes, maks 500 tegn per melding
- Andre familiemedlemmer får push-varsling (Cloud Function `notifyNewChatMessage`)
- Trykk på bilder for fullskjermvisning
- Tab-bar skjules mens tastaturet er aktivt i chatten

---

## Hurtigopprett-knappen (+)

Sentrale «+»-knappen åpner Hurtigopprett-menyen med to steg:

**Steg 1: Velg metode**
- ✏️ **Manuelt** — vanlig skjema
- 🎤 **Tale** — ta opp stemme; AI konverterer til innhold i valgt modul
- 📷 **Foto** — ta/fra bibliotek; AI trekker ut data fra bildet

**Steg 2: Velg modul**
1. **Avtale** (manuelle kalenderarrangementer)
2. **Helsetime**
3. **Veterinærtime**
4. **Skoleaktivitet**
5. **Barnehageaktivitet**
6. **Serviceavtale** (hjem)
7. **Reise**

AI-assistentraden er øverst i Hurtigopprett-menyen — se neste seksjon.

---

## AI-assistent

AI-assistenten er en samtalebasert hjelper i appen (øverst i Hurtigopprett-menyen). Den kan:
- Svare på spørsmål (f.eks. «Hva skjer onsdag?»)
- Navigere deg til skjermer (helse, kjæledyr, skole, barnehage, hjem, avtaler, reiser)
- Utføre handlinger etter at du bekrefter (f.eks. «Lag en helsetime tirsdig kl. 10» → bekreft → opprettet)
- Via mikrofon-ikonet: ta opp tale som transkriberes og sendes til assistenten
- Korrigere svarene: du kan skrive inn en rettelse hvis assistenten svarer feil

---

## Din uke

«Din uke» viser alt som skjer denne uken i ett view.

### Åpne den

1. Gå til **Avtaler**-fanen
2. Trykk «Din uke»-knappen øverst

### Hva som vises

- Sammendragsheader med ukenummer og datoperiode
- Dagkort med vær for hjemmeadressen
- Statistikk-piller (antall avtaler, reiser, skole-/barnehageaktiviteter)
- Kronologisk agenda per dag som kombinerer alle kilder: avtaler, Spond, reiser (inkl. transport/hotell/restaurant), helsetimer, medisiner, vaksiner, veterinærbesøk og vaksiner for kjæledyr, skole/barnehage (aktiviteter og fridager), bursdager, hjemmeservice og ukemeny-slots

### Tilpasse

Under Profil → «Min uke»:
- **Ukemeny**: vis/skjul måltidsdelen i Din uke
- **Matsenter-innstillingene** (Frokost 🥞 / Lunsj 🥪 / Middag 🍽️) styrer hvilke måltider som vises og telles

---

## Våre steder (moduler)

Alle moduler nås fra **Våre steder**-fanen. Hvert kort viser ikon, navn og antall elementer.

| Modul | Farge |
|-------|-------|
| Våre reiser | #7EC8E3 |
| Vår helse | #C67B5C |
| Vår skole | #6B8F71 |
| Vår barnehage | #E8836A |
| Våre bursdager | #E6A817 |
| Våre kjæledyr | #9B7DB8 |
| Vår mat (Matsenter) | #E8906C |
| Våre hjem | #6B7B8D |

### Våre reiser

Planlegg og organiser familieturer:

- **Reiseoversikt**: reiser med by, land, datoer, tider og familiemedlemmer (påkrevd); reisekort viser statisk kart og værpille per by
- **Vær**: 10-dagers værmelding + time-for-time (morgen/lunsj/ettermiddag/kveld/natt) per dag med temperatur, UV-index, regnsjans, vind; historisk gjennomsnitt på fremtidige reiser; paginering og oppfrisking
- **Valutakalkulator**: live valutakurser (Frankfurter API), land→valuta autovalg, bytt retning
- **Transport**: fly, tog, leiebil, båt, ferje og taxi med egen skjema per type (flyplass/terminal, flightnr, bookingnr, sete, vogn, sjåfør, reg.nr.) og avreise/hjemreise-tekstfelt med «En vei»-bryter; transportskjemaet støtter også kart, lenker til flyselskap/operatør (Norwegian, SAS, Vy, Hertz osv.)
- **Hoteller, restauranter, aktiviteter**: skjema for dato/tid, adresse (Google Maps) og notater
- **Pakk boekelister**: sjekkbar pakkeliste, gi nytt navn, kopier liste, slett
- **Dokumenter**: last opp og lagre reisedokumenter
- **Nyttige lenker**: lagre lenker med favicon-forhåndsvisning
- **Mål-tips (AI)**: AI-genererte tips per by (ting å gjøre, restauranter, lokale fraser, advarsler)

**Transport-skjema**: hvert transportmiddel (fly/tog/bil/båt/ferje/taxi) bruker dobbelt-skjema med **Utreise/Hjemreise**-faner og «En vei»-bryter som skjuler hjemreise-fanen.

### Vår helse

Hold oversikt over familiens helse:

- **Timer (avtaler)**: dato, klokkeslett, legenavn, adresse/kart, notater
  - **Person**: velg familiemedlem (mer enn én person kan velges)
  - **Påminnelser**: vennlige etiketter (30 min, 1 time, 2 timer, 1 dag, 1 uke)
- **Medisiner**: navn, styrke/dosering, frekvens (1–4× daglig) med separate tidspunkter per slot og egne påminnelsestider per slot
- **Vaksiner**: dato og neste due-dato
- **Allergier**: med alvorlighetsgrad (mild/moderat/alvorlig)
- **Vekst**: logg høyde og vekt over tid
- Personvelger: alle elementer kan tilordnes familiemedlemmer
- Dokumenter kan lastes opp
- Timer med sted viser kart som åpner Google Maps
- Badges: «I dag», «Om N dager»
- Alle nyheter pushes til familien (Cloud Function `notifyHealthItem`)
- Tale/foto-oppretting fungerer også for helsetimer

### Vår skole

Organiser skoleinformasjon per barn:

- **Barn**: legg til barn med skolenavn, årstrinn, kontaktinfo
- **År-faner**: opprett/rediger/slett skoleår
- **Fliser**: Kontakter, Timeplan, Aktiviteter, Fridager
- **Kontakter**: lærere, helsepersonell (rektor m.fl.), klassekamerater med telefon/e-post/foreldreinfo — direkte ring/e-post-knapper
- **Timeplan**: per semester, dag/tid/fag/lærer
- **Aktiviteter**: tur/aktivitet/møte med datoperiode, påminnelse, dokumenter, bilder og Google-kalendersynk
- **Fridager**: manuell, import via AI fra bilde, eller importer fra URL (skolens nettside)
- **AI-import**: foto av kontaktliste eller fridager → AI trekker ut → velg/fra velg alle → lagre
- Aktiviteter med repetisjon støtter gruppekopiering

### Vår barnehage

Samme funksjonssett som Skole, men for barnehagen (barn, kontakter, timeplan, aktiviteter, fridager, AI-import).

### Våre bursdager

Aldri glem en bursdag:

- **Bursdagsliste**: navn + dato, med nedtelling («I dag» / «Om N dager») og alder
- **Gaveid idéer**: per bursdag — legg til gaver, huk av kjøpte, se forrige års gaver
- **Varsler**: push 7 dager før og på dagen (kl. 08:00 lokal tid)
- Maks 50 bursdager

### Våre kjæledyr

Administrer kjæledyrpleie:

- **Kjæledyr**: navn, type (katt, hund, fisk, fugl, kanin, skilpadde, hamster, hest, anna), kjønn, rase, bursdag, ID-nummer, pass, chip-ID + chipdato, bilde
- **Veterinærbesøk**: dato, veterinær, sted (kart), påminnelse, dokumenter
- **Medisiner**: navn, dosering, frekvens
- **Fôring**: mengde/type
- **Stell**: sist gjort / neste
- **Vaksiner**: dato + neste due-dato
- **Forsikring**: selskap, policenr, utløpsdato, dokument
- Tale/foto-oppretting fungerer også her

### Vår mat (Matsenter)

Planlegg familiens måltider med tre underfaner:

- **Ukemeny**: ukemeny man–søn, med frokost/lunsj/middag-slots fra profilen din; tildel oppskrifter til slots; naviger uker; «Kopier fra forrige uke»; «Tilbake til inneværende uke»; tilfeldig forslag («Denne uken…»)
- **Oppskrifter**: samle oppskrifter (maks 200) med kategorier (favoritter ❤️, kylling, kjøtt, fisk, vegetar, pasta, gryte, suppe, frokost, dessert); søk; AI-oppskriftssøk på 22 språk; importer fra URL; foto→oppskrift (OCR); tid/porsjoner/variant/kjøkken med landsflagg; automatisk kalorierestimaton (AI) hvis ikke oppgitt
- **Handleliste**: realtids-sjekkbar handleliste; kopier, gi nytt navn, slett — varer kan legges direkte fra oppskrift (ingredienser)

### Handlelister

- Opprett og administrer sjekkbare handlelister (maks 100)
- Varer kan sjekkes av/på
- Gi nytt navn, kopier, slett lister
- Varer kan legges direkte fra oppskrifter i Matsenteret

### Våre hjem

Administrer hjem og hytter:

- **Hjem**: type (hus, sommerhytte, vinterhytte, leilighet), adresse (Google Places), postnummer/sted, beskrivelse, bilde, statisk kart
- **Instruksjoner**: «Komme hjem»- og «Forlate hjem»-seksjoner med foto-scan (OCR trekker ut instruksjonstekst og fargeetiketter)
- **Vedlikehold Serviceavtaler**: dato/tid/frekvens (engang/månedlig/kvartalsvis/årlig), gjentakelse (dager/uker), kalendersynk + push til familien
- **Fargekoder**: foto av etikett/vegg → AI trekker ut navn/kode/hex; merke, rom
- **Prosjekter**: status (aktiv/på vent/ferdig), budsjett (budsjett/forbrukt/gjenstående), fargekoder med OCR, interne handlelister (navn, antall, enhetspris, totalsum), tilbud (leverandør, pris, kvittering-OCR), oppgaver (todo/under arbeid/ferdig), «Koble til handleliste», AI-forslag til prosjektoppgaver og prosjektanalyse

---

## Tale- og fotooppretting

### Tale → element

Opprett elementer ved å snakke:

1. Trykk **+** → «Tale» → velg modul
2. Trykk mikrofonen for å starte opptak
3. Snakk naturlig, f.eks. «Møte med barnehagen på onsdag klokka 14»
4. Trykk stopp
5. AI transkriberer og trekker ut: tittel, dato (forstår «i morgen», «på mandag»), tid (forstår «halv tre», «kvart over to»), beskrivelse
6. Se gjennom og rediger
7. Lagre — avtaler legges også i telefonkalender og pushes til familien

Fungerer for: Avtale, Helsetime, Veterinærtime, Skoleaktivitet, Barnehageaktivitet, Serviceavtale (hjem), Reise.

### Foto → element

1. Trykk **+** → «Foto» → velg modul
2. Ta foto eller velg fra bibliotek
3. AI trekker ut alle synlige elementer med tittel, datoer og tider
4. Se gjennom, rediger, velg de du vil beholde
5. Lagre én og én eller alle på én gang

### Foto → oppskrift

1. Matsenter → foto-ikon
2. Foto av oppskrift fra kokebok eller skjerm
3. AI trekker ut navn, ingredienser med mengder, fremgangsmåte
4. Lagre i oppskriftsboken

---

## Datovelger og påminnelser

### DatePickerModal

Alle dato-/tid-felter bruker en egendefinert picker:

- **Rullbar liste**: datoforslag (760 dager) eller tider (30-min-intervaller)
- **Søkefelt**: skriv dato (YYYY-MM-DD) eller tid (HH:MM) for å hoppe direkte
- **Manuell inntasting**: skriv inn hvilken som helst dato — nyttig for historiske datoer (bursdager, tidligere vaksiner)
- **Auto-scroll**: listen scroller til valgt/skrevet dato

### dateFrom/dateTo auto-synk

For aktiviteter med datoperiode (skole, barnehage, helse, vet):
- Endring av **dateFrom** oppdaterer **dateTo** automatisk
- **dateTo** settes aldri før **dateFrom**
- Du kan sette annen sluttdato manuelt

### Påminnelsesvalg

| Etikett | Minutter |
|---------|----------|
| Ingen | 0 |
| 30 min | 30 |
| 1 time | 60 |
| 2 timer | 120 |
| 1 dag | 1440 |
| 1 uke | 10080 |

Påminnelser sendes som telefonvarsler med vennlige etiketter. Standard: **1 time**. Standardtid for nye elementer: **10:00–11:00**.

Medisiner støtter egne tidspunkter per dosering (1–4× daglig), med separate påminnelsestider per tidspunkt.

---

## Profil og innstillinger

Profil-fanen inneholder alle personlige og familieinnstillinger.

### Personlig

- **Navn**: rediger visningsnavn
- **Telefon**: legg til telefonnummer
- **Avatar**: last opp profilbilde (brukes i chat)
- **E-post**: (read-only)

### Familie

- **Familiekort**: se medlemmer og roller
- **Inviter medlem**: generer invitasjonskode (gyldig 1 time, engangsbruk) / del lenke
- **Endre rolle**: promover/demoter mellom admin og medlem (eier/admin)
- **Fjern medlem** (eier/admin)
- **Forlate familien** (ikke eier)
- **Opprett familie** hvis du ikke har en

### Kalender

- **Kalendertype**: velg **telefonkalender** eller **Google-kalender**
- **Google-tilkobling**: OAuth-kobling («Koblet til ✓») og frakobling
- **Google Sync-panel**: Kjør/Dry-run med sammendrag (skannet, opprettet, oversprong finnes, gjenskapt, feilet, ikke tilkoblet) og feilliste
- **Telefonkalender**: iOS (via expo-calendar) setter inn avtaler i telefonens kalender
- Web: «Legg til i Google/Outlook-kalender»-knapper per element

### Varsler

- Slå push-varsler på/av (tillatelse forespørres)
- Medisinpåminnelser per tidspunkt (timeSlots), bursdagsvarsler (7 dager før + på dagen, kl. 08:00 lokal tid), aktivitetspåminnelser
- Web: viser banner for tapte påminnelser siste 7 dager (kan skjules)

### Min uke

- Vis/skjul «Ukemeny»-delen (måltider) i Din uke
- Matsenter-toggles: Frokost 🥞 / Lunsj 🥪 / Middag 🍽️

### Matsenter

- Slot-brytere: Frokost 🥞 / Lunsj 🥪 / Middag 🍽️
- Styrer ukemenyen og «Din uke»

### Spond (eier/admin)

1. Skriv inn Spond e-post og passord (kryptert ved lagring)
2. Velg hvilke grupper som skal synkes
3. Last opp/valg logo per gruppe (bildebibliotek eller kamera)
4. Velg hvem som kan svare («respondenter»)
5. Spond-arrangementer vises automatisk i kalenderen (synk hvert 30. minutt)
6. Frakoble Spond-konto

### Tema

Se [Temaer](#temaer)-seksjonen for detaljer.

### Språk

Se [Språk](#språk)-seksjonen.

### App (kun web)

- «Last inn på nytt» — fjern service workers og cache for å håndheve oppdatering

---

## Kalendersynk

fampad støtter toveis kalendersynkronisering:

**Google Calendar (via Cloud Functions):** Avtaler, reiser, transport, medisiner, helsetimer, veterinærbesøk, skole-/barnehageaktiviteter, hjemmeservice-avtaler — opprettelse, oppdatering og sletting synkroniseres automatisk for brukere som har koblet til Google-kalender.

**Phone Calendar**: iOS-appen kan sette inn avtaler direkte i telefonens kalender (velg telefonkalender i Profil). Web-brukere bruker «Legg til i Google/Outlook»-knapper per element.

**Backfill**: Kjør manuell synkronisering av eksisterende data via Google Sync-panel (Dry-run viser hva som vil skje).

---

## Temaer

fampad tilbyr fleksibel theming via Profil-innstillingene:

**Rad 1 — Modulfarger** (endrer app-aksent til modulens farge):
- Skole (#6B8F71), Barnehage (#E8836A), Reiser (#7EC8E3), Bursdager (#E6A817), Kjæledyr (#9B7DB8), Måltider (#E8906C), Helse (#C67B5C)

**Rad 2 — App-farger**:
- Slategray (#3b5a75), Dustyrose (#A37B85)

**Rad 3 — Mørk modus**:
- Mørk (#333) toggle

Lys/Skygge/System-utvalg følger enhetens lyse/mørke innstilling når «system» er valgt. Temapreferanse lagres og vedvarer mellom økter.

---

## Språk

fampad støtter 5 grensesnittspråk:

1. **Norsk (Bokmål)** — standard
2. **Svenska**
3. **Dansk**
4. **English**
5. **Suomi**

### Bytte språk

1. Gå til Profil
2. Bla til «Språk»
3. Velg språk med flagg-knapper
4. Hele grensesnittet oppdateres umiddelbart

### Oppskriftssøk og oversettelse

- AI-oppskriftssøk støtter 17+ AI-søksmål og 22 språk (inkludert de 5 grensesnittspråkene)
- Oppskrifter kan oversettes til alle 5 språk (navn, beskrivelse, ingredienser, fremgangsmåte)

---

## PWA og installasjon

### Installere fampad

fampad er en Progressive Web App (PWA):

**iOS (Safari):**
1. Åpne fampad i Safari
2. Trykk Del-knappen
3. «Legg til på hjemskjerm»
4. Bekreft

**Android (Chrome):**
1. Åpne fampad i Chrome
2. Trykk tre-punkts menyen
3. «Legg til på hjemskjerm»
4. Bekreft

**Desktop:**
1. Se etter installasjonsikonet i adressefeltet
2. Klikk for å installere

### Oppdateringsbanner

Når ny versjon er tilgjengelig vises et banner («Ny versjon tilgjengelig») — trykk for å laste ny versjon. Sjekkes hvert 5. minutt. Web: «Last inn på nytt» i Profilen fjerner cache/service workers manuelt.

---

## Tips og triks

### Hurtignavigasjon

- Bruk **+**-knappen for å raskt opprette avtaler, helsetimer, veterinarbesøk, aktiviteter, serviceavtaler eller reiser
- Lang-trykk elementer for rediger/slett-meny
- Trykk på kalenderdager for å se dagens avtaler
- Bruk AI-assistenten fra + -menyen for naturlige spørsmål og handlinger

### Spond

- Koble til Spond for å se klubbeventer sammen med familieavtaler
- Svar på invitasjoner direkte i appen (aksept/avslå), inkl. for barn
- Se hvem som kommer per arrangement (stempel-status)
- Spond logoer vises på arrangementer og filterpanel

### Måltidsplanlegging

- Bruk AI-forslag til å oppdage nye oppskrifter
- Importer fra URL eller foto
- Generer handleliste direkte fra oppskrifts-ingredienser
- Planlegg ukemeny med frokost/lunsj/middag; «Kopier fra forrige uke»
- Kalorier estimeres automatisk med AI hvis ikke oppgitt

### Reiseplanlegging

- Vær: 10-dagers + time-for-time + historisk data per by
- AI-destinasjonstips: ting å gjøre, restauranter, fraser, advarsel
- Valutakalkulator med live kurser
- Transport med Utreise/Hjemreise-faner og «En vei»-bryter
- Pakkelister med avkrysningsbokser
- Spond logoer vises på arrangementer og filterpanelet

### datasikkerhet

- All data lagres privat per familie (Firestore, familyId-scoping)
- Kun familiemedlemmer kan se data
- Invitasjonskoder utløper etter 1 time og kan bare brukes én gang
- Du kan forlate familien når som helst (fjerner tilgangen din)

---

*fampad v1.0.0 — Din familie, organisert.*
