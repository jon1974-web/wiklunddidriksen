# fampad — Brugerguide

<p align="center">
  <img src="../../assets/icon.png" alt="fampad Logo" width="120" height="120" />
</p>

<p align="center"><strong>Din families alt-i-én organiseringshubs</strong></p>

---

## Indholdsfortegnelse

1. [Kom i gang](#getting-started)
2. [Navigationsoversigt](#navigation-overview)
3. [Begivenheder & Kalender](#events--calendar)
4. [Chat](#chat)
5. [Hurtig oprettelsesknap](#quick-create-button)
6. [Ugeoversigt ("Min uge")](#weekly-summary-min-uke)
7. [Moduler](#spaces-modules)
   - [Rejser & Transport](#trips--travel)
   - [Sundhed](#health)
   - [Kæledyr](#pets)
   - [Skole](#school)
   - [Børnehave](#kindergarten)
   - [Fødselsdage](#birthdays)
   - [Madplan](#meal-plan)
   - [Indkøbslister](#shopping-lists)
8. [Stemme & Foto til Begivenhed/Aktivitet](#voice--photo-to-eventactivity)
9. [DatoVælger & Påmindelser](#datepicker--reminders)
10. [Profil & Indstillinger](#profile--settings)
11. [Temaer](#themes)
12. [Sprogunderstøttelse](#language-support)
13. [PWA & Installation](#pwa--install)
14. [Tips & Tricks](#tips--tricks)

---

## Kom i gang

### Opret din konto

1. Åbn fampad i din browser eller installer det som en PWA
2. Indtast din e-mail og adgangskode for at tilmelde dig
3. Du placeres automatiskt i en ny konto

### Sæt din familie op

Efter login skal du enten oprette eller tilslutte dig en familie:

**Mulighed A: Opret en ny familie**
1. Gå til **Profil**-fanebladet
2. Tryk på "Opprett familie" (Opret familie)
3. Indtast dit familienavn
4. Du bliver **ejeren** af familien

**Mulighed B: Tilslut dig en eksisterende familie**
1. Bed en familiens administrator om at generere en invitationskode (Profil > Familie sektion > "Inviter medlem")
2. Indtast den 6-tegns kode på profilsiden
3. Du tilslutter dig som **medlem**

### Forstå familjeroller

| Rolle | Tilladelser |
|-------|-------------|
| **Ejer** | Fuld kontrol. Kan administrere alle medlemmer, oprette/slette familien. Kan ikke forlade den. |
| **Administrator** | Kan invitere medlemmer, fjerne medlemmer, ændre roller. |
| **Medlem** | Kan oprette og redigere indhold. Kan ikke administrere andre medlemmer. |

---

## Navigationsoversigt

fampad bruger en nederste fanelinje med faner placeret symmetriskt omkring en central "+"-knap. Chat og Vores steder er placeret mellem de andre faner og den centrale plus-knap.

| Fane | Ikon | Beskrivelse |
|------|------|-------------|
| **Kalender** | Kalender | Begivenheder fra alle kilder (manuelle, Spond, sundhed, kæledyr) |
| **Chat** | Chatboble | Familiekommunikation med billeder og reaktioner |
| **Vores steder** | Kompas/Hus | Modulhubs — adgang til alle moduler |
| **Profil** | Person | Indstillinger, familieadministration, integrationer |

**+ (plus)**-knappen i midten af fanelinjen åbner modalen for **hurtig oprettelse** af indhold.

---

## Begivenheder & Kalender

Begivenhedsfanebladet viser en samlet kalender for alle familieaktiviteter.

### Se begivenheder

- **Listevisning**: Begivenheder grupperet efter dato med en rullbar liste
- **Kalendervisning**: Måneds Kalenderrudnet viser prikker på hver dag
- Tryk på kalenderikon for at skifte mellem liste- og kalendervision

### Kilder til begivenheder

Begivenheder kommer fra flere kilder og er farvekodede:
- **Manuelle begivenheder** du opretter (grøn)
- **Spond-begivenheder** fra din sportsklub (rød)
- **Sundhedsaftaler** (#C67B5C)
- **Dyrlægebesøg** (#9B7DB8)
- **Skoleaktiviteter** (#6B8F71)
- **Børnehaveaktiviteter** (#E8836A)
- **Rejser** med start-/slutdatoer (#7EC8E3)

### Opret en begivenhed

1. Tryk på **+**-knappen på fanelinjen
2. Vælg "Manuelt" (Manuel) i begivenhedssektionen
3. Udfyld detaljerne:
   - **Titel** (påkrævet)
   - **Dato** og valgfri slutdato
   - **Tidspunkt** og valgfri sluttid
   - **Adresse** (Google Places-søgning)
   - **Beskrivelse** (valgfri noter)
   - **Påmindelse** (Ingen, 30 min, 1 time, 2 timer, 1 dag, 1 uge)
   - **Dokumentupload** (valgfrit)
4. Tryk på "Lagre" (Gem)

### Spond-begivenheder

Hvis du har forbundet Spond i dine profilindstillinger:
- Spond-begivenheder fra dine valgte grupper vises automatiskt
- Du kan se RSVP-status (accepteret/afvist/ubesvaret) for familiemedlemmer
- Tryk på en Spond-begivenhed for at se detaljer og ændre dit svar

### Begivenhedsdetaljer

Tryk på en vilkårlig begivenhed for at se:
- Fuld dato, tid og placering
- Et statisk kort der viser placeringen
- Beskrivelse og noter
- RSVP-status (for Spond-begivenheder)
- Uploadede dokumenter
- Rediger og slet muligheder (langt tryk for handlingmenu)

---

## Chat

Chatten giver familiekommunikation med rige funktioner.

### Send beskeder

1. Skriv din besked i tekstfeltet
2. Tryk på sendpilen for at offentliggøre

### Del billeder

1. Tryk på billedikon ved siden af tekstfeltet
2. Vælg at vælge fra galleriet eller tage et foto
3. Forhåndsvis billedet
4. Tryk på send — billedet uploades til Firebase Storage

### Reaktioner

- Langt tryk på en besked for at tilføje en reaktion
- Tilgængelige reaktioner: Synes godt om, Smil, Hjerte
- Dine reaktioner vises under beskeden

### Funktioner

- Realtidsopdateringer via Firestore-lyttere
- Beskeder ruller automatisk til bunden
- Brugeravatarer vises ved siden af beskeder
- Billeder vises inline med tryk for at udvide

---

## Hurtig oprettelsesknap

**+**-knappen i midten af fanelinjen åbner en modal med hurtige oprettelsesgenveje organiseret efter modul. Hvert modul tilbyder tre oprettelsesmetoder: **Manuelt** (manuel formular), **Tale** (stemmeoptagelse) og **Foto** (fotogenkendelse).

### Begivenhedssektionen
- **Manuelt** — Opret en ny manuel begivenhed
- **Tale** — Stemme-til-begivenhed: optag tale, AI konverterer til begivenhed
- **Foto** — Foto-til-begivenhed: tag et foto af et skema, AI udtrækker begivenheder

### Sundhedssektionen
- **Manuelt** — Opret en ny sundhedsaftale
- **Tale** — Stemme-til-aktivitet: optag tale, AI opretter sundhedsaftale
- **Foto** — Foto-til-aktivitet: tag et foto, AI opretter sundhedsaftale

### Kæledyrssektionen
- **Manuelt** — Planlæg et dyrlægebesøg
- **Tale** — Stemme-til-aktivitet: optag tale, AI opretter dyrlægebesøg
- **Foto** — Foto-til-aktivitet: tag et foto, AI opretter dyrlægebesøg

### Skolesektionen
- **Manuelt** — Opret en ny skoleaktivitet (tur/aktivitet/møde)
- **Tale** — Stemme-til-aktivitet: optag tale, AI opretter skoleaktivitet
- **Foto** — Foto-til-aktivitet: tag et foto, AI opretter skoleaktivitet

### Børnehave-sektionen
- **Manuelt** — Opret en ny børnehaveaktivitet
- **Tale** — Stemme-til-aktivitet: optag tale, AI opretter børnehaveaktivitet
- **Foto** — Foto-til-aktivitet: tag et foto, AI opretter børnehaveaktivitet

### Rejsesektionen
- **Manuelt** — Opret en ny rejse

---

## Ugeoversigt ("Min uge")

Ugeoversigten viser alt der sker denne uge i én visning.

### Adgang til den

1. Gå til **Begivenheder** (Kalender) fanebladet
2. Tryk på "Min uge" knappen øverst

### Hvad der er inkluderet

Ugeoversigten viser den aktuelle uge (mandag til søndag) med:

- **Overskrift**: Ugenummer og datointerval
- **Daglig tidslinje**: Hver dag viser alle aktiviteter kronologiskt
- **Statuschip**: Hurtige tællere af begivenheder, rejser og andre elementer
- **Farvekodede elementer**: Hver kilde har sin egen farve

### Sektioner

| Sektion | Indhold |
|---------|---------|
| **Arrangementer** | Manuelle begivenheder for ugen |
| **Spond** | Sportsklubarrangementer med RSVP-status |
| **Rejser** | Aktive rejser (transport, hoteller, restauranter) |
| **Sundhed** | Sundhedsaftaler og medicin |
| **Kæledyr** | Dyrlægebesøg og vaccinationer |
| **Skole** | Skoleaktiviteter (tur, aktivitet, møde) |
| **Børnehave** | Børnehaveaktiviteter |
| **Fødselsdage** | Kommende fødselsdage |
| **Middage** | Uge madplan (morgenmad, frokost, aftensmad)

### Tilpas sektioner

Du kan vise/skjule sektioner i Profil > "Min uge" indstillinger. Tilpas hvilken information der vises i din ugeoversigt.

---

## Moduler

Adgang til alle moduler fra **Vores steder** fanebladet. Hvert modul har sit eget kort med et ikon, navn og elementantal.

### Rejser & Transport

**Ikon**: Kompas | **Farve**: #7EC8E3 (Blå)

Planlæg og organiser familiejrejer med:

- **Rejseoversigt**: Opret rejser med destination, datoer og koordinater
- **Transport**: Book fly, tog, busser, både, taxier, færger med afgang-/ankomsttider
- **Hoteller**: Indkvartering med ind-/udtjekningstider og adresser
- **Restauranter**: Reservationer med datoer og noter
- **Aktiviteter**: Planlagte aktiviteter med skemaer
- **Pakkelister**: Afkrysningsbare pakkelister
- **Dokumenter**: Upload og gem rejsedokumenter
- **Links**: Gem nyttige URL'er
- **Vejr**: AI-hentede vejrudsigter for din destination
- **Destinationstips**: AI-genererede rejsetips (ting at gøre, restauranter, lokale sætninger, advarsler om svindel)

**Tilføj transport**: Hver transporttype (fly, tog, bil, båd, taxi, færje) bruger et dobbeltformularmønster med afgang (utreise) og ankomst (hjemreise) faner. Markér "En vej" for at skjule hjemrejsesformularen.

### Sundhed

**Ikon**: Medicinsk | **Farve**: #C67B5C (Rød/Brun)

Spor familiens sundhedsoplysninger:

- **Medicin**: Spor recepter med dosering og frekvens
- **Aftaler**: Planlæg lægebesøg med dato, tid, placering
  - **Person**: Multivalg — tildel aftaler til flere familiemedlemmer
  - **Læge**: Lægens navn
  - **Dato/Tid**: dateFrom/dateTo med automatisk synkronisering
  - **Påmindelser**: Venlige etiketter (30 min, 1 time, 2 timer, 1 dag, 1 uge)
- **Vaccinationer**: Registrer vaccinationer med næste forfaldsdato
- **Allergier**: Dokumenter allergier med sværhedsgrader
- **Vækst**: Log højde- og vægtmålinger over tid

Hver sektion kan foldes sammen med tilføj/rediger/slet funktionalitet. Aftaler med placeringer viser et kort der åbner Google Maps ved tryk.

### Kæledyr

**Ikon**: Kæledyr | **Farve**: #9B7DB8 (Lilla)

Administrer kæledyrspasning med dedikerede sektioner:

- **Kæledyr**: Tilføj kæledyr med navn, type, race, fødselsdag, chip-ID, pasnummer
- **Dyrlægebesøg**: Planlæg og spor dyrlægeaftaler
  - **Læge**: Dyrlægens navn
  - **Dato/Tid**: dateFrom/dateTo med automatisk synkronisering
  - **Påmindelser**: Venlige etiketter (30 min, 1 time, 2 timer, 1 dag, 1 uge)
- **Medicin**: Spor kæledyrsmedicin og doseringer
- **Foder**: Registrer fodringsskemaer og mængder
- **Pelspleje**: Spor pelsplejeskema med næste forfaldsdato
- **Vaccinationer**: Registrer vaccinationshistorik
- **Forsikring**: Gem forsikringspolicyoplysninger og udløbsdatoer

### Skole

**Ikon**: Dokumenter | **Farve**: #6B8F71 (Grøn)

Organiser skoleoplysninger:

- **Børn**: Tilføj børn med skolenavn og kontaktoplysninger
- **Aktiviteter**: Opret skoleaktiviteter (tur/aktivitet/møde) med:
  - **Type**: tur, aktivitet, møde
  - **Datointerval**: dateFrom/dateTo med automatisk synkronisering (dateTo matcher dateFrom ved ændring, aldrig før dateFrom)
  - **Tidsinterval**: Valgfrie start-/sluttider
  - **Påmindelser**: Venlige etiketter (Ingen, 30 min, 1 time, 2 timer, 1 dag, 1 uge)
  - **Dokumenter**: Upload og gem dokumenter (samtykkessedler, skemaer osv.)
  - **Kalendersynkronisering**: Google Calendar-integration for alle aktivitetstyper
- **Kontakter**: Lærere og klassekammerater med telefon/e-mail/forældreoplysninger
- **Skemaer**: Upload semesterskema billeder

**AI-import**: Brug Skole AI-funktionen til at:
1. Tag et foto af en klasseliste
2. AI udtrækker alle navne og forældres kontaktoplysninger
3. Gennemse og bekræft de udtrukne data
4. Kontakter tilføjes automatiskt

### Børnehave

**Ikon**: Børnehave | **Farve**: #E8836A (Orange)

Administrer børnehaveoplysninger med de samme funktioner som Skole:

- **Børn**: Tilføj børn med børnehavenavn og kontaktoplysninger
- **Aktiviteter**: Opret børnehaveaktiviteter (tur/aktivitet/møde) med dato-/tidsintervaller, påmindelser, dokumenter og kalendersynkronisering
- **Kontakter**: Lærere og personale med kontaktoplysninger
- **Skemaer**: Upload skemabilleder

### Fødselsdage

**Ikon**: Fødselsdag | **Farve**: Orange

Glem aldrig en fødselsdag:

- **Fødselsdagsliste**: Tilføj fødselsdage med navn og dato
- **Gaveidéer**: Tilføj gaveidéer til hver fødselsdag og markér som købt
- **Notifikationer**: Modtag push-notifikationer på dagen og 7 dage før

### Madplan

**Ikon**: Bestik | **Farve**: Teal

Planlæg familiemåltider med:

- **Opskriftsbog**: Gennemse, søg og filtrer opskrifter efter kategori
- **AI-opskriftsforslag**: Beskriv hvad du vil have, få 3 opskriftsvarianter
- **Import fra URL**: Indsæt en opskrifts-URL og AI udtrækker opskriften
- **Foto til opskrift**: Tag et foto af en opskrift, AI udtrækker ingredienser og instruktioner
- **Opskriftsoversættelse**: Oversæt opskrifter til norsk, svensk, dansk, engelsk eller finsk
- **Uge madplan**: Tildel morgenmad, frokost og aftensmad for hver dag
- **Indkøbslister**: Generer indkøbslister automatiskt fra madplaner

**Opskriftskategorier**: kylling, kød, fisk, vegetarisk, pasta, gryde, suppe, morgenmad, dessert

### Indkøbslister

Opret og administrer afkrysningsbare indkøbslister. Elementer kan tilføjes fra madplanen eller manuelt.

---

## Stemme & Foto til Begivenhed/Aktivitet

### Stemme-til-Begivenhed/Aktivitet

Opret begivenheder eller aktiviteter ved at tale:

1. Tryk på **+**-knappen > "Tale" i hvilken som helst modulsektion
2. Tryk på mikrofonen for at begynde optagelse
3. Tal naturligt, f.eks.: "Møde med børnehaven onsdag klokken 14"
4. Tryk på stop når du er færdig
5. AI transskriberer din tale og udtrækker:
   - Begivenhed/aktivitetstitel
   - Dato (fortolker "i morgen", "på mandag" osv.)
   - Tid (forstår "halv tre", "kvart over to" osv.)
   - Beskrivelse
6. Gennemse og rediger om nødvendigt
7. Gem

Stemme-til-begivenhed virker for alle moduler:
- **Begivenheder**: Opretter en kalenderbegivenhed
- **Sundhed**: Opretter en sundhedsaftale
- **Kæledyr**: Opretter et dyrlægebesøg
- **Skole**: Opretter en skoleaktivitet (tur/aktivitet/møde)
- **Børnehave**: Opretter en børnehaveaktivitet

### Foto-til-Begivenhed/Aktivitet

Opret begivenheder eller aktiviteter fra fotos:

1. Tryk på **+**-knappen > "Foto" i hvilken som helst modulsektion
2. Tag et foto eller vælg fra galleriet
3. AI udtrækker alle synlige begivenheder/aktiviteter med titler, datoer og tider
4. Gennemse de udtrukne begivenheder
5. Gem individuelt eller gem alle

### Foto-til-Opskrift

Importér opskrifter fra fotos:

1. Gå til Madplan > tryk på kameraikon
2. Tag et foto af en opskrift fra en kogebog eller skærm
3. AI udtrækker: navn, ingredienser med mængder, instruktioner
4. Gennemse og gem i din opskriftsbog

---

## DatoVælger & Påmindelser

### DatePickerModal

Alle dato- og tidsindtastninger bruger en brugerdefineret DatePickerModal med disse funktioner:

- **Rullbar liste**: Gennemse datoer (365 dage) eller tider (30-minuttersintervaller)
- **Søgefelt**: Skriv en dato (YYYY-MM-DD) eller tid (HH:MM) for at hoppe direkte til
- **Manuel datointastning**: Nederst i datovælgeren, skriv en vilkårlig dato manuelt — nyttigt for historiske datoer (fødselsdage, tidligere vaccinationer osv.)
- **Automatisk rulning**: Når en dato tastes eller vælges, ruller listen for at vise den

### dateFrom/dateTo Automatisk synkronisering

For aktiviteter med datointervaller (skole, børnehave, sundhed, dyrlæge):
- Ændring af **dateFrom** opdaterer automatisk **dateTo** til at matche
- **dateTo** sættes aldrig før **dateFrom**
- Du kan manuelt indstille forskellige slutdatoer

### Påmindelsesmuligheder

Alle moduler bruger de samme påmindelsesmuligheder:

| Etiket | Minutter |
|--------|----------|
| Ingen | 0 |
| 30 min | 30 |
| 1 time | 60 |
| 2 timer | 120 |
| 1 dag | 1440 |
| 1 uge | 10080 |

Påmindelser sendes som telefonnotifikationer med venlige etiketter (ikke "60 minutter" men "1 time").

Standardpåmindelse: **1 time** (60 minutter)
Standardtid for nye elementer: **10:00–11:00**

---

## Profil & Indstillinger

Profilfanebladet indeholder alle dine personlige og familiens indstillinger.

### Personlige indstillinger

- **Navn**: Rediger dit vist navn
- **Telefon**: Tilføj dit telefonnummer
- **Avatar**: Upload et profilbillede (bruges i chatten)
- **Sprog**: Vælg mellem norsk, svensk, dansk, engelsk og finsk

### Familieadministration

- **Opret familie**: Start en ny familiegruppe
- **Tilslut familie**: Indtast en 6-tegns invitationskode
- **Invitér medlem**: Generer en delbar invitationskode (kun administrator/ejer)
- **Fjern medlem**: Fjern nogen fra familien (kun administrator/ejer)
- **Ændr rolle**: Forfrem/nedgrader mellem administrator og medlem (kun administrator/ejer)
- **Forlad familie**: Forlad den nuværende familie (kun ikke-ejere)

### Kalenderintegration

1. Forbind din Google- eller Outlook-kalender
2. Vælg hvilken kalender du vil synkronisere begivenheder til
3. Når du opretter begivenheder med "Tilføj til kalender" aktiveret, eksporteres begivenhederne
4. Google Calendar-synkronisering fungerer for alle aktivitetstyper: begivenheder, skoleaktiviteter, børnehaveaktiviteter, sundhedsaftaler, dyrlægebesøg

### Notifikationer

- Aktiver/deaktiver push-notifikationer
- Konfigurer hvilke sektioner der vises i "Min uge" ugeoversigten
- Fødselsdagspåmindelser sendes automatiskt kl. 08:00 Oslo-tid
- Aktivitetspåmindelser bruger venlige etiketter (ikke rå minutal)

### Spond-integration

1. Indtast din Spond-e-mail og adgangskode
2. Vælg hvilke Spond-grupper du vil synkronisere
3. Kortlæg Spond-medlemmer til familiemedlemmer til RSVP-sporing
4. Spond-begivenheder vises automatiskt i din kalender

---

## Temaer

fampad tilbyder 9 visuelle temaer tilgængelige fra profilindstillingerne:

| Tema | Beskrivelse |
|------|-------------|
| **Lyst** | Rent hvid baggrund |
| **Mørkt** | Øjenvenligt til aftenbrug |
| **System** | Følger din enheds lyst/mørkt-indstilling |
| **Orange** | Varm orange accent |
| **Dyb blå** | Professionel dybblå palet |
| **Sølv** | Elegante sølvtoner |
| **Lilla** | Kreativt lilla tema |
| **Lyserød** | Vibrerende lyserøde accenter |
| **Teal** | Beroligende teal farveskema |

Dit temapræference gemmes og bevares mellem sessioner.

---

## Sprogunderstøttelse

fampad understøtter 5 sprog:

1. **Norsk (Bokmål)** — Standard
2. **Svensk**
3. **Dansk**
4. **Engelsk**
5. **Finsk**

### Skift sprog

1. Gå til Profil
2. Rul ned til "Sprog"
3. Vælg dit foretrukne sprog
4. Hele brugerfladen opdateres øjeblikkeligt

### Opskriftsoversættelse

Opskrifter kan oversættes til alle 5 sprog:
1. Åbn en opskrift
2. Tryk på oversættelsesknappen
3. AI oversætter opskriftens navn, beskrivelse, ingredienser og instruktioner
4. Tryk på en sprogfane for at se på det sprog

---

## PWA & Installation

### Installer fampad

fampad er en Progressive Web App (PWA) der kan installeres på din enhed:

**På iOS (Safari):**
1. Åbn fampad i Safari
2. Tryk på Del-knappen (firkant med pil)
3. Tryk på "Føj til hjemmeskærm"
4. Navngiv den og tryk på "Føj"

**På Android (Chrome):**
1. Åbn fampad i Chrome
2. Tryk på menuknappen med tre prikker
3. Tryk på "Føj til hjemmeskærm"
4. Bekræft installationen

**På desktop:**
1. Led efter installationsikonet i adresselinjen
2. Klik for at installere fampad som en desktop-app

### Opdateringsbanner

Når en ny version er tilgængelig, viser fampad et opdateringsbanner. Tryk for at opdatere og få den nyeste version.

---

## Tips & Tricks

### Hurtig navigation

- Brug **+**-knappen til hurtigt at oprette begivenheder, sundhedselementer, kæledyrbesøg, skole-/børnehaveaktiviteter eller rejser
- Langt tryk på elementer for rediger/slet-muligheder
- Tryk på kalenderprikker i kalendervision for at se den dags begivenheder

### Spond-integration

- Forbind Spond for at se alle klubarrangementer sammen med familiebegivenheder
- RSVP direkte fra fampad-appen
- Se hvilke familiemedlemmer der deltager

### Madplanlægning

- Brug AI-forslag til at opdage nye opskrifter
- Importér opskrifter fra enhver hjemmeside ved at indsætte URL'en
- Foto-skann opskrifter fra kogebøger
- Generer indkøbslister fra din uge madplan

### Rejseplanlægning

- Tilføj vejrudsigter for din destination
- Få AI-genererede destinationstips og lokale sætninger
- Brug transportfaneblade (afgang/ankomst) til rundrejser
- Spor pakkelister med afkrysningsfelter

### Datasikkerhed

- All data gemmes i familiens private Firestore-database
- Kun familiemedlemmer kan se dine data
- Invitationskoder udløber efter 1 time af sikkerhedshensyn
- Du kan forlade en familie når som helst (fjerner din adgang)

---

*fampad v1.0.0 — Din familie, organiseret.*
