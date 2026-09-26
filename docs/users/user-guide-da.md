# fampad — Brugerguide

<p align="center">
  <img src="../../assets/icon.png" alt="fampad Logo" width="120" height="120" />
</p>

<p align="center"><strong>Familiens alt-i-ett organisationshub</strong></p>

---

## Indholdsfortegnelse

1. [Kom i gang](#kom-i-gang)
2. [Navigationsoversigt](#navigationsoversigt)
3. [Begivenheder og kalender](#begivenheder-og-kalender)
4. [Chat](#chat)
5. [Hurtigoprettelse-knappen (+)](#hurtigoprettelse-knappen)
6. [AI-assistent](#ai-assistent)
7. [Min uge](#min-uge)
8. [Vores steder (moduler)](#vores-steder-moduler)
   - [Vores rejser](#vores-rejser)
   - [Vores sundhed](#vores-sundhed)
   - [Vores skole](#vores-skole)
   - [Vores børnehave](#vores-børnehave)
   - [Vores fødselsdage](#vores-fødselsdage)
   - [Vores kæledyr](#vores-kæledyr)
   - [Måltidscenter (Matsenter)](#måltidscenter)
   - [Vores hjem](#vores-hjem)
   - [Indkøbslister](#indkøbslister)
9. [Oprettelse med tale og foto](#oprettelse-med-tale-og-foto)
10. [Datovælger og påmindelser](#datovælger-og-påmindelser)
11. [Profil og indstillinger](#profil-og-indstillinger)
12. [Kalendersynk](#kalendersynk)
13. [Temaer](#temaer)
14. [Sprog](#sprog)
15. [PWA og installation](#pwa-og-installation)
16. [Tips og trick](#tips-og-trick)

---

## Kom i gang

### Opret konto

1. Åbn fampad i browseren (eller som installeret PWA)
2. Registrer dig med e-mail og adgangskode — eller log ind, hvis du allerede har en konto
3. Vælg sprog i trin 2 i velkomstguiden (norsk, svensk, dansk, engelsk, finsk)
4. Opret eller tilslut dig en familie i trin 3 — eller spring over og gør det senere i Profilen

### Opsætning af din familie

Efter login skal du oprette en familie eller tilslutte dig en:

**Mulighed A: Opret ny familie**
1. Gå til fanen **Profil**
2. Tryk på "Opprett familie" (Opret familie)
3. Indtast familienavnet
4. Du bliver familiens **ejer**

**Mulighed B: Tilslut dig eksisterende familie**
1. Bed en ejer/admin generere en invitationskode (Profil > Familie > "Inviter medlem")
2. Åbn den delte invitationslink, eller indtast den 6-tegns kode
3. Du bliver med som **medlem**

### Forstå familieroller

| Rolle | Rettigheder |
|-------|-------------|
| **Ejer** | Fuld kontrol. Kan administrere alle medlemmer. Kan ikke forlade familien. |
| **Admin** | Kan invitere, fjerne medlemmer og ændre roller. |
| **Medlem** | Kan oprette og redigere indhold. Kan ikke administrere andre medlemmer. |

---

## Navigationsoversigt

fampad bruger en bundfane-bjælke med fire faner omkring en central "+"-knap.

| # | Fane | Ikon | Beskrivelse |
|---|------|------|-------------|
| 1 | **Begivenheder** (Avtaler) | Kalender | Samlet kalender fra alle familiekilder (manuelle begivenheder, Spond, sundhed, kæledyr, skole/børnehave, hjem, fødselsdage) |
| 2 | **Chat** | Boble | Familiemeddelelser med billeder og reaktioner |
| 3 | **Vores steder** (Våre steder) | Hus | Indgang til alle moduler |
| 4 | **Profil** | Person | Indstillinger, familiestyring, integrationer |

Den centrale **+**-knap åbner **Hurtigoprettelse**-menuen. Fane-bjælken skjules automatisk, når du skriver i chatten.

---

## Begivenheder og kalender

Begivenheder-fanen viser en samlet kalender for hele familien.

### Visning

- **Listevisning**: Begivenheder grupperet per dag med ugenummer-banner
- **Kalendervisning**: Månedsgitter med prikker per dag — tryk på en dag for at se den
- Vis/skjul tidligere begivenheder
- Filtrér på modul og kilde (inkl. Spond-grupper med logoer)
- Knappen "**Min uge**" (Din uke) øverst åbner ugeoversigten (se egen sektion)

### Kilder til begivenheder

Begivenheder kommer fra mange kilder og er farvekodede per modul:

| Kilde | Farve |
|-------|-------|
| Manuelle begivenheder | #3b5a75 |
| Rejser | #7EC8E3 |
| Sundhed (aftaler/medicin/vaccinationer) | #C67B5C |
| Skoleaktiviteter og -ferier | #6B8F71 |
| Børnehaveaktiviteter | #E8836A |
| Kæledyr (dyrlæge/vaccinationer) | #9B7DB8 |
| Fødselsdage | #E6A817 |
| Hjem (serviceaftaler) | #6B7B8D |
| Måltidsslots (Måltidscenter) | #E8906C |
| Spond-begivenheder | Visas med gruppelogo |

### Opret en begivenhed

1. Tryk **+** → "Manuelt" → "Avtale" (Begivenhed)
2. Udfyld:
   - **Titel** (påkrævet)
   - **Dato** og valgfri slutdato
   - **Tid** og valgfri sluttid
   - **Adresse** (Google Places-søgning)
   - **Ikon** (20 foruddefinerede, f.eks. Middag (middag), Bursdag (fødselsdag), Sport, Kino, Træning, Fjelltur (bjergvandring))
   - **Personer** (vælg familiemedlemmer)
   - **Beskrivelse** (valgfrie noter)
   - **Påmindelse** (Ingen, 30 min, 1 time, 2 timer, 1 dag, 1 uge)
   - **Gentagelse** (planlæg dage/uger, ulige og lige uger — f.eks. "hver anden uge")
   - **Dokumenter** (upload vedhæftede filer)
3. Tryk "Lagre" (Gem)

### Begivenhedsdetaljer

Tryk på en begivenhed for at se:
- Fuld dato, tid og sted
- Statisk kort + "Åbn i Google Maps" (når adressen findes)
- Noter, dokumenter, ikon og personer knyttet til begivenheden
- "Tilføj til Google/Outlook-kalender"-knapper (web)
- Rediger/slet via langt tryk (ActionModal)
- Spond-begivenheder: respondentstatus-stempler (accepteret/afvist/ikke svaret, inkl. børn) og mulighed for at ændre dit eget svar

### Spond-begivenheder

Hvis du har tilsluttet Spond i Profilindstillingerne:
- Spond-begivenheder fra dine valgte grupper vises automatisk
- Du ser svarstatus for familiemedlemmer
- Tryk på begivenheden for detaljer og for at ændre dit eget svar
- Gruppelogoer uploades i Profilen (custom logo per gruppe)
- Spond-synkroniseringen kører automatisk hvert 30. minut

---

## Chat

Chat-fanen giver familiemeddelelser i realtid.

### Send beskeder

1. Skriv din besked (maks 500 tegn)
2. Tryk på send-knappen

### Del billeder

1. Tryk på billedikonet ved tekstfeltet
2. Vælg fra biblioteket eller tag et nyt foto
3. Forhåndsvis billedet
4. Send — billedet uploades til Firebase Storage

### Reaktioner

- Tryk på "+"-knappen ved beskeden for at åbne reaktionsvælgeren
- Tilgængelige reaktioner: Like 👍, Smile 😊, Heart ❤️
- Antal vises per reaktion; tryk på en reaktions-badge for at like/unlike
- Dine egne reaktioner er fremhævede

### Funktioner

- Realtidsopdatering via Firestore
- Dagsseparatorer ("I dag" / "I går") mellem beskedgrupper
- Avatarer ved beskeder
- Seneste 100 beskeder indlæses, maks 500 tegn per besked
- Andre familiemedlemmer får push-notifikation (Cloud Function `notifyNewChatMessage`)
- Tryk på billeder for fuldskærmsvisning
- Fane-bjælken skjules, mens chat-tastaturet er aktivt

---

## Hurtigoprettelse-knappen (+)

Den centrale "+"-knap åbner Hurtigoprettelse-menuen med to trin:

**Trin 1: Vælg metode**
- ✏️ **Manuelt** — almindelig formular
- 🎤 **Tale** — optag stemme; AI konverterer til et element i valgt modul
- 📷 **Foto** — tag/vælg fra bibliotek; AI udtrækker data fra billedet

**Trin 2: Vælg modul**
1. **Begivenhed** (manuelle kalenderbegivenheder)
2. **Sundhedstime**
3. **Dyrlægebesøg**
4. **Skoleaktivitet**
5. **Børnehaveaktivitet**
6. **Serviceaftale** (hjem)
7. **Rejse**

AI-assistent-raden findes øverst i Hurtigoprettelse-menuen — se næste sektion.

---

## AI-assistent

AI-assistenten er en samtalebaseret hjælper i appen (øverst i Hurtigoprettelse-menuen). Den kan:
- Besvare spørgsmål (f.eks. "Hvad sker der onsdag?")
- Navigere dig til skærme (sundhed, kæledyr, skole, børnehave, hjem, begivenheder, rejser)
- Udføre handlinger efter din bekræftelse (f.eks. "Opret en sundhedstime tirsdag kl. 10" → bekræft → oprettet)
- Via mikrofon-ikonet: optag tale, der transskriberes og sendes til assistenten
- Rette svar: du kan indtaste en korrektion, hvis assistenten svarer forkert

---

## Min uge

"Min uge" (Din uke) viser alt, hvad der sker denne uge i én visning.

### Åbn den

1. Gå til fanen **Begivenheder**
2. Tryk på "Din uke"-knappen øverst

### Hvad der vises

- Overskrift med ugenummer og datoperiode
- Dagskort med vejr for din hjem Adresse
- Statistik-piller (antal begivenheder, rejser, skole-/børnehaveaktiviteter)
- Kronologisk dagsagenda, der kombinerer alle kilder: begivenheder, Spond, rejser (inkl. transport/hoteller/restauranter), sundhestimer, medicin, vaccinationer, dyrlægebesøg og -vaccinationer, skole/børnehave (aktiviteter og ferier), fødselsdage, hjemmeservice og ugemenu-slots

### Tilpasse

Under Profil → "Min uke" (Min uge):
- **Ugemenu**: vis/skjul måltidssektionen i Min uge
- **Måltidscenter-indstillingerne** (Frokost 🥞 / Frokost (frokost) 🥪 / Middag (middag) 🍽️) styrer, hvilke måltider der vises og tælles

---

## Vores steder (moduler)

Alle moduler nås fra fanen **Vores steder**. Hvert kort viser ikon, navn og antal elementer.

| Modul | Farve |
|-------|-------|
| Vores rejser | #7EC8E3 |
| Vores sundhed | #C67B5C |
| Vores skole | #6B8F71 |
| Vores børnehave | #E8836A |
| Vores fødselsdage | #E6A817 |
| Vores kæledyr | #9B7DB8 |
| Måltidscenter | #E8906C |
| Vores hjem | #6B7B8D |

### Vores rejser

Planlæg og organisér familieture:

- **Rejseoversigt**: rejser med by, land, datoer, tider og familiemedlemmer (påkrævet); rejsekort viser statisk kort og vejr-pille per by
- **Vejr**: 10-dages vejrudsigt + time for time (morgen/frokost/eftermiddag/aften/nat) per dag med temperatur, UV-indeks, regnsandsynlighed, vind; historisk gennemsnit for fremtidige rejser; paginering og opdatering
- **Valutakalkulator**: livekurser (Frankfurter API), land→valuta autovalg, skift retning
- **Transport**: fly, tog, lejebil (lejebil), båt (båd), ferje (færge) og taxi med egen formular per type (lufthavn/terminal, flightnr., bookingnr., sæde, vogn, chaufør, reg.nr.) og udrejse/hjemrejse-faner med "En vei"-kontakt; transportdetaljer understøtter kort og links til selskaber (Norwegian, SAS, Vy, Hertz m.fl.)
- **Hoteller, restauranter, aktiviteter**: formularer for dato/tid, adresse (Google Maps) og noter
- **Pakkelister**: afkrydsbare pakkelister, omdøb, kopiér liste, slet
- **Dokumenter**: upload og gem reisedokumenter
- **Nyttige links**: gem links med favicon-preview
- **Destinationstips (AI)**: AI-genererede tips per by (ting at lave, restauranter, lokale fraser, advarsler)

**Transportformular**: hvert transportmiddel (fly/tog/bil/båt/ferje/taxi) bruger dobbeltformular med **Utreise/Hjemreise**-faner og "En vei"-kontakt, der skjuler hjemrejsen.

### Vores sundhed

Hold styr på familiens sundhed:

- **Aftaler (timer)**: dato, klokkeslæt, lægenavn, adresse/kort, noter
  - **Person**: vælg familiemedlem (mere end én kan vælges)
  - **Påmindelser**: venlige etiketter (30 min, 1 time, 2 timer, 1 dag, 1 uge)
- **Medicin**: navn, styrke/dosering, frekvens (1–4× dagligt) med separate tidspunkter per slot og egne påmindelsestider per slot
- **Vaccinationer**: dato og næste forfaldsdato
- **Allergier**: med sværhedsgrad (mild/moderat/svær)
- **Vækst**: log højde og vægt over tid
- Personvælger: alle elementer kan tildeles familiemedlemmer
- Dokumenter kan uploades
- Aftaler med sted viser kort, der åbner Google Maps
- Badges: "I dag", "Om N dage"
- Alle nye elementer pushes til familien (Cloud Function `notifyHealthItem`)
- Tale/foto-oprettelse fungerer også for sundhestimer

### Vores skole

Organisér skoleinformation per barn:

- **Børn**: tilføj børn med skolenavn, årgang, kontaktinfo
- **År-faner**: opret/rediger/slet skoleår
- **Fliser**: Kontakter, Timeplan, Aktiviteter, Ferier
- **Kontakter**: lærere, sundhedspersonale (rektor m.fl.), klassekammerater med telefon/e-mail/forældreinfo — direkte ring/e-mail-knapper
- **Timeplan**: per semester, dag/tid/fag/lærer
- **Aktiviteter**: tur/aktivitet/møde med datoperiode, påmindelse, dokumenter, billeder og Google-kalendersynk
- **Ferier**: manuel, AI-import fra foto eller import fra URL (skolens hjemmeside)
- **AI-import**: foto af kontaktliste eller ferieliste → AI udtrækker → markér/fravælg alle → gem
- Aktiviteter med gentagelse understøtter gruppekopiering

### Vores børnehave

Samme funktionsomfang som Skolen, men for børnehaven (børn, kontakter, timeplan, aktiviteter, ferier, AI-import).

### Vores fødselsdage

Glem aldrig en fødselsdag:

- **Fødselsdagsliste**: navn + dato, med nedtælling ("I dag" / "Om N dage") og alder
- **Gaveidéer**: per fødselsdag — tilføj gaver, afkryds købte, se forrige års gaver
- **Notifikationer**: push 7 dage før og på dagen (kl. 08:00 lokal tid)
- Maks 50 fødselsdage

### Vores kæledyr

Administrér kæledyrspleje:

- **Kæledyr**: navn, type (kat, hund, fisk, fugl, kanin, skildpadde, hamster, hest, andet), køn, race, fødselsdag, ID-nummer, pas, chip-ID + chipdato, foto
- **Dyrlægebesøg**: dato, dyrlæge, sted (kort), påmindelse, dokumenter
- **Medicin**: navn, dosering, frekvens
- **Foder**: mængde/type
- **Pleje**: sidst lavet / næste
- **Vaccinationer**: dato + næste forfaldsdato
- **Forsikring**: selskab, policenr., udløbsdato, dokument
- Tale/foto-oprettelse fungerer også her

### Måltidscenter (Matsenter)

Planlæg familiens måltider med tre underfaner:

- **Ugemenu**: ugemenu man–søn, med frokost/lunsj/middag-slots fra din profil; tildel opskrifter til slots; navigér uger; "Kopiér fra sidste uge"; "Tilbage til aktuelle uge"; tilfældige forslag ("Denne uge…")
- **Opskrifter**: saml opskrifter (maks 200) med kategorier (favoritter ❤️, kylling, kød, fisk, vegetar, pasta, gryde, suppe, frokost, dessert); søg; AI-opskriftssøgning på 22 sprog; import fra URL; foto→opskrift (OCR); tid/portioner/variation/køkken med landsflag; automatisk kaloriestimering (AI), hvis ikke angivet
- **Indkøbsliste**: realtids-afkrydsbar indkøbsliste; kopiér, omdøb, slet — varer kan tilføjes direkte fra opskrift (ingredienser)

### Indkøbslister

- Opret og administrér afkrydsbare indkøbslister (maks 100)
- Varer kan afkrydses/fra
- Omdøb, kopiér, slet lister
- Varer kan tilføjes direkte fra opskrifter i Måltidscenteret

### Vores hjem

Administrér hjem og hytter:

- **Hjem**: type (hus, sommerhytte, vinterhytte, lejlighed), adresse (Google Places), postnummer/sted, beskrivelse, foto, statisk kort
- **Instruktioner**: "Komme hjem"- og "Forlade hjem"-sektioner med fotoscan (OCR udtrækker instruktionstekst og farveetiketter)
- **Vedligehold – Serviceaftaler**: dato/tid/frekvens (engang/månedligt/kvartalsvis/årligt), gentagelse (dage/uger), kalendersynk + push til familien
- **Farvekoder**: foto af etiket/væg → AI udtrækker navn/kode/hex; mærke, rum
- **Projekter**: status (aktiv/på pause/færdig), budget (budget/forbrugt/tilbage), farvekoder med OCR, interne indkøbslister (navn, antal, enhedspris, totalkr.), tilbud (leverandør, pris, kvittering-OCR), opgaver (to do/under udførelse/færdig), "Tilslut til indkøbsliste", AI-forslag til projektopgaver og projektanalyse

---

## Oprettelse med tale og foto

### Tale → element

Opret elementer ved at tale:

1. Tryk **+** → "Tale" → vælg modul
2. Tryk på mikrofonen for at starte optagelse
3. Tal naturligt, f.eks. "Møde med børnehaven på onsdag klokken 14"
4. Tryk stop
5. AI transskriberer og udtrækker: titel, dato (forstår "i morgen", "på mandag"), tid (forstår "halv tre", "kvart over to"), beskrivelse
6. Gennemse og rediger
7. Gem — begivenheder tilføjes også i telefonkalenderen og pushes til familjen

Fungerer for: Begivenhed, Sundhedstime, Dyrlægebesøg, Skoleaktivitet, Børnehaveaktivitet, Serviceaftale (hjem), Rejse.

### Foto → element

1. Tryk **+** → "Foto" → vælg modul
2. Tag et foto eller vælg fra biblioteket
3. AI udtrækker alle synlige elementer med titler, datoer og tider
4. Gennemse, rediger, vælg dem, du vil beholde
5. Gem én ad gangen eller alle på én gang

### Foto → opskrift

1. Måltidscenter → kameraikon
2. Foto af en opskrift fra en kogebog eller skærm
3. AI udtrækker navn, ingredienser med mængder, fremgangsmåde
4. Gem i opskriftsbogen

---

## Datovælger og påmindelser

### DatePickerModal

Alle dato-/tidsfelter bruger en tilpasset vælger:

- **Rulbar liste**: datoforslag (760 dage) eller tider (30-min-intervaller)
- **Søgefelt**: indtast dato (YYYY-MM-DD) eller tid (HH:MM) for at hoppe direkte
- **Manuel indtastning**: indtast hvilken som helst dato — nyttigt for historiske datoer (fødselsdage, tidligere vaccinationer)
- **Auto-scroll**: listen scroller til valgt/indtastet dato

### dateFrom/dateTo auto-synk

For aktiviteter med datoperiode (skole, børnehave, sundhed, dyr):
- Ændring af **dateFrom** opdaterer **dateTo** automatisk
- **dateTo** sættes aldrig før **dateFrom**
- Du kan angive en anden slutdato manuelt

### Påmindelsesindstillinger

| Etiket | Minutter |
|--------|----------|
| Ingen | 0 |
| 30 min | 30 |
| 1 time | 60 |
| 2 timer | 120 |
| 1 dag | 1440 |
| 1 uge | 10080 |

Påmindelser sendes som telefonnotifikationer med venlige etiketter. Standard: **1 time**. Standardtid for nye elementer: **10:00–11:00**.

Medicin understøtter separate tidspunkter per dosis (1–4× dagligt) med egne påmindelsestider per tidspunkt.

---

## Profil og indstillinger

Profil-fanen indeholder alle personlige og familieindstillinger.

### Personligt

- **Navn**: rediger visningsnavn
- **Telefon**: tilføj telefonnummer
- **Avatar**: upload profilbillede (bruges i chatten)
- **E-mail**: (skrivebeskyttet)

### Familie

- **Familiekort**: se medlemmer og roller
- **Inviter medlem**: generér invitationskode (gyldig 1 time, engangsbrug) / del link
- **Skift rolle**: forfrem/nedgrader mellem admin og medlem (ejer/admin)
- **Fjern medlem** (ejer/admin)
- **Forlad familien** (ikke-ejere)
- **Opret familie**, hvis du ikke har en

### Kalender

- **Kalendertype**: vælg **telefonkalender** eller **Google-kalender**
- **Google-tilslutning**: OAuth-tilslutning ("Koblet til ✓" (Tilsluttet ✓)) og frakobling
- **Google Sync-panel**: Kør/Dry-run med oversigt (scannet, oprettet, skippedExists (fandtes), genskabt, fejlet, ikke tilsluttet) og fejl-liste
- **Telefonkalender**: iOS (via expo-calendar) indsætter begivenheder i telefonens kalender
- Web: "Tilføj til Google/Outlook-kalender"-knapper per element

### Notifikationer

- Slå push-notifikationer til/fra (tilladelse anmodes)
- Medicinpåmindelser per tidspunkt, fødselsdagsnotifikationer (7 dage før + på dagen, kl. 08:00 lokal tid), aktivitetspåmindelser
- Web: viser banner for savnede påmindelser de seneste 7 dage (kan afvises)

### Min uge

- Vis/skjul "Ugemenu"-sektionen (måltider) i Min uge
- Måltidscenter-omskiftere: Frokost 🥞 / Frokost (lunch) 🥪 / Middag 🍽️

### Måltidscenter

- Slot-omskiftere: Frokost 🥞 / Frokost (lunch) 🥪 / Middag 🍽️
- Styrer ugemenuen og "Min uge"

### Spond (ejer/admin)

1. Indtast Spond e-mail og adgangskode (krypteret ved lagring)
2. Vælg, hvilke grupper der skal synkes
3. Upload/vælg logo per gruppe (bibliotek eller kamera)
4. Vælg, hvem der kan svare ("respondenter")
5. Spond-begivenheder vises automatisk i kalenderen (synk hvert 30. minut)
6. Frakobl Spond-konto

### Tema

Se sektionen [Temaer](#temaer) for detaljer.

### Sprog

Se sektionen [Sprog](#sprog).

### App (kun web)

- "Last inn på nytt" (Genindlæs) — fjern service workers og cache for at gennemtvinge en opdatering

---

## Kalendersynk

fampad understøtter tovejs kalendersynkronisering:

**Google Kalender (via Cloud Functions):** Begivenheder, rejser, transport, medicin, sundhesaftaler, dyrlægebesøg, skole-/børnehaveaktiviteter, hjemmeservice-aftaler — oprettelse, opdatering og sletning synkroniseres automatisk for brugere, der har tilsluttet Google-kalender.

**Telefonkalender**: iOS-appen kan indsætte begivenheder direkte i telefonens kalender (vælg telefonkalender i Profil). Web-brugere bruger "Tilføj til Google/Outlook"-knapper per element.

**Backfill (efterfyldning)**: Kør manuel synkronisering af eksisterende data via Google Sync-panelet (Dry-run viser, hvad der vil ske).

---

## Temaer

fampad tilbyder fleksibel temering via Profilindstillingerne:

**Række 1 — Modulfarver** (ændrer app-aksenten til modulets farve):
- Skole (#6B8F71), Børnehave (#E8836A), Rejser (#7EC8E3), Fødselsdage (#E6A817), Kæledyr (#9B7DB8), Måltider (#E8906C), Sundhed (#C67B5C)

**Række 2 — App-farver**:
- Slategray (blågrå, #3b5a75), Dustyrose (dunkelrosa, #A37B85)

**Række 3 — Mørk tilstand**:
- Mørk (#333)-kontakt

Lys/Mørk/System følger enhedens lyse/mørke indstilling, når "system" er valgt. Temapræference gemmes og beholdes mellem sessioner.

---

## Sprog

fampad understøtter 5 grænsefladesprog:

1. **Norsk (Bokmål)** — standard
2. **Svenska (Svensk)**
3. **Dansk**
4. **English (Engelsk)**
5. **Suomi (Finsk)**

### Skift sprog

1. Gå til Profil
2. Rul til "Språk" (Sprog)
3. Vælg sprog med flagknapper
4. Hele grænsefladen opdateres straks

### Opskriftssøgning og oversættelse

- AI-opskriftssøgning understøtter 17+ AI-søgsprog og 22 sprog (inkl. de 5 grænsefladesprog)
- Opskrifter kan oversættes til alle 5 sprog (navn, beskrivelse, ingredienser, fremgangsmåde)

---

## PWA og installation

### Installér fampad

fampad er en Progressive Web App (PWA):

**iOS (Safari):**
1. Åbn fampad i Safari
2. Tryk på Del-knappen
3. "Tilføj til hjemmeskærm"
4. Bekræft

**Android (Chrome):**
1. Åbn fampad i Chrome
2. Tryk på tre-punkts-menuen
3. "Tilføj til hjemmeskærm"
4. Bekræft

**Desktop:**
1. Se efter installationsikonet i adresselinjen
2. Klik for at installere

### Opdateringsbanner

Når en ny version er tilgængelig, vises et banner ("Ny version tilgængelig") — tryk for at indlæse den. Kontrolleres hvert 5. minut. Web: "Genindlæs" i Profilen rydder cache/service workers manuelt.

---

## Tips og trick

### Hurtig navigation

- Brug **+**-knappen til hurtigt at oprette begivenheder, sundhestimer, dyrlægebesøg, aktiviteter, serviceaftaler eller rejser
- Lang-tryk elementer for rediger/slet-menu
- Tryk på kalenderdage for at se dagens begivenheder
- Brug AI-assistenten fra + -menuen til naturlige spørgsmål og handlinger

### Spond

- Tilslut Spond for at se klubbegivenheder sammen familiebegivenheder
- Svar på invitationer direkte i appen (accepter/afvis), inkl. for børn
- Se, hvem der kommer per begivenhed (stempelstatus)
- Spond-logoer vises på begivenheder og i filterpanelet

### Måltidsplanlægning

- Brug AI-forslag til at opdage nye opskrifter
- Importér fra URL eller foto
- Generér indkøbsliste direkte fra opskriftninger
- Planlæg ugemenu med frokost/lunsj/middag; "Kopiér fra sidste uge"
- Kalorier estimeres automatisk af AI, hvis ikke angivet

### Rejseplanlægning

- Vejr: 10-dages + time for time + historisk data per by
- AI-destinationstips: ting at lave, restauranter, fraser, advarsler
- Valutakalkulator med livekurser
- Transport med Utreise/Hjemreise-faner og "En vei"-kontakt
- Pakkelister med afkrydsningsbokse
- Spond-logoer vises på begivenheder og i filterpanelet

### Datasikkerhed

- Alle data gemmes privat per familie (Firestore, familyId-scoping)
- Kun familiemedlemmer kan se data
- Invitationskoder udløber efter 1 time og kan kun bruges én gang
- Du kan forlade familien når som helst (fjerner din adgang)

---

*fampad v1.0.0 — Din familie, organiseret.*
