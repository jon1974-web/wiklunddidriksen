# fampad — Användarhandbok

<p align="center">
  <img src="../../assets/icon.png" alt="fampad Logo" width="120" height="120" />
</p>

<p align="center"><strong>Din familjs allt-i-ett-organisationsverktyg</strong></p>

---

## Innehållsförteckning

1. [Kom igång](#getting-started)
2. [Navigeringsöversikt](#navigation-overview)
3. [Händelser & Kalender](#events--calendar)
4. [Chatt](#chat)
5. [Snabbknapp för skapande](#quick-create-button)
6. [Veckoöversikt ("Min vecka")](#weekly-summary-min-uke)
7. [Platser (Moduler)](#spaces-modules)
   - [Resor & Underhåll](#trips--travel)
   - [Hälsa](#health)
   - [Djur](#pets)
   - [Skola](#school)
   - [Förskola](#kindergarten)
   - [Födelsedagar](#birthdays)
   - [Matsedel](#meal-plan)
   - [Inköpslistor](#shopping-lists)
8. [Röst & Foto till Händelse/Aktivitet](#voice--photo-to-eventactivity)
9. [Datumväljare & Påminnelser](#datepicker--reminders)
10. [Profil & Inställningar](#profile--settings)
11. [Teman](#themes)
12. [Språkstöd](#language-support)
13. [PWA & Installation](#pwa--install)
14. [Tips & Tricks](#tips--tricks)

---

## Kom igång

### Skapa ditt konto

1. Öppna fampad i din webbläsare eller installera det som en PWA
2. Ange din e-post och lösenord för att registrera dig
3. Du placeras automatiskt i ett nytt konto

### Ställ in din familj

Efter inloggning behöver du antingen skapa eller gå med i en familj:

**Alternativ A: Skapa en ny familj**
1. Gå till fliken **Profil**
2. Tryck på "Opprett familie" (Skapa familj)
3. Ange ditt familjenamn
4. Du blir **ägaren** av familjen

**Alternativ B: Gå med i en befintlig familj**
1. Be en familjadministratör att generera en inbjudningskod (Profil > Familj > "Inviter medlem")
2. Ange den 6-teckners koden på profilsidan
3. Du går med som en **medlem**

### Förstå familjroller

| Roll | Behörigheter |
|------|--------------|
| **Ägare** | Fullständig kontroll. Kan hantera alla medlemmar, skapa/ta bort familjen. Kan inte lämna. |
| **Administratör** | Kan bjuda in medlemmar, ta bort medlemmar, ändra roller. |
| **Medlem** | Kan skapa och redigera innehåll. Kan inte hantera andra medlemmar. |

---

## Navigeringsöversikt

fampad använder en nedre flikrad med flikar placerade symmetriskt runt en central "+"-knapp. Chatt och Våra platser är placerade mellan de andra flikarna och den centrala plusknappen.

| Flik | Ikon | Beskrivning |
|------|------|-------------|
| **Kalender** | Kalender | Händelser från alla källor (manuella, Spond, hälsa, djur) |
| **Chatt** | Chattbubbla | Familjekommunikation med bilder och reaktioner |
| **Våra platser** | Kompass/Hus | Platsernav — kom åt alla moduler |
| **Profil** | Person | Inställningar, familjehantering, integrationer |

**+ (plus)**-knappen i centrum av flikraden öppnar modalen för **snabbt skapande** av innehåll.

---

## Händelser & Kalender

Händelsefliken visar en enhetlig kalender för alla familjeaktiviteter.

### Visa händelser

- **Listvy**: Händelser grupperade efter datum med en scrollbar lista
- **Kalendervy**: Månadskalendernät som visar händelse prickar på varje dag
- Tryck på kalenderikonen för att växla mellan list- och kalendervy

### Händelsekällor

Händelser kommer från flera källor och är färgkodade:
- **Manuella händelser** du skapar (grön)
- **Spond-händelser** från din sportklubb (röd)
- **Hälsotidbeställningar** (#C67B5C)
- **Djurläkarbesök** (#9B7DB8)
- **Skolaktiviteter** (#6B8F71)
- **Förskoleaktiviteter** (#E8836A)
- **Resor** med start-/slutdatum (#7EC8E3)

### Skapa en händelse

1. Tryck på **+**-knappen i flikraden
2. Välj "Manuelt" (Manuellt) i händelseavsnittet
3. Fyll i detaljerna:
   - **Titel** (obligatorisk)
   - **Datum** och valfritt slutdatum
   - **Tid** och valfritt sluttid
   - **Adress** (Google Places-sökning)
   - **Beskrivning** (valfria anteckningar)
   - **Påminnelse** (Ingen, 30 min, 1 timme, 2 timmar, 1 dag, 1 vecka)
   - **Dokumentuppladdning** (valfritt)
4. Tryck på "Lagre" (Spara)

### Spond-händelser

Om du har anslutit Spond i dina profilinställningar:
- Spond-händelser från dina valda grupper visas automatiskt
- Du kan se RSVP-status (accepterad/avvisad/obesvarad) för familjemedlemmar
- Tryck på en Spond-händelse för att visa detaljer och ändra ditt svar

### Händelsedetaljer

Tryck på valfri händelse för att se:
- Fullständigt datum, tid och plats
- En statisk karta som visar platsen
- Beskrivning och anteckningar
- RSVP-status (för Spond-händelser)
- Uppladdade dokument
- Redigera och ta bort alternativ (långtryck för åtgärdsmeny)

---

## Chatt

Chattfliken erbjuder familjekommunikation med rika funktioner.

### Skicka meddelanden

1. Skriv ditt meddelande i textfältet
2. Tryck på skicka-pilen för att publicera

### Dela bilder

1. Tryck på bildikonen bredvid textfältet
2. Välj att hämta från galleriet eller ta ett foto
3. Förhandsgranska bilden
4. Tryck på skicka — bilden laddas upp till Firebase Storage

### Reaktioner

- Långtryck på ett meddelande för att lägga till en reaktion
- Tillgängliga reaktioner: Gilla, Leende, Hjärta
- Dina reaktioner visas under meddelandet

### Funktioner

- Realtidsuppdateringar via Firestore-lyssnare
- Meddelanden scrollar automatiskt till botten
- Användaravatarer visas bredvid meddelanden
- Bilder visas inline med tryck för att expandera

---

## Snabbknapp för skapande

**+**-knappen i centrum av flikraden öppnar en modal med snabba skapandealternativ organiserade efter modul. Varje modul erbjuder tre skapandemetoder: **Manuelt** (manuellt formulär), **Tale** (röstinspelning) och **Foto** (fotoigenkänning).

### Händelseavsnittet
- **Manuelt** — Skapa en ny manuell händelse
- **Tale** — Röst-till-händelse: spela in tal, AI konverterar till händelse
- **Foto** — Foto-till-händelse: ta ett foto av ett schema, AI extraherar händelser

### Hälsosavsnittet
- **Manuelt** — Skapa en ny hälsotidbeställning
- **Tale** — Röst-till-aktivitet: spela in tal, AI skapar hälsotidbeställning
- **Foto** — Foto-till-aktivitet: ta ett foto, AI skapar hälsotidbeställning

### Djuravsnittet
- **Manuelt** — Boka ett djurläkarbesök
- **Tale** — Röst-till-aktivitet: spela in tal, AI skapar djurläkarbesök
- **Foto** — Foto-till-aktivitet: ta ett foto, AI skapar djurläkarbesök

### Skolavsnittet
- **Manuelt** — Skapa en ny skolaktivitet (utflykt/aktivitet/möte)
- **Tale** — Röst-till-aktivitet: spela in tal, AI skapar skolaktivitet
- **Foto** — Foto-till-aktivitet: ta ett foto, AI skapar skolaktivitet

### Förskoleavsnittet
- **Manuelt** — Skapa en ny förskoleaktivitet
- **Tale** — Röst-till-aktivitet: spela in tal, AI skapar förskoleaktivitet
- **Foto** — Foto-till-aktivitet: ta ett foto, AI skapar förskoleaktivitet

### Reseavsnittet
- **Manuelt** — Skapa en ny resa

---

## Veckoöversikt ("Min vecka")

Veckoöversikten visar allt som händer denna vecka i en vy.

### Kom åt den

1. Gå till fliken **Händelser** (Kalender)
2. Tryck på "Min vecka" -knappen högst upp

### Vad som ingår

Veckoöversikten visar den aktuella veckan (måndag till söndag) med:

- **Sammanfattningshuvud**: Veckonummer och datumintervall
- **Daglig tidslinje**: Varje dag visar alla aktiviteter kronologiskt
- **Statuschip**: Snabba räkningar av händelser, resor och andra objekt
- **Färgkodade objekt**: Varje källa har sin egen färg

### Avsnitt

| Avsnitt | Innehåll |
|---------|----------|
| **Arrangementer** | Manuella händelser för veckan |
| **Spond** | Sportklubbsarrangemang med RSVP-status |
| **Reiser** | Aktiva resor (transport, hotell, restauranger) |
| **Helse** | Hälsotidbeställningar och mediciner |
| **Kjæledyr** | Djurläkarbesök och vaccinationer |
| **Skole** | Skolaktiviteter (utflykt, aktivitet, möte) |
| **Barnehage** | Förskoleaktiviteter |
| **Bursdager** | Kommande födelsedagar |
| **Middager** | Veckomatsedel (frukost, lunch, middag)

### Anpassa avsnitt

Du kan visa/dölja avsnitt i Profil > "Min vecka"-inställningar. Anpassa vilken information som visas i din veckovy.

---

## Platser (Moduler)

Kom åt alla moduler från fliken **Våra platser**. Varje plats har sitt eget kort med en ikon, namn och objektantal.

### Resor & Underhåll

**Ikon**: Kompass | **Färg**: #7EC8E3 (Blå)

Planera och organisera familjeresor med:

- **Reseöversikt**: Skapa resor med destination, datum och koordinater
- **Transport**: Boka flyg, tåg, bussar, båtar, taxier, färjor med avgång-/ankomsttider
- **Hotell**: Boende med in-/utcheckningstider och adresser
- **Restauranger**: Reservationer med datum och anteckningar
- **Aktiviteter**: Planerade aktiviteter med scheman
- **Packlistor**: Kryssningsbara packlistor
- **Dokument**: Ladda upp och lagra resekon
- **Länkar**: Spara användbara URL:er
- **Väder**: AI-hämtade väderprognoser för din destination
- **Destinationstips**: AI-genererade restips (saker att göra, restauranger, lokala fraser, bluffvarningar)

**Lägg till transport**: Varje transporttyp (fly, tog, bil, båt, taxi, färja) använder ett dubbelmönster med avgång (utreise) och ankomst (hjemreise) flikar. Markera "En väg" för att dölja hemresans formulär.

### Hälsa

**Ikon**: Medicinsk | **Färg**: #C67B5C (Röd/Brun)

Spåra familjens hälsoinformation:

- **Mediciner**: Spåra recept med dosering och frekvens
- **Tidbeställningar**: Boka läkarbesök med datum, tid, plats
  - **Person**: Multival — tilldela tidbeställningar till flera familjemedlemmar
  - **Läkare**: LäkarNamn
  - **Datum/Tid**: dateFrom/dateTo med automatisk synkronisering
  - **Påminnelser**: Vänliga etiketter (30 min, 1 timme, 2 timmar, 1 dag, 1 vecka)
- **Vaccinationer**: Registrera vaccinationer med nästa förfallodatum
- **Allergier**: Dokumentera allergier med svårighetsgrader
- **Tillväxt**: Logga längd- och viktmätningar över tid

Varje avsnitt kan vikas ihop med lägg till/redigera/ta bort-funktionalitet. Tidbeställningar med platser visar en karta som öppnar Google Maps vid tryck.

### Djur

**Ikon**: Djur | **Färg**: #9B7DB8 (Lila)

Hantera djurvård med dedikerade avsnitt:

- **Djur**: Lägg till djur med namn, typ, ras, födelsedag, chip-ID, passnummer
- **Djurläkarbesök**: Boka och spåra veterinärbesök
  - **Läkare**: VeterinärNamn
  - **Datum/Tid**: dateFrom/dateTo med automatisk synkronisering
  - **Påminnelser**: Vänliga etiketter (30 min, 1 timme, 2 timmar, 1 dag, 1 vecka)
- **Mediciner**: Spåra djurmediciner och doseringar
- **Föda**: Registrera matningsscheman och mängder
- **Pälsvård**: Spåra pälsvårdsschema med nästa förfallodatum
- **Vaccinationer**: Registrera vaccinationshistorik
- **Försäkring**: Spara försäkringspolicy detaljer och förfallodatum

### Skola

**Ikon**: Dokument | **Färg**: #6B8F71 (Grön)

Organisera skolinformation:

- **Barn**: Lägg till barn med skolnamn och kontaktinformation
- **Aktiviteter**: Skapa skolaktiviteter (utflykt/aktivitet/möte) med:
  - **Typ**: utflykt, aktivitet, möte
  - **Datumintervall**: dateFrom/dateTo med automatisk synkronisering (dateTo matchar dateFrom vid ändring, aldrig före dateFrom)
  - **Tidsintervall**: Valfria start-/sluttider
  - **Påminnelser**: Vänliga etiketter (Ingen, 30 min, 1 timme, 2 timmar, 1 dag, 1 vecka)
  - **Dokument**: Ladda upp och lagra dokument (samtyckesedlar, scheman osv.)
  - **Kalendersynkronisering**: Google Calendar-integration för alla aktivitetstyper
- **Kontakter**: Lärare och klasskamrater med telefon/e-post/föräldrarinformation
- **Schema**: Ladda upp halvårsschemabilder

**AI-import**: Använd Skola-AI-funktionen för att:
1. Ta ett foto av en klasslista
2. AI extraherar alla namn och föräldrakontaktinformation
3. Granska och bekräfta de extraherade uppgifterna
4. Kontakter läggs till automatiskt

### Förskola

**Ikon**: Förskola | **Färg**: #E8836A (Orange)

Hantera förskoleinformation med samma funktioner som Skola:

- **Barn**: Lägg till barn med förskolenamn och kontaktinformation
- **Aktiviteter**: Skapa förskoleaktiviteter (utflykt/aktivitet/möte) med datum-/tidsintervall, påminnelser, dokument och kalendersynkronisering
- **Kontakter**: Lärare och personal med kontaktinformation
- **Schema**: Ladda upp schemabilder

### Födelsedagar

**Ikon**: Födelsedag | **Färg**: Orange

Glöm aldrig en födelsedag:

- **Födelsedagslista**: Lägg till födelsedagar med namn och datum
- **Gåvotips**: Lägg till gåvotips för varje födelsedag och markera som köpt
- **Aviseringar**: Få push-aviseringar på dagen och 7 dagar före

### Matsedel

**Ikon**: Bestick | **Färg**: Teal

Planera familjemåltider med:

- **Receptbok**: Bläddra, sök och filtrera recept efter kategori
- **AI-receptförslag**: Beskriv vad du vill, få 3 receptvariationer
- **Import från URL**: Klistra in en recept-URL och AI extraherar receptet
- **Foto till recept**: Ta ett foto av ett recept, AI extraherar ingredienser och instruktioner
- **Receptöversättning**: Översätt recept till norska, svenska, danska, engelska eller finska
- **Veckomatsedel**: Tilldela frukost, lunch och middag för varje dag
- **Inköpslistor**: Generera inköpslistor automatiskt från matsedlar

**Receptkategorier**: kyckling, kött, fisk, vegetariskt, pasta, gryta, soppa, frukost, dessert

### Inköpslistor

Skapa och hantera kryssningsbara inköpslistor. Objekt kan läggas till från matsedeln eller manuellt.

---

## Röst & Foto till Händelse/Aktivitet

### Röst-till-Händelse/Aktivitet

Skapa händelser eller aktiviteter genom att tala:

1. Tryck på **+**-knappen > "Tale" i valfri modulavsnitt
2. Tryck på mikrofonen för att börja spela in
3. Tala naturligt, t.ex.: "Möte med förskolan onsdag klockan 14"
4. Tryck på stopp när du är klar
5. AI transkriberar ditt tal och extraherar:
   - Händelse/aktivitetstitel
   - Datum (tolkar "imorgon", "på måndag" osv.)
   - Tid (förstår "halv tre", "kvart över två" osv.)
   - Beskrivning
6. Granska och redigera vid behov
7. Spara

Röst-till-händelse fungerar för alla moduler:
- **Händelser**: Skapar en kalenderhändelse
- **Hälsa**: Skapar en hälsotidbeställning
- **Djur**: Skapar ett djurläkarbesök
- **Skola**: Skapar en skolaktivitet (utflykt/aktivitet/möte)
- **Förskola**: Skapar en förskoleaktivitet

### Foto-till-Händelse/Aktivitet

Skapa händelser eller aktiviteter från foton:

1. Tryck på **+**-knappen > "Foto" i valfri modulavsnitt
2. Ta ett foto eller hämta från galleriet
3. AI extraherar alla synliga händelser/aktiviteter med titlar, datum och tider
4. Granska de extraherade händelserna
5. Spara individuellt eller spara alla

### Foto-till-Recept

Importera recept från foton:

1. Gå till Matsedel > tryck på kameraikonen
2. Ta ett foto av ett recept från en kokbok eller skärm
3. AI extraherar: namn, ingredienser med mängder, instruktioner
4. Granska och spara till din receptbok

---

## Datumväljare & Påminnelser

### DatePickerModal

Alla datum- och tidsinmatningar använder en anpassad DatePickerModal med dessa funktioner:

- **Scrollbar lista**: Bläddra genom datum (365 dagar) eller tider (30-minutersintervall)
- **Sökfält**: Skriv ett datum (YYYY-MM-DD) eller tid (HH:MM) för att hoppa direkt
- **Manuellt datumfält**: Längst ned i datumväljaren, skriv valfritt datum manuellt — användbart för historiska datum (födelsedagar, tidigare vaccinationer osv.)
- **Automatisk scrollning**: När ett datum skrivs eller väljs, scrollar listan för att visa det

### dateFrom/dateTo Automatisk synkronisering

För aktiviteter med datumintervall (skola, förskola, hälsa, veterinär):
- Ändring av **dateFrom** uppdaterar automatiskt **dateTo** för att matcha
- **dateTo** sätts aldrig före **dateFrom**
- Du kan ställa in olika slutdatum manuellt

### Påminnelsealternativ

Alla moduler använder samma påminnelsealternativ:

| Etikett | Minuter |
|---------|---------|
| Ingen | 0 |
| 30 min | 30 |
| 1 timme | 60 |
| 2 timmar | 120 |
| 1 dag | 1440 |
| 1 vecka | 10080 |

Påminnelser skickas som telefonaviseringar med vänliga etiketter (inte "60 minuter" utan "1 timme").

Standardpåminnelse: **1 timme** (60 minuter)
Standardtid för nya objekt: **10:00–11:00**

---

## Profil & Inställningar

Profilsfliken innehåller alla dina personliga och familjeinställningar.

### Personliga inställningar

- **Namn**: Redigera ditt visningsnamn
- **Telefon**: Lägg till ditt telefonnummer
- **Avatar**: Ladda upp en profilbild (används i chatten)
- **Språk**: Välj mellan norsk, svenska, danska, engelska och finska

### Familjehantering

- **Skapa familj**: Starta en ny familjegrupp
- **Gå med i familj**: Ange en 6-teckners inbjudningskod
- **Bjud in medlem**: Generera en delbar inbjudningskod (endast administratör/ägare)
- **Ta bort medlem**: Ta bort någon från familjen (endast administratör/ägare)
- **Ändra roll**: Befordra/nedflytta mellan administratör och medlem (endast administratör/ägare)
- **Lämna familj**: Lämna den aktuella familjen (endast icke-ägare)

### Kalenderintegration

1. Anslut din Google- eller Outlook-kalender
2. Välj vilken kalender du vill synkronisera händelser till
3. När du skapar händelser med "Lägg till i kalender" aktiverad, exporteras händelserna
4. Google Calendar-synkronisering fungerar för alla aktivitetstyper: händelser, skolaktiviteter, förskoleaktiviteter, hälsotidbeställningar, djurläkarbesök

### Aviseringar

- Aktivera/inaktivera push-aviseringar
- Konfigurera vilka avsnitt som visas i "Min vecka"-veckoöversikten
- Födelsedagspåminnelser skickas automatiskt kl. 08:00 oslo tid
- Aktivitetspåminnelser använder vänliga etiketter (inte råa minutsiffror)

### Spond-integration

1. Ange din Spond-e-post och lösenord
2. Välj vilka Spond-grupper du vill synkronisera
3. Koppla Spond-medlemmar till familjemedlemmar för RSVP-spårning
4. Spond-händelser visas automatiskt i din kalender

---

## Teman

fampad erbjuder 9 visuella teman tillgängliga från profilinställningar:

| Tema | Beskrivning |
|------|-------------|
| **Ljust** | Rent vit bakgrund |
| **Mörkt** | Ögonvänligt för kvällsbruk |
| **System** | Följer din enhets ljust/mörkt-inställning |
| **Orange** | Varm orange accent |
| **Djupt blått** | Professionell djupblå palett |
| **Silver** | Eleganta silvertoner |
| **Lila** | Kreativt lila tema |
| **Rosa** | Vibrerande rosa accenter |
| **Teal** | Lugnande teal färgschema |

Ditt temapreferens sparas och behålls mellan sessioner.

---

## Språkstöd

fampad stöder 5 språk:

1. **Norska (Bokmål)** — Standard
2. **Svenska**
3. **Danska**
4. **Engelska**
5. **Finska**

### Ändra språk

1. Gå till Profil
2. Scrolla till "Språk"
3. Välj ditt önskade språk
4. Hela användargränssnittet uppdateras omedelbart

### Receptöversättning

Recept kan översättas till alla 5 språk:
1. Öppna ett recept
2. Tryck på översättningsknappen
3. AI översätter receptets namn, beskrivning, ingredienser och instruktioner
4. Tryck på en språkflik för att visa på det språket

---

## PWA & Installation

### Installera fampad

fampad är en Progressive Web App (PWA) som kan installeras på din enhet:

**På iOS (Safari):**
1. Öppna fampad i Safari
2. Tryck på Dela-knappen (fyrkant med pil)
3. Tryck på "Lägg till på hemskärmen"
4. Namnge den och tryck på "Lägg till"

**På Android (Chrome):**
1. Öppna fampad i Chrome
2. Tryck på menyknappen med tre punkter
3. Tryck på "Lägg till på hemskärmen"
4. Bekräfta installationen

**På skrivbordet:**
1. Leta efter installationsikonen i adressfältet
2. Klicka för att installera fampad som en skrivbordsapp

### Uppdateringsbanner

När en ny version är tillgänglig visar fampad en uppdateringsbanner. Tryck för att uppdatera och få den senaste versionen.

---

## Tips & Tricks

### Snabb navigation

- Använd **+**-knappen för att snabbt skapa händelser, hälsoposter, djurbesök, skol-/förskoleaktiviteter eller resor
- Långtryck på objekt för redigera/ta bort-alternativ
- Tryck på kalenderprickar i kalendervy för att se den dagens händelser

### Spond-integration

- Anslut Spond för att se alla klubbhändelser bredvid familjehändelser
- RSVP direkt från fampad-appen
- Se vilka familjemedlemmar som deltar

### Mats planering

- Använd AI-förslag för att upptäcka nya recept
- Importera recept från vilken webbplats som helst genom att klistra in URL:en
- Foto-skanna recept från kokböcker
- Generera inköpslistor från din veckomatsedel

### Resplanering

- Lägg till väderprognoser för din destination
- Få AI-genererade destinationstips och lokala fraser
- Använd transportflikar (avgång/ankomst) för rundresor
- Spåra packlistor med kryssrutor

### Dataskydd

- All data lagras i din familjs privata Firestore-databas
- Endast familjemedlemmar kan se din data
- Inbjudningskoder upphör efter 1 timme av säkerhetsskäl
- Du kan lämna en familj när som helst (tar bort din åtkomst)

---

*fampad v1.0.0 — Din familj, organiserad.*
