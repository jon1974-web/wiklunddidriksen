# fampad — Användarhandbok

<p align="center">
  <img src="../../assets/icon.png" alt="fampad Logo" width="120" height="120" />
</p>

<p align="center"><strong>Din familjs allt-i-ett-organisationsverktyg</strong></p>

---

## Innehållsförteckning

1. [Kom igång](#kom-igång)
2. [Navigationsöversikt](#navigationsöversikt)
3. [Evenemang och kalender](#evenemang-och-kalender)
4. [Chatt](#chatt)
5. [Snabb­skapa-knappen (+)](#snabb­skapa-knappen)
6. [AI-assistent](#ai-assistent)
7. [Min vecka](#min-vecka)
8. [Våra platser (moduler)](#våra-platser-moduler)
   - [Våra resor](#våra-resor)
   - [Vår hälsa](#vår-hälsa)
   - [Vår skola](#vår-skola)
   - [Förskolan](#förskolan)
   - [Våra födelsedagar](#våra-födelsedagar)
   - [Våra husdjur](#våra-husdjur)
   - [Måltidscentrum (Matsenter)](#måltidscentrum)
   - [Våra hem](#våra-hem)
   - [Inköpslistor](#inköpslistor)
9. [Skapa med röst och foto](#skapa-med-röst-och-foto)
10. [Datumväljare och påminnelser](#datumväljare-och-påminnelser)
11. [Profil och inställningar](#profil-och-inställningar)
12. [Kalersynk](#kalendersynk)
13. [Teman](#teman)
14. [Språk](#språk)
15. [PWA och installation](#pwa-och-installation)
16. [Tips och trick](#tips-och-trick)

---

## Kom igång

### Skapa konto

1. Öppna fampad i webbläsaren (eller som installerad PWA)
2. Registrera dig med e-post och lösenord — eller logga in om du redan har ett konto
3. Välj språk i steg 2 i välkomstguiden (norska, svenska, danska, engelska, finska)
4. Skapa eller gå med i en familj i steg 3 — eller hoppa över och gör det senare i Profilen

### Konfigurera din familj

Efter inloggning behöver du skapa en familj eller gå med i en:

**Alternativ A: Skapa ny familj**
1. Gå till fliken **Profil**
2. Tryck på "Opprett familie" (Skapa familj)
3. Ange familjenamnet
4. Du blir familjens **ägare**

**Alternativ B: Gå med i befintlig familj**
1. Be en familjens ägare/admin generera en inbjudningskod (Profil > Familj > "Inviter medlem")
2. Öppna den delade inbjudningslänken eller ange den 6-tecknade koden
3. Du blir med som **medlem**

### Förstå familjeroller

| Roll | Behörigheter |
|------|-------------|
| **Ägare** | Full kontroll. Kan administrera alla medlemmar. Kan inte lämna familjen. |
| **Admin** | Kan bjuda in, ta bort medlemmar och ändra roller. |
| **Medlem** | Kan skapa och redigera innehåll. Kan inte administrera andra medlemmar. |

---

## Navigationsöversikt

fampad använder en bottenflik rad med fyra flikar runt en central "+"-knapp.

| # | Flik | Ikon | Beskrivning |
|---|------|------|-------------|
| 1 | **Evenemang** (Avtaler) | Kalender | Samlad kalender från alla familjekällor (manuella evenemang, Spond, hälsa, husdjur, skola/förskola, hem, födelsedagar) |
| 2 | **Chatt** | Bubbla | Familjemeddelanden med bilder och reaktioner |
| 3 | **Våra platser** (Våre steder) | Hus | Ingång till alla moduler |
| 4 | **Profil** | Person | Inställningar, familjehantering, integrationer |

Den centrala **+**-knappen öppnar **Snabb­skapa**-menyn. Flikraden döljs automatiskt när du skriver i chatten.

---

## Evenemang och kalender

Evenemangsfliken visar en samling kalender för hela familjen.

### Visa

- **Listvy**: Evenemang grupperade per dag med veckonummerbanner
- **Kalendervy**: Månadsrutnät med prickar per dag — tryck på en dag för att se den
- Visa/dölj tidigare evenemang
- Filtrera på modul och källa (inkl. Spond-grupper med logotyper)
- Knappen "**Min vecka**" (Din uke) högst upp öppnar veckoöversikten (se egen sektion)

### Källor till evenemang

Evenemang kommer från många källor och är färgkodade per modul:

| Källa | Färg |
|-------|------|
| Manuella evenemang | #3b5a75 |
| Resor | #7EC8E3 |
| Hälsa (bokningar/mediciner/vaccinationer) | #C67B5C |
| Skolaktiviteter och -lov | #6B8F71 |
| Förskoleaktiviteter | #E8836A |
| Husdjur (veterinär/vaccinationer) | #9B7DB8 |
| Födelsedagar | #E6A817 |
| Hem (serviceavtal) | #6B7B8D |
| Måltidsslots (Måltidscentrum) | #E8906C |
| Spond-evenemang | Visas med grupplogga |

### Skapa ett evenemang

1. Tryck **+** → "Manuelt" (Manuellt) → "Avtale" (Evenemang)
2. Fyll i:
   - **Titel** (obligatorisk)
   - **Datum** och valfritt slutdatum
   - **Tid** och valfri sluttid
   - **Adress** (Google Places-sökning)
   - **Ikon** (20 fördefinierade, t.ex. Middag (middag), Bursdag (födelsedag), Sport, Kino (bio), Trening, Fjelltur (fjällvandring))
   - **Personer** (välj familjemedlemmar)
   - **Beskrivning** (valfria anteckningar)
   - **Påminnelse** (Ingen, 30 min, 1 tim, 2 tim, 1 dag, 1 vecka)
   - **Upprepning** (schemalägg dagar/veckor, udda och jämna veckor — t.ex. "varannan vecka")
   - **Dokument** (ladda upp bilagor)
3. Tryck "Lagre" (Spara)

### Evenemangsdetaljer

Tryck på ett evenemang för att se:
- Fullständigt datum, tid och plats
- Statisk karta + "Öppna i Google Maps" (när adress finns)
- Anteckningar, dokument, ikon och personer kopplade till evenemanget
- "Lägg till i Google/Outlook-kalender"-knappar (webb)
- Redigera/ta bort via långtryck (ActionModal)
- Spond-evenemang: respondentstatus-stämplar (accepterad/avböjd/ej svarat, inkl. barn) och möjlighet att ändra ditt eget svar

### Spond-evenemang

Om du har kopplat Spond i Profilinställningarna:
- Spond-evenemang från dina valda grupper visas automatiskt
- Du ser svarstatus för familjemedlemmar
- Tryck på evenemanget för detaljer och för att ändra ditt eget svar
- Grupploggor laddas upp i Profilen (egen logga per grupp)
- Spond-synkroniseringen körs automatiskt var 30:e minut

---

## Chatt

Chattfliken ger familjemeddelanden i realtid.

### Skicka meddelanden

1. Skriv ditt meddelande (max 500 tecken)
2. Tryck på skicka-knappen

### Dela bilder

1. Tryck på bildikonen bredvid textfältet
2. Välj från biblioteket eller ta nytt foto
3. Förhandsgranska bilden
4. Skicka — bilden laddas upp till Firebase Storage

### Reaktioner

- Tryck på "+"-knappen bredvid meddelandet för att öppna reaktionsväljaren
- Tillgängliga reaktioner: Like 👍, Smile 😊, Heart ❤️
- Antal visas per reaktion; tryck på en reaktionsbricka för att gilla/ta bort
- Dina egna reaktioner är markerade

### Funktioner

- Realtidsuppdatering via Firestore
- Dagsskillnader ("I dag" / "I går") mellan meddelandegrupper
- Avatarer bredvid meddelanden
- Senaste 100 meddelandena laddas, max 500 tecken per meddelande
- Andra familjemedlemmar får pushnotis (Cloud Function `notifyNewChatMessage`)
- Tryck på bilder för helskärmsvy
- Flikraden döljs medan chattens tangentbord är aktivt

---

## Snabb­skapa-knappen (+)

Den centrala "+"-knappen öppnar Snabb­skapa-menyn med två steg:

**Steg 1: Välj metod**
- ✏️ **Manuellt** — vanligt formulär
- 🎤 **Röst** — spela in röst; AI konverterar till ett objekt i vald modul
- 📷 **Foto** — ta/välj från bibliotek; AI extraherar data från bilden

**Steg 2: Välj modul**
1. **Evenemang** (manuella kalenderhändelser)
2. **Hälsotid**
3. **Veterinärbesök**
4. **Skolaktivitet**
5. **Förskoleaktivitet**
6. **Serviceavtal** (hem)
7. **Resa**

AI-assistentraden finns högst upp i Snabb­skapa-menyn — se nästa sektion.

---

## AI-assistent

AI-assistenten är en konversationsbaserad hjälpare i appen (högst upp i Snabb­skapa-menyn). Den kan:
- Svara på frågor (t.ex. "Vad händer på onsdag?")
- Navigera dig till skärmar (hälsa, husdjur, skola, förskola, hem, evenemang, resor)
- Utföra åtgärder efter din bekräftelse (t.ex. "Skapa en hälsotid tisdag kl. 10" → bekräfta → skapad)
- Via mikrofonikonen: spela in tal som transkriberas och skickas till assistenten
- Rätta svar: du kan skriva in en korrigering om assistenten svarar fel

---

## Min vecka

"Min vecka" (Din uke) visar allt som händer denna vecka i en vy.

### Öppna den

1. Gå till fliken **Evenemang**
2. Tryck på "Din uke"-knappen högst upp

### Vad som visas

- Sammanfattningsrubrik med veckonummer och datumperiod
- Dagkort med väder för din hemadress
- Statistikbrickor (antal evenemang, resor, skol-/förskoleaktiviteter)
- Kronologisk agenda per dag som kombinerar alla källor: evenemang, Spond, resor (inkl. transport/hotell/restauranger), hälsotider, mediciner, vaccinationer, veterinärbesök och -vaccinationer, skola/förskola (aktiviteter och lov), födelsedagar, hemtjänster och veckomeny-slots

### Anpassa

Under Profil → "Min vecka" (Min uke):
- **Veckomeny**: visa/dölj måltidssektionen i Min vecka
- **Måltidscentrum-inställningarna** (Frukost 🥞 / Lunch 🥪 / Middag (middag) 🍽️) styr vilka måltider som visas och räknas

---

## Våra platser (moduler)

Alla moduler nås från fliken **Våra platser**. Varje kort visar ikon, namn och antal objekt.

| Modul | Färg |
|-------|------|
| Våra resor | #7EC8E3 |
| Vår hälsa | #C67B5C |
| Vår skola | #6B8F71 |
| Förskolan | #E8836A |
| Våra födelsedagar | #E6A817 |
| Våra husdjur | #9B7DB8 |
| Måltidscentrum | #E8906C |
| Våra hem | #6B7B8D |

### Våra resor

Planera och organisera familjeresor:

- **Reseöversikt**: resor med stad, land, datum, tider och familjemedlemmar (obligatoriskt); resekort visar statisk karta och väderbricka per stad
- **Väder**: 10-dagers väderprognos + timme för timme (morgon/lunch/eftermiddag/kväll/natt) per dag med temperatur, UV-index, regnsannolikhet, vind; historiskt genomsnitt för framtida resor; paginering och uppdatering
- **Valutaväxlare**: livekurser (Frankfurter API), land→valuta autoval, byt riktning
- **Transport**: flyg, tåg, hyrbil, båt, färja och taxi med eget formulär per typ (flygplats/terminal, flightnr, bokningsnr, säte, vagn, förare, reg.nr.) och avresa/hemresa-flikar med "En vei"-brytare; transportdetaljer stödjer kartor och länkar till bolag (Norwegian, SAS, Vy, Hertz m.fl.)
- **Hotell, restauranger, aktiviteter**: formulär för datum/tid, adress (Google Maps) och anteckningar
- **Packlistor**: avbockbara packlistor, byt namn, kopiera lista, radera
- **Dokument**: ladda upp och spara reisedokument
- **Användbara länkar**: spara länkar med favicon-förhandsvisning
- **Destinationstips (AI)**: AI-genererade tips per stad (saker att göra, restauranger, lokala fraser, varningar)

**Transportformulär**: varje transportmedel (fly/tog/bil/båt/ferje/taxi) använder dubbelformulär med **Utreise/Hjemreise**-flikar och "En vei"-brytare som döljer hemresan.

### Vår hälsa

Håll koll på familjens hälsa:

- **Bokningar (tider)**: datum, klockslag, läkarnamn, adress/karta, anteckningar
  - **Person**: välj familjemedlem (mer än en kan väljas)
  - **Påminnelser**: vänliga etiketter (30 min, 1 tim, 2 tim, 1 dag, 1 vecka)
- **Mediciner**: namn, styrka/dos, frekvens (1–4× dagligen) med separata tider per slot och egna påminnelsetider per slot
- **Vaccinationer**: datum och nästa förfallodatum
- **Allergier**: med allvarlighetsgrad (mild/måttlig/svår)
- **Tillväxt**: logga längd och vikt över tid
- Personväljare: alla objekt kan tilldelas familjemedlemmar
- Dokument kan laddas upp
- Bokningar med plats visar karta som öppnar Google Maps
- Märken: "I dag", "Om N dagar"
- Allt nytt pushas till familjen (Cloud Function `notifyHealthItem`)
- Röst/foto-skapande fungerar även för hälsotider

### Vår skola

Organisera skolinformation per barn:

- **Barn**: lägg till barn med skolnamn, årskurs, kontaktinfo
- **Års-flikar**: skapa/redigera/ta bort skolår
- **Rutor**: Kontakter, Schema, Aktiviteter, Lov
- **Kontakter**: lärare, hälsopersonal (rektor m.fl.), klasskamrater med telefon/e-post/föräldrainfo — direkta ringa/e-posta-knappar
- **Schema**: per termin, dag/tid/ämne/lärare
- **Aktiviteter**: tur/aktivitet/möte med datumperiod, påminnelse, dokument, bilder och Google-kalendersynk
- **Lov**: manuell, AI-import från foto, eller import från URL (skolans webbplats)
- **AI-import**: foto av kontaktlista eller lovlista → AI extraherar → markera/avmarkera alla → spara
- Aktiviteter med upprepning stödjer gruppkopiering

### Förskolan

Samma funktionsuppsättning som Skolan, men för förskolan (barn, kontakter, schema, aktiviteter, lov, AI-import).

### Våra födelsedagar

Glöm aldrig en födelsedag:

- **Födelsedagslista**: namn + datum, med nedräkning ("I dag" / "Om N dagar") och ålder
- **Presenter idéer**: per födelsedag — lägg till presenter, bocka av köpta, se förra årets presenter
- **Notiser**: push 7 dagar före och på dagen (kl. 08:00 lokal tid)
- Max 50 födelsedagar

### Våra husdjur

Hantera husdjursvård:

- **Husdjur**: namn, typ (katt, hund, fisk, fågel, kanin, sköldpadda, hamster, häst, annat), kön, ras, födelsedag, ID-nummer, pass, chip-ID + chipdatum, foto
- **Veterinärbesök**: datum, veterinär, plats (karta), påminnelse, dokument
- **Mediciner**: namn, dos, frekvens
- **Foder**: mängd/typ
- **Skötsel**: senast gjort / nästa
- **Vaccinationer**: datum + nästa förfallodatum
- **Försäkring**: bolag, policenr, utgångsdatum, dokument
- Röst/foto-skapande fungerar även här

### Måltidscentrum (Matsenter)

Planera familjens måltider med tre underflikar:

- **Veckomeny**: meny mån–sön, med frukost/lunch/middag-slots från din profil; tilldela recept till slots; navigera veckor; "Kopiera från förra veckan"; "Tillbaka till aktuell vecka"; slumpförslag ("Denna veckan…")
- **Recept**: samla recept (max 200) med kategorier (favoriter ❤️, kylling (kyckling), kjøtt (kött), fisk, vegetar (vegetariskt), pasta, gryte (gryta), suppe (soppa), frokost (frukost), sott (dessert)); sök; AI-receptsökning på 22 språk; import från URL; foto→recept (OCR); tid/portioner/variant/kök med landsflaggor; automatisk kaloriestimering (AI) om inte angiven
- **Inköpslista**: realtids-avbockbar inköpslista; kopiera, byt namn, radera — varor kan läggas direkt från recept (ingredienser)

### Inköpslistor

- Skapa och hantera avbockbara inköpslistor (max 100)
- Varor kan bockas av/på
- Byt namn, kopiera, radera listor
- Varor kan läggas direkt från recept i Måltidscentrum

### Våra hem

Hantera hem och stugor:

- **Hem**: typ (hus, sommarstuga, vinterstuga, lägenhet), adress (Google Places), postnummer/ort, beskrivning, foto, statisk karta
- **Instruktioner**: "Komme hjem" (komma hem)- och "Forlate hjem" (lämna hem)-sektioner med fotoscan (OCR extraherar instruktionstext och färgetiketter)
- **Underhåll – Serviceavtal**: datum/tid/frekvens (engång/månadsvis/kvartalsvis/årlig), upprepning (dagar/veckor), kalendersynk + push till familjen
- **Färgkoder**: foto av etikett/vägg → AI extraherar namn/kod/hex; märke, rum
- **Projekt**: status (aktiv/väntar/klar), budget (budget/förbrukat/återstående), färgkoder med OCR, interna inköpslistor (namn, antal, enhetspris, summa), anbud (leverantör, pris, kvitto-OCR), uppgifter (att göra/pågår/klar), "Koppla till inköpslista", AI-förslag till projektuppgifter och projektanalys

---

## Skapa med röst och foto

### Röst → objekt

Skapa objekt genom att tala:

1. Tryck **+** → "Tale" (Röst) → välj modul
2. Tryck på mikrofonen för att starta inspelning
3. Tala naturligt, t.ex. "Möte med förskolan på onsdag klockan 14"
4. Tryck stopp
5. AI transkriberar och extraherar: titel, datum (förstår "i morgen" ("i morgon"), "på mandag" ("på måndag")), tid (förstår "halv tre", "kvart över två"), beskrivning
6. Granska och redigera
7. Spara — evenemang läggs även in i telefonkalendern och pushas till familjen

Fungerar för: Evenemang, Hälsotid, Veterinärbesök, Skolaktivitet, Förskoleaktivitet, Serviceavtal (hem), Resa.

### Foto → objekt

1. Tryck **+** → "Foto" → välj modul
2. Ta foto eller välj från biblioteket
3. AI extraherar alla synliga objekt med titlar, datum och tider
4. Granska, redigera, välj de du vill behålla
5. Spara en och en eller alla på en gång

### Foto → recept

1. Måltidscentrum → kameraikon
2. Foto av recept från kokbok eller skärm
3. AI extraherar namn, ingredienser med mängder, tillvägagångssätt
4. Spara i receptboken

---

## Datumväljare och påminnelser

### DatePickerModal

Alla datum-/tidfält använder en anpassad väljare:

- **Rullbar lista**: datoförslag (760 dagar) eller tider (30-min-intervall)
- **Sökfält**: skriv datum (YYYY-MM-DD) eller tid (HH:MM) för att hoppa direkt
- **Manuell inmatning**: skriv in valfri dag — användbart för historiska datum (födelsedagar, tidigare vaccinationer)
- **Auto-scroll**: listan scrollar till vald/skriven dag

### dateFrom/dateTo auto-synk

För aktiviteter med datumperiod (skola, förskola, hälsa, van):
- Ändring av **dateFrom** uppdaterar **dateTo** automatiskt
- **dateTo** sätts aldrig före **dateFrom**
- Du kan ange annat slutdatum manuellt

### Påminnelsevalg

| Etikett | Minuter |
|---------|---------|
| Ingen | 0 |
| 30 min | 30 |
| 1 time (tim) | 60 |
| 2 timer (tim) | 120 |
| 1 dag | 1440 |
| 1 uke (vecka) | 10080 |

Påminnelser skickas som telefonnotiser med vänliga etiketter. Standard: **1 timme**. Standardtid för nya objekt: **10:00–11:00**.

Mediciner stödjer egna tider per dos (1–4× dagligen), med separata påminnelsetider per tidpunkt.

---

## Profil och inställningar

Profilfliken innehåller alla personliga och familjeinställningar.

### Personligt

- **Namn**: redigera visningsnamn
- **Telefon**: lägg till telefonnummer
- **Avatar**: ladda upp profilbild (används i chatten)
- **E-post**: (skrivskyddat)

### Familj

- **Familjekort**: se medlemmar och roller
- **Bjud in medlem**: generera inbjudningskod (giltig 1 timme, engångsbruk) / dela länk
- **Ändra roll**: befordra/degradera mellan admin och medlem (ägare/admin)
- **Ta bort medlem** (ägare/admin)
- **Lämna familjen** (icke-ägare)
- **Skapa familj** om du inte har någon

### Kalender

- **Kalendertyp**: välj **telefonkalender** eller **Google-kalender**
- **Google-koppling**: OAuth-koppling ("Koblet til ✓" (Ansluten ✓)) och frånkoppling
- **Google Sync-panel**: Kör/Dry-run med sammanfattning (skannade, skapade, skippedExists (fanns redan), återskapade, misslyckade, inte anslutna) och fellista
- **Telefonkalender**: iOS (via expo-calendar) lägger in evenemang i telefonens kalender
- Webb: "Lägg till i Google/Outlook-kalender"-knappar per objekt

### Notiser

- Slå på/av pushnotiser (behörighet begärs)
- Medicinpåminnelser per tidpunkt, födelsedagsnotiser (7 dagar före + på dagen, kl. 08:00 lokal tid), aktivitetspåminnelser
- Webb: visar banner för missade påminnelser de senaste 7 dagarna (kan avfärdas)

### Min vecka

- Visa/dölj "Veckomeny"-delen (måltider) i Min vecka
- Måltidscentrum-växlare: Frukost 🥞 / Lunch 🥪 / Middag 🍽️

### Måltidscentrum

- Slot-växlare: Frukost 🥞 / Lunch 🥪 / Middag 🍽️
- Styr veckomenyn och "Min vecka"

### Spond (ägare/admin)

1. Ange Spond e-post och lösenord (krypterat vid lagring)
2. Välj vilka grupper som ska synkas
3. Ladda upp/välj logga per grupp (bibliotek eller kamera)
4. Välj vem som kan svara ("respondenter")
5. Spond-evenemang visas automatiskt i kalendern (synk var 30:e minut)
6. Koppla från Spond-konto

### Tema

Se sektionen [Teman](#teman) för detaljer. (se egen sektion)

### Språk

Se sektionen [Språk](#språk).

### App (endast webb)

- "Ladda om" — ta bort service workers och cache för att tvinga en uppdatering

---

## Kalendersynk

fampad stödjer tvåvägs kalendersynkronisering:

**Google Kalender (via Cloud Functions):** Evenemang, resor, transport, mediciner, hälsobokningar, veterinärbesök, skol-/förskoleaktiviteter, hemtjänst-avtal — skapelse, uppdatering och radering synkroniseras automatiskt för användare som har kopplat Google-kalendern.

**Phone Calendar (Telefonkalender)**: iOS-appen kan lägga in evenemang direkt i telefonens kalender (välj telefonkalender i Profil). Webb-användare använder "Lägg till i Google/Outlook"-knappar per objekt.

**Backfill (Efterfyllnad)**: Kör manuell synkronisering av befintlig data via Google Sync-panelen (Dry-run visar vad som kommer att hända).

---

## Teman

fampad erbjuder flexibelt temaval via Profilinställningarna:

**Rad 1 — Modulfärger** (ändrar appakcenten till modulens färg):
- Skola (#6B8F71), Förskola (#E8836A), Resor (#7EC8E3), Födelsedagar (#E6A817), Husdjur (#9B7DB8), Måltider (#E8906C), Hälsa (#C67B5C)

**Rad 2 — Appfärger**:
- Slategray (blågrå, #3b5a75), Dustyrose (dunkelrosa, #A37B85)

**Rad 3 — Mörkt läge**:
- Mörkt (#333)-växling

Ljus/Mörk/System följer enhetens ljusa/mörka inställning när "system" är valt. Temapreferans sparas och består mellan sessioner.

---

## Språk

fampad stödjer 5 gränssnittsspråk:

1. **Norsk (Bokmål)** — standard
2. **Svenska**
3. **Dansk**
4. **English (Engelska)**
5. **Suomi (Finska)**

### Byta språk

1. Gå till Profil
2. Bläddra till "Språk"
3. Välj språk med flaggknappar
4. Hela gränssnittet uppdateras omedelbart

### Receptsök och översättning

- AI-receptsökning stöder 17+ AI-sökspråk och 22 språk (inklusive de 5 gränssnittsspråken)
- Recept kan översättas till alla 5 språk (namn, beskrivning, ingredienser, tillvägagångssätt)

---

## PWA och installation

### Installera fampad

fampad är en Progressive Web App (PWA):

**iOS (Safari):**
1. Öppna fampad i Safari
2. Tryck Dela-knappen
3. "Lägg till på startskärm"
4. Bekräfta

**Android (Chrome):**
1. Öppna fampad i Chrome
2. Tryck tredotsmenyn
3. "Lägg till på startskärm"
4. Bekräfta

**Desktop:**
1. Leta efter installationsikonen i adressfältet
2. Klicka för att installera

### Uppdateringsbanner

När en ny version finns visas en banner ("Ny version tillgänglig") — tryck för att ladda den. Kontrolleras var 5:e minut. Webb: "Ladda om" i Profilen rensar cache/service workers manuellt.

---

## Tips och trick

### Snabbnavigering

- Använd **+**-knappen för att snabbt skapa evenemang, hälsotider, veterinärbesök, aktiviteter, serviceavtal eller resor
- Långtryck objekt för redigera/radera-meny
- Tryck på kalenderdagar för att se dagens evenemang
- Använd AI-assistenten från + -menyn för naturliga frågor och åtgärder

### Spond

- Koppla Spond för att se klubbevent tillsammans med familjeevenemang
- Svara på inbjudningar direkt i appen (acceptera/avböja), inkl. för barn
- Se vem som kommer per evenemang (stämpelstatus)
- Spond-loggor visas på evenemang och i filterpanelen

### Måltidsplanering

- Använd AI-förslag för att upptäcka nya recept
- Importera från URL eller foto
- Generera inköpslista direkt från receptingredienser
- Planera veckomeny med frukost/lunch/middag; "Kopiera från förra veckan"
- Kalorier estimeras automatiskt med AI om inte angiven

### Reseplanering

- Väder: 10-dagars + timme för timme + historisk data per stad
- AI-destinationstips: saker att göra, restauranger, fraser, varning
- Valutaväxlare med livekurser
- Transport med Utreise/Hjemreise-flikar och "En vei"-växling
- Packlistor med kryssrutor
- Spond-loggor visas på evenemang och i filterpanelet

### Data säkerhet

- All data lagras privat per familj (Firestore, familyId-scoping)
- Endast familjemedlemmar kan se data
- Inbjudningskoder upphör efter 1 timme och kan bara användas en gång
- Du kan lämna familjen när som helst (tar bort din åtkomst)

---

*fampad v1.0.0 — Din familj, organiserad.*
