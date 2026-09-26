// One-off script: rewrite help-center articles in all 5 language files with
// accurate texts based on the audit of actual feature behavior.
// Run with: node scripts/update-help-texts.js   (then delete this file)
const fs = require('fs');
const path = require('path');

const langs = ['nb', 'en', 'sv', 'da', 'fi'];
const base = path.join(__dirname, '..', 'src', 'i18n');

// ─────────────────────────────────────────────────────────────
// NB (source of truth)
// ─────────────────────────────────────────────────────────────
const nb = {
  // ── profile.* — 7 modals ──
  profile: {
    helpCalendarWhatText:
      'Kalender-innstillingen styrer hvordan familiens hendelser lagres i kalendere. Velg «📱 Telefon-kalender» for at arrangementer, timer, vaksiner og reiser legges automatisk til i telefonens kalender. Velg «📧 Google Kalender» for å koble familien til en delt Google-kalender.',
    helpCalendarHowText:
      '1. Velg «📱 Telefon-kalender» eller «📧 Google Kalender».\n2. For Google: skriv inn e-posten din (valgfritt) og trykk «Koble til Google», deretter godkjenner du tilgangen i Googles innloggingsside.\n3. Hendelser synkroniseres automatisk til valgt kalender.\n4. Eiere kan også kjøre «Google Kalender-synk» for å fylle inn kalenderen med eksisterende hendelser.',
    helpCalendarTip:
      'Du kan koble fra Google-kalenderen når som helst med «Koble fra kalender». Alle hendelser forblir i appen.',

    helpNotificationsWhatText:
      'Varsler styrer om du mottar push-varsler i appen når familie­medlemmer legger til eller endrer innhold, for eksempel nye arrangementer og serviceavtaler.',
    helpNotificationsHowText:
      'Trykk på knappen for å slå varsler på eller av. Når varsler er «Av», mottar du ikke push-varsler på dine egne enheter — andre i familien påvirkes ikke.',
    // no Tip key used by this modal

    helpMinUkeTitle: 'Min uke',
    helpMinUkeWhatText:
      'Velg om ukemenyen skal vises i «Din uke»-oppsummeringen på Arrangementer-siden. Skjul seksjonen hvis du ikke trenger å se måltidsplanen der.',
    helpMinUkeHowText:
      'Slå av eller på bryteren for «Ukemeny». Endringen trer i kraft neste gang du åpner «Din uke».',
    helpMinUkeTip:
      'Måltidstypene (frokost, lunsj, middag) som vises, styres av Matsenter-innstillingene rett under.',

    helpMatsenterWhatText:
      'Velg hvilke måltidstyper som skal vises i ukemenyen og i «Din uke»-oppsummeringen: frokost, lunsj og middag.',
    helpMatsenterHowText:
      'Slå av eller på bryterne for frokost, lunsj og middag. Kun aktive måltider vises i ukemenyen og i «Din uke».',
    helpMatsenterTip:
      'Endringer gjelder umiddelbart i Matsenteret og i «Din uke» på Arrangementer-siden.',

    helpFamilyWhatText:
      'Administrer familiemedlemmer, roller og invitasjoner. Kun eiere og administratorer kan generere invitasjonslenker, endre roller og fjerne medlemmer.',
    helpFamilyHowText:
      'Trykk «Generer lenke» for å lage en invitasjonslenke med en 6-sifret kode. Trykk «Del lenke» for å dele den med den som skal bli med. Eiere og administratorer kan også endre roller ved å trykke på rollen, og fjerne medlemmer fra listen.',
    helpFamilyTip:
      'Invitasjonslenker utløper etter 1 time og kan bare brukes én gang. Medlemmer kan forlate familien med «Forlat familie».',

    helpMembersTip: 'Eieren kan ikke fjernes eller miste eierrollen.',

    helpSpondWhatText:
      'Koble til Spond for å vise lagets arrangementer direkte i appen. Kun eiere og administratorer ser denne seksjonen. Spond-arrangementene vises automatisk på Arrangementer-siden, der familiemedlemmer kan melde respons.',
    helpSpondHowText:
      '1. Skriv inn Spond-e-post og passord, og trykk «Koble til Spond».\n2. Velg hvilke grupper som skal vises (og last opp gruppelogo hvis du vil).\n3. Velg hvilke respondenter som kan melde seg på under «Velg respondenter».\n4. Trykk «Lagre» — uten å lagre vises ingen Spond-arrangementer.',
    helpSpondTip:
      'Spond-passordet lagres sikkert (kryptert). Du kan koble fra når som helst med «Koble fra Spond».',

    // Dead duplicate birthday block (unused by ProfileScreen) — align with spaces.* truth
    helpBirthdaysWhatText:
      'Administrer familiens bursdager. Bursdagene vises i Bursdager-modulen, på Arrangementer-siden og i «Din uke».',
    helpBirthdaysHowText:
      'Åpne Bursdager-modulen og trykk «+» for å legge til en bursdag. Hold inne en bursdag for å redigere eller slette den.',
    helpBirthdaysTip: 'Bursdager vises automatisk på Arrangementer-siden nær tidspunktet.',
  },

  // ── spaces.* — BirthdaySpaceScreen ──
  spaces: {
    helpBirthdaysWhatText:
      'Bursdager viser alle familiens bursdager sortert etter neste forekomst, med alder og nedtelling (I dag / om X dager). Bursdagene vises også på Arrangementer-siden og i «Din uke».',
    helpBirthdaysGiftsText:
      'Hver bursdag har en egen gaveliste for inneværende år. Trykk på bursdagen for å utvide listen, avkrysse gaver som kjøpt, og legge til nye gaveidéer. Under listen ser du en oppsummering av tidligere års gavelister.',
    helpBirthdaysHowText:
      'Trykk «+» for å legge til en ny bursdag (navn og dato). Hold inne en bursdag for å redigere eller slette den. Trykk på en bursdag for å utvide gavelisten, og trykk «+ Legg til gaveidé» for nye gaver.',
    helpBirthdaysTip:
      'Gavelister bevares fra år til år, slik at du kan se hva du ga forrige gang.',
  },

  // ── mealPlanner.* — 6 modals ──
  mealPlanner: {
    // Main (now reachable via new info button)
    helpTitle: 'Ukemeny',
    helpWhatText:
      'Ukemenyen lar deg planlegge måltider for hele uken. Du kan legge til frokost, lunsj og middag for hver dag, basert på oppskriftsboken din.',
    helpHowText:
      'Bruk pilene ◀ ▶ for å bla mellom uker. Trykk på en måltidsplass (f.eks. «+ Middag») for å velge oppskrift fra boken. Trykk på et planlagt måltid for å se oppskriften eller fjerne den fra planen.',
    helpTip:
      'Bruk «Kopier fra forrige uke» for å gjenbruke forrige ukes plan, og innstillingene i Profilen for å vise eller skjule frokost, lunsj og middag.',

    helpRandomWhatText:
      'Får du ikke inspirasjon til dagens middag? Trykk på knappen så foreslår vi en rett fra oppskriftsboken din.',
    helpRandomHowText:
      'Trykk på «Tilfeldig rett» for å få et forslag. Trykk «Legg til i ukeplan» for å legge retten inn som dagens middag, eller «Se oppskrift» for å åpne den.',
    helpRandomTip: 'Trykk flere ganger for å få nye forslag.',

    helpSearchWhatText:
      'Søk etter oppskrifter i boken din på navn. I samme fane kan du også filtrere på kategorier som Kylling, Vegetar og Pasta.',
    helpSearchHowText:
      'Skriv et søkeord i søkefeltet. Hvis søket ikke gir treff, kan du bruke AI-søk for å generere nye oppskrifter basert på beskrivelsen.',
    helpSearchTip:
      'Du kan også importere oppskrifter fra nettsteder med «-knappen, eller ta bilde av en oppskrift med 📷-knappen.',

    helpAiSearchWhatText:
      'AI-søket bruker kunstig intelligens til å foreslå nye oppskrifter basert på det du skriver, når søket i boken din ikke gir treff.',
    helpAiSearchHowText:
      'Skriv et søkeord i søkefeltet. Hvis ingen treff vises, trykker du «Søk med AI». Velg hvilket land oppskriftene skal komme fra — AI-en genererer tre forslag med ingredienser og fremgangsmåte.',
    helpAiSearchTip:
      'Trykk «Lagre» på et forslag for å legge det i oppskriftsboken. Deretter kan du redigere det som en vanlig oppskrift.',

    helpHandlelisteWhatText:
      'Handlelister lar deg samle varer du trenger å kjøpe. Du kan opprette egne lister eller få ingredienser automatisk fra oppskrifter.',
    helpHandlelisteHowText:
      'Trykk på «+» for å opprette en ny handleliste. Skriv inn navnet og trykk «Legg til» — du kommer rett inn i den nye listen. Hold inne en liste for å slette den.',
    helpHandlelisteRecipeText:
      'Når du åpner en oppskrift og trykker «Legg til handleliste», opprettes en ny liste med oppskriftens navn (eller ingrediensene legges til i en eksisterende liste med samme navn).',
    helpHandlelisteRecipeTip:
      'Ingrediensene oversettes til språket du har valgt i appen.',

    helpWeekMenuWhatText:
      'Ukemenyen viser måltidene for hver dag i uken. Du kan navigere mellom uker med pilene og planlegge frokost, lunsj og middag for hver dag.',
    helpWeekMenuHowText:
      'Trykk på «+»-knappen ved et måltid for å velge oppskrift (med søk). Trykk på et planlagt måltid for å se oppskriften eller fjerne den fra planen. Er du på en annen uke enn nåværende, trykker du «Tilbake til denne uken».',
    helpWeekMenuTip:
      'Bruk «Kopier fra forrige uke» nederst for å gjenbruke forrige ukes plan — knappen vises bare når uken er tom.',

    // helpWeekOverview* keys are unused by any screen — leave as-is (dead keys).
  },

  // ── detail.* — TripDetailScreen, 6 modals ──
  detail: {
    helpTransportWhatText:
      'Legg til fly, tog, leiebil, båtcruise, ferje og taxi for reisen. Utreise og hjemreise fylles inn i egne faner, og runden vises som ett samlet element i listen.',
    helpTransportHowText:
      'Trykk «+» og velg transporttype. Fyll inn selskap, rute/flightnummer, referanse (PNR), sete/plass, datoer og tider, og adresser. Skru av «Én vei» for å registrere både utreise og hjemreise.',
    helpTransportTip:
      'Hold inne på en transport for å redigere eller slette. Kun eier, admin og den som opprettet transporten kan redigere den.',

    helpHotelsWhatText:
      'Administrer overnattinger for reisen. Legg til hoteller med navn, adresse, telefon, datoer og innsjekkings-/utsjekkingstider.',
    helpHotelsHowText:
      'Trykk «+» og fyll inn hotellets navn, adresse (søk via Google), innsjekkings- og utsjekkingsdatoer og -tider, telefon og eventuelle notater. Trykk på et hotell for detaljer med kart.',
    helpHotelsTip: 'Du kan legge til flere hoteller for ulike deler av reisen.',

    helpRestaurantsWhatText:
      'Planlegg spisesteder for reisen. Legg til restauranter med navn, adresse, dato, klokkeslett og notater.',
    helpRestaurantsHowText:
      'Trykk «+» og fyll inn navn, adresse (søk via Google), dato og tid, og eventuelle notater — for eksempel reservasjonsdetaljer. Trykk på en restaurant for detaljer med kart.',
    helpRestaurantsTip:
      'Du kan legge til flere restauranter og redigere dem senere ved å holde inne.',

    helpActivitiesWhatText:
      'Planlegg aktiviteter og opplevelser for reisen. Legg til severdigheter, turer og arrangementer med dato, tid og sted.',
    helpActivitiesHowText:
      'Trykk «+» og fyll inn navn, adresse (søk via Google), dato og klokkeslett, og notater. Trykk på en aktivitet for detaljer med kart.',
    helpActivitiesTip:
      'Du kan legge til flere aktiviteter og redigere dem senere ved å holde inne.',

    helpTipsWhatText:
      'Få AI-genererte tips for reisemålet — basert på reisedatoene og værmeldingen. Du får overblikk, ting å gjøre, restauranter, nyttige fraser med uttale, transport og advarsler.',
    helpTipsHowText:
      'Søk opp byen i søkefeltet og trykk «Generer». Byen lagres på reisen, og du kan utvide den for å lese tipsene, eller trykke ↻ for å generere på nytt. Du kan legge til flere byer per reise.',

    helpDocumentsWhatText:
      'Last opp og lagre viktige reisedokumenter som flybilletter, passkopier og reservasjoner i skyen.',
    helpDocumentsHowText:
      'Utvid «Reisedokumenter»-seksjonen ved å trykke på overskriften, og trykk deretter «+» for å laste opp en fil. Gi dokumentet en tittel og eventuell beskrivelse. Trykk «Åpne» på et dokument for å se eller laste det ned, og hold inne for å slette det.',
    helpDocumentsTip:
      'Dokumentene lagres sikkert i skyen (Firebase Storage) og krever internettforbindelse for å åpnes.',
  },

  // ── homes.* — 4 modals ──
  homes: {
    helpWhatText:
      'Her kan du legge til alle hjemmene dine — hus, sommerhytte, vinterhytte og leilighet. For hvert hjem kan du åpne instruksjoner, vedlikehold og prosjekter.',
    helpHowText:
      'Trykk på «Legg til hjem»-kortet for å opprette et hjem. Fyll inn navn, type, adresse (postnummer og sted fylles ut automatisk), beskrivelse og eventuelt bilde. Hold inne på et hjem for å redigere eller slette det.',

    vedlikeholdHelpWhatText:
      'Vedlikehold hjelper deg med å holde oversikt over serviceavtaler og fargekoder for hjemmet ditt. Planlegg gjentakende service med påminnelser og dokumenter, og lagre fargekoder med navn, kode, merke og rom.',
    vedlikeholdHelpHowText:
      'Serviceavtaler: Trykk «+» for å legge til en avtale med tittel, person, dato fra/til, klokkeslett, hyppighet (engang/månedlig/kvartalsvis/årlig) og påminnelse. Bruk «Planlegg gjentakelse» for å opprette avtaler på bestemte ukedager over flere uker, med støtte for annenhver uke. Legg også ved bilder eller dokumenter.\n\nFargekoder: Trykk «+» for å legge til en farge. Bruk «Fotografér etikett» eller «Fotografér vegg» for å la AI-en lese fargen, eller skriv inn fargekode og trykk «Hent farge» for å slå opp automatisk.',
    vedlikeholdHelpTip:
      'Hold inne på en serviceavtale eller fargekode for å redigere eller slette. Serviceavtaler dukker opp i «Din uke», og fargekoder knyttet til et prosjekt redigeres i prosjektet.',

    prosjektHelpTitle: 'Prosjekter',
    prosjektHelpWhatText:
      'Prosjekter samler alt knyttet til et oppussings- eller vedlikeholdsprosjekt: fargekoder, handleliste med priser, tilbud fra leverandører, oppgaveboard og budsjettoversikt.',
    prosjektHelpHowText:
      'Trykk «+» for å opprette et prosjekt med tittel, beskrivelse, budsjett, startdato og status. Trykk på et prosjekt for å åpne det. I prosjektet får du AI-forslag til oppgaver og handleliste, kan skanne kvitteringer med AI, legge inn tilbud, og flytte oppgaver mellom «Todo», «Pågående» og «Ferdig» med pilknappene. Budsjettet settes på prosjektet og vises som oversikt over forbruk.',
    prosjektHelpTip:
      'Koble handlelisteposter til oppgaver for å holde oversikt over hva som trengs til hver oppgave. Hold inne på et prosjekt for å redigere eller slette det.',

    instruksjonerHelpWhatText:
      'Instruksjoner lar deg lagre viktig informasjon om hjemmet ditt som du kan dele med familien. Del instruksjoner for «Komme hjem» og «Forlate hjem» — for eksempel alarmkoder, Wi-Fi-passord, nøkkelsteder og lignende.',
    instruksjonerHelpHowText:
      'Trykk «+» i en seksjon for å legge til en instruksjon. Skriv inn tittel og innhold manuelt, eller bruk «Skann notat» (kamera) eller «Skann fra galleri» for å la AI-en lese håndskrevne notater og fylle inn feltene automatisk. Hold inne på en instruksjon for å redigere eller slette den.',
    instruksjonerHelpTip:
      'AI-skanningen fyller også inn riktig seksjon og legger ved et bilde av notatet.',
  },

  // ── health.* ──
  health: {
    helpWhatText:
      'Helse-modulen lar deg holde orden på medisiner, legetimer, vaksiner, allergier og vekst for alle i familien. Timer og vaksiner dukker automatisk opp i Arrangementer og «Din uke», og synkroniseres til familiens Google-kalender.',
    helpMedicationsText:
      'Legg til medisiner med navn, person, dose og frekvens (1–4 ganger daglig) med tidspunkter og påminnelser per dosering. Du kan også sette gyldighetsperiode og notat.',
    helpAppointmentsText:
      'Planlegg legetimer og tannlegebesøk med flere familiemedlemmer, lege, sted med kart, påminnelser og dokumenter. Du kan planlegge gjentakelser (f.eks. annenhver uke), og på web kan du legge timen direkte i Google- eller Outlook-kalenderen.',
    helpHowText:
      'Trykk på «+» i en seksjon for å legge til noe nytt. Trykk på et element for å se detaljer (med kart og rediger-knapp der det er relevant). Hold inne på et element for å redigere eller slette det.',
    helpTip:
      'Nye timer og vaksiner sendes push-varsler til familien, vises i «Din uke» og synkroniseres til familiens Google-kalender.',
  },

  // ── pets.* ──
  pets: {
    helpWhatText:
      'Her kan du administrere alle familiens kjæledyr. Legg til kjæledyr med navn, type, rase, kjønn, bursdag, chip ID, passnummer og bilde. For hvert kjæledyr kan du holde oversikt over veterinærbesøk, medisiner, fôring, stell, vaksiner og forsikring.',
    helpHowText:
      'Trykk på «+» for å legge til et nytt kjæledyr. Trykk på et kjæledyr for å se detaljer og legge til informasjon i de ulike seksjonene. Hold inne på et kjæledyr for å redigere eller slette det. I hver seksjon trykker du «+» for å legge til nye oppføringer, og holder inne for å redigere eller slette.',
    helpTip:
      'Veterinærbesøk synkroniseres til familiens Google-kalender, og vaksiner med dato legges inn som arrangementer. Nye besøk og vaksiner sendes også push-varsler til familien.',
    helpFeaturesText:
      'Veterinærbesøk: Planlegg besøk med dato, tid, sted, deltakere, påminnelse, dokumenter og gjentakelser. Medisiner: Følg med på medisiner med dosering, frekvens og påminnelser per dosering. Fôring: Planlegg fôringsrutiner med tid og mengde. Stell: Hold oversikt over pelsstell og klipping. Vaksiner: Registrer vaksiner med neste forfallsdato, påminnelse og status. Forsikring: Lagre forsikringsselskap, policenummer, varighet og dokumenter.',
  },

  // ── kindergarten.* ──
  kindergarten: {
    helpWhatText:
      'Barnehage-modulen lar deg holde orden på barnas barnehagehverdag. Her kan du lagre ansatte, medlemmer, timeplaner, fridager og aktiviteter for hvert barnehageår. Bruk søkefeltet for å filtrere kontakter og fridager.',
    helpHowText:
      '1. Legg til et barn med navn, barnehage og bilde.\n2. Velg eller opprett et år med avdeling.\n3. Legg til ansatte og medlemmer med kontaktinfo, eller importer klasselisten fra bilde med AI.\n4. Last opp timeplanbilder for høst og vår.\n5. Legg til fridager manuelt, importer fra bilde med AI eller fra en URL.\n6. Legg til aktiviteter som turer, møter og utflukter med sted, påminnelser og dokumenter.',
    helpTip:
      'Hvert barnehageår har egne kontakter, timeplaner, fridager og aktiviteter. Gamle data bevares som historikk. Hold inne et element for å redigere eller slette det — fridager kan også redigeres ved å trykke på dem.',
    helpSettingsText:
      'Du kan redigere og slette barn, kontakter, timeplaner, fridager og aktiviteter ved å holde inne på elementet. Aktiviteter synkroniseres til familiens Google-kalender og sendes push-varsler til familien.',
    // helpHolidays* are accurate — unchanged
  },

  // ── school.* ──
  school: {
    helpWhatText:
      'Skole-modulen lar deg holde orden på barnas skolehverdag. Her kan du lagre kontaktlærere og faglærere, helse- og administrasjonspersonell (rektor, helsesykepleier m.fl.), klassekamerater med foresatte, timeplaner, fridager og aktiviteter for hvert skoleår. Bruk søkefeltet for å filtrere kontakter og fridager.',
    helpHowText:
      '1. Legg til et barn med navn, skole og bilde.\n2. Velg eller opprett et skoleår med trinn.\n3. Legg til kontaktlærere, helse-/admin-personell og klassekamerater med foresatte, eller importer klasselisten fra bilde med AI.\n4. Last opp timeplanbilder for høst og vår.\n5. Legg til fridager manuelt, importer fra bilde med AI eller fra en URL.\n6. Legg til aktiviteter som turer og skolearrangementer med sted, påminnelser og dokumenter.',
    helpTip:
      'Hvert skoleår har egne kontakter, timeplaner, fridager og aktiviteter. Gamle data bevares som historikk. Hold inne et element for å redigere eller slette det — fridager kan også redigeres ved å trykke på dem.',
    helpSettingsText:
      'Du kan redigere og slette barn, kontakter, timeplaner, fridager og aktiviteter ved å holde inne på elementet. Aktiviteter synkroniseres til familiens Google-kalender og sendes push-varsler til familien.',
  },
};

// ─────────────────────────────────────────────────────────────
// EN
// ─────────────────────────────────────────────────────────────
const en = {
  profile: {
    helpCalendarWhatText:
      "The Calendar setting controls how your family's events are stored in calendars. Choose '📱 Phone calendar' to automatically add events, appointments, vaccinations and trips to your phone's calendar. Choose '📧 Google Calendar' to connect the family to a shared Google calendar.",
    helpCalendarHowText:
      "1. Choose '📱 Phone calendar' or '📧 Google Calendar'.\n2. For Google: enter your email (optional) and tap 'Connect Google', then approve access on Google's sign-in page.\n3. Events sync automatically to the selected calendar.\n4. Owners can also run 'Google Calendar sync' to backfill the calendar with existing events.",
    helpCalendarTip:
      "You can disconnect the Google calendar at any time with 'Disconnect calendar'. All events remain in the app.",

    helpNotificationsWhatText:
      'Notifications control whether you receive push notifications in the app when family members add or change content, such as new events and service appointments.',
    helpNotificationsHowText:
      "Tap the button to turn notifications on or off. When set to 'Off', you will not receive push notifications on your own devices — other family members are not affected.",

    helpMinUkeTitle: 'My Week',
    helpMinUkeWhatText:
      "Choose whether the weekly menu is shown in the 'Your week' summary on the Events screen. Hide the section if you don't need to see the meal plan there.",
    helpMinUkeHowText:
      "Toggle the 'Weekly menu' switch on or off. The change takes effect the next time you open 'Your week'.",
    helpMinUkeTip:
      'Which meal types (breakfast, lunch, dinner) are shown is controlled by the Food Center settings just below.',

    helpMatsenterWhatText:
      "Choose which meal types are shown in the weekly menu and in the 'Your week' summary: breakfast, lunch and dinner.",
    helpMatsenterHowText:
      "Toggle breakfast, lunch and dinner on or off. Only active meals appear in the weekly menu and in 'Your week'.",
    helpMatsenterTip:
      "Changes apply immediately in the Food Center and in 'Your week' on the Events screen.",

    helpFamilyWhatText:
      'Manage family members, roles and invitations. Only owners and admins can generate invite links, change roles and remove members.',
    helpFamilyHowText:
      "Tap 'Generate link' to create an invite link with a 6-character code. Tap 'Share link' to share it with the person joining. Owners and admins can also change roles by tapping the role, and remove members from the list.",
    helpFamilyTip:
      "Invite links expire after 1 hour and can only be used once. Members can leave the family with 'Leave family'.",

    helpMembersTip: 'The owner cannot be removed or lose the owner role.',

    helpSpondWhatText:
      "Connect to Spond to show your team's events directly in the app. Only owners and admins see this section. Spond events appear automatically on the Events screen, where family members can respond.",
    helpSpondHowText:
      "1. Enter your Spond email and password, then tap 'Connect to Spond'.\n2. Choose which groups to show (and upload a group logo if you like).\n3. Choose which respondents may sign up under 'Choose respondents'.\n4. Tap 'Save' — without saving, no Spond events will appear.",
    helpSpondTip:
      "Your Spond password is stored securely (encrypted). You can disconnect at any time with 'Disconnect Spond'.",

    helpBirthdaysWhatText:
      "Manage the family's birthdays. Birthdays appear in the Birthdays module, on the Events screen and in 'Your week'.",
    helpBirthdaysHowText:
      "Open the Birthdays module and tap '+' to add a birthday. Long-press a birthday to edit or delete it.",
    helpBirthdaysTip: 'Birthdays appear automatically on the Events screen as they approach.',
  },

  spaces: {
    helpBirthdaysWhatText:
      "Birthdays shows all the family's birthdays sorted by next occurrence, with age and countdown (Today / in X days). Birthdays also appear on the Events screen and in 'Your week'.",
    helpBirthdaysGiftsText:
      "Each birthday has its own gift list for the current year. Tap the birthday to expand the list, check off gifts as purchased, and add new gift ideas. Below the list you'll find a summary of previous years' gift lists.",
    helpBirthdaysHowText:
      "Tap '+' to add a new birthday (name and date). Long-press a birthday to edit or delete it. Tap a birthday to expand the gift list, and tap '+ Add gift idea' to add new gifts.",
    helpBirthdaysTip:
      "Gift lists are kept from year to year, so you can see what you gave last time.",
  },

  mealPlanner: {
    helpTitle: 'Weekly Menu',
    helpWhatText:
      'The weekly menu lets you plan meals for the whole week. You can add breakfast, lunch and dinner for each day, based on your recipe book.',
    helpHowText:
      "Use the ◀ ▶ arrows to browse weeks. Tap a meal slot (e.g. '+ Dinner') to choose a recipe from the book. Tap a planned meal to view the recipe or remove it from the plan.",
    helpTip:
      "Use 'Copy from last week' to reuse last week's plan, and the Profile settings to show or hide breakfast, lunch and dinner.",

    helpRandomWhatText:
      "Out of inspiration for tonight's dinner? Tap the button and we'll suggest a dish from your recipe book.",
    helpRandomHowText:
      "Tap 'Random dish' to get a suggestion. Tap 'Add to weekly plan' to add it as today's dinner, or 'View recipe' to open it.",
    helpRandomTip: 'Tap again for new suggestions.',

    helpSearchWhatText:
      'Search your recipe book by name. In the same tab you can also filter by categories such as Chicken, Vegetarian and Pasta.',
    helpSearchHowText:
      'Type a keyword in the search field. If the search returns no matches, you can use AI search to generate new recipes based on your description.',
    helpSearchTip:
      'You can also import recipes from websites with the 🔗 button, or photograph a recipe with the 📷 button.',

    helpAiSearchWhatText:
      'AI search uses artificial intelligence to suggest new recipes based on what you type, when the search in your book returns no matches.',
    helpAiSearchHowText:
      "Type a keyword in the search field. If no matches appear, tap 'Search with AI'. Choose which country the recipes should come from — the AI generates three suggestions with ingredients and instructions.",
    helpAiSearchTip:
      "Tap 'Save' on a suggestion to add it to your recipe book. You can then edit it like any regular recipe.",

    helpHandlelisteWhatText:
      'Shopping lists let you collect items you need to buy. You can create your own lists or get ingredients automatically from recipes.',
    helpHandlelisteHowText:
      "Tap '+' to create a new shopping list. Enter the name and tap 'Add' — you'll go straight into the new list. Long-press a list to delete it.",
    helpHandlelisteRecipeText:
      "When you open a recipe and tap 'Add to shopping list', a new list named after the recipe is created (or the ingredients are added to an existing list with the same name).",
    helpHandlelisteRecipeTip:
      'The ingredients are translated into the language you have selected in the app.',

    helpWeekMenuWhatText:
      'The weekly menu shows the meals for each day of the week. You can navigate between weeks with the arrows and plan breakfast, lunch and dinner for each day.',
    helpWeekMenuHowText:
      "Tap the '+' button at a meal to choose a recipe (with search). Tap a planned meal to view the recipe or remove it from the plan. If you're on a different week, tap 'Back to this week'.",
    helpWeekMenuTip:
      "Use 'Copy from last week' at the bottom to reuse last week's plan — the button only appears when the week is empty.",
  },

  detail: {
    helpTransportWhatText:
      'Add flights, trains, rental cars, cruises, ferries and taxis for the trip. Outbound and return journeys are entered in separate tabs, and the round trip appears as a single combined item in the list.',
    helpTransportHowText:
      "Tap '+' and choose the transport type. Fill in operator, route/flight number, reference (PNR), seat, dates and times, and addresses. Turn off 'One way' to register both outbound and return journeys.",
    helpTransportTip:
      'Long-press a transport to edit or delete it. Only the owner, admins and the person who created it can edit it.',

    helpHotelsWhatText:
      'Manage accommodation for the trip. Add hotels with name, address, phone, dates and check-in/check-out times.',
    helpHotelsHowText:
      "Tap '+' and fill in the hotel's name, address (Google search), check-in and check-out dates and times, phone and any notes. Tap a hotel for details with a map.",
    helpHotelsTip: 'You can add several hotels for different parts of the trip.',

    helpRestaurantsWhatText:
      'Plan places to eat for the trip. Add restaurants with name, address, date, time and notes.',
    helpRestaurantsHowText:
      "Tap '+' and fill in the name, address (Google search), date and time, and any notes — such as reservation details. Tap a restaurant for details with a map.",
    helpRestaurantsTip:
      'You can add several restaurants and edit them later by long-pressing.',

    helpActivitiesWhatText:
      'Plan activities and experiences for the trip. Add sights, hikes and events with date, time and location.',
    helpActivitiesHowText:
      "Tap '+' and fill in the name, address (Google search), date and time, and notes. Tap an activity for details with a map.",
    helpActivitiesTip:
      'You can add several activities and edit them later by long-pressing.',

    helpTipsWhatText:
      'Get AI-generated tips for your destination — based on your travel dates and the weather forecast. You get an overview, things to do, restaurants, useful phrases with pronunciation, transport and warnings.',
    helpTipsHowText:
      "Search for the city in the search field and tap 'Generate'. The city is saved to the trip, and you can expand it to read the tips or tap ↻ to regenerate. You can add several cities per trip.",

    helpDocumentsWhatText:
      'Upload and store important travel documents such as flight tickets, passport copies and reservations in the cloud.',
    helpDocumentsHowText:
      "Expand the 'Travel documents' section by tapping the header, then tap '+' to upload a file. Give the document a title and an optional description. Tap 'Open' on a document to view or download it, and long-press to delete it.",
    helpDocumentsTip:
      'Documents are stored securely in the cloud (Firebase Storage) and require an internet connection to open.',
  },

  homes: {
    helpWhatText:
      "Here you can add all your homes — house, summer cabin, winter cabin and apartment. For each home you can open instructions, maintenance and projects.",
    helpHowText:
      "Tap the 'Add home' card to create a home. Fill in name, type, address (postal code and city are filled in automatically), description and optionally a photo. Long-press a home to edit or delete it.",

    vedlikeholdHelpWhatText:
      'Maintenance helps you keep track of service agreements and paint colors for your home. Plan recurring service with reminders and documents, and save paint colors with name, code, brand and room.',
    vedlikeholdHelpHowText:
      "Service agreements: Tap '+' to add an agreement with title, person, date from/to, time, frequency (once/monthly/quarterly/yearly) and reminder. Use 'Schedule repeat' to create agreements on specific weekdays over several weeks, with support for every other week. You can also attach photos or documents.\n\nPaint colors: Tap '+' to add a color. Use 'Photograph label' or 'Photograph wall' to let AI read the color, or enter a color code and tap 'Fetch color' to look it up automatically.",
    vedlikeholdHelpTip:
      'Long-press a service agreement or paint color to edit or delete it. Service agreements appear in "Your week", and paint colors linked to a project are edited in the project.',

    prosjektHelpTitle: 'Projects',
    prosjektHelpWhatText:
      'Projects collect everything related to a renovation or maintenance project: paint colors, shopping list with prices, offers from suppliers, a task board and a budget overview.',
    prosjektHelpHowText:
      "Tap '+' to create a project with title, description, budget, start date and status. Tap a project to open it. In the project you get AI suggestions for tasks and shopping items, can scan receipts with AI, add supplier offers, and move tasks between 'Todo', 'In progress' and 'Done' with the arrow buttons. The budget is set on the project and shown as a spending overview.",
    prosjektHelpTip:
      'Link shopping list items to tasks to keep track of what is needed for each task. Long-press a project to edit or delete it.',

    instruksjonerHelpWhatText:
      'Instructions let you store important information about your home that you can share with the family. Share instructions for "Coming home" and "Leaving home" — such as alarm codes, Wi-Fi passwords, key locations and similar.',
    instruksjonerHelpHowText:
      "Tap '+' in a section to add an instruction. Enter title and content manually, or use 'Scan note' (camera) or 'Scan from gallery' to let AI read handwritten notes and fill in the fields automatically. Long-press an instruction to edit or delete it.",
    instruksjonerHelpTip:
      'The AI scan also fills in the correct section and attaches a photo of the note.',
  },

  health: {
    helpWhatText:
      "The Health module lets you keep track of medications, appointments, vaccinations, allergies and growth for everyone in the family. Appointments and vaccinations automatically appear in Events and 'Your week', and sync to the family's Google calendar.",
    helpMedicationsText:
      'Add medications with name, person, dosage and frequency (1–4 times daily) with times and reminders per dose. You can also set a validity period and notes.',
    helpAppointmentsText:
      'Plan doctor visits and dental appointments with multiple family members, doctor, location with map, reminders and documents. You can schedule repeats (e.g. every other week), and on web you can add the appointment directly to Google or Outlook calendar.',
    helpHowText:
      "Tap '+' in a section to add something new. Tap an item to view details (with map and edit button where relevant). Long-press an item to edit or delete it.",
    helpTip:
      "New appointments and vaccinations trigger push notifications to the family, appear in 'Your week' and sync to the family's Google calendar.",
  },

  pets: {
    helpWhatText:
      "Here you can manage all the family's pets. Add pets with name, type, breed, gender, birthday, chip ID, passport number and photo. For each pet you can keep track of vet visits, medications, feeding, grooming, vaccinations and insurance.",
    helpHowText:
      "Tap '+' to add a new pet. Tap a pet to see details and add information in the various sections. Long-press a pet to edit or delete it. In each section tap '+' to add new entries, and long-press to edit or delete.",
    helpTip:
      "Vet visits sync to the family's Google calendar, and vaccinations with a date are added as events. New visits and vaccinations also trigger push notifications to the family.",
    helpFeaturesText:
      'Vet visits: Plan visits with date, time, location, participants, reminder, documents and repeats. Medications: Track medications with dosage, frequency and per-dose reminders. Feeding: Plan feeding routines with time and amount. Grooming: Keep track of coat care and clipping. Vaccinations: Register vaccines with next due date, reminder and status. Insurance: Save insurer, policy number, duration and documents.',
  },

  kindergarten: {
    helpWhatText:
      'The Kindergarten module lets you keep track of your children\'s kindergarten life. Here you can store staff, members, schedules, holidays and activities for each kindergarten year. Use the search field to filter contacts and holidays.',
    helpHowText:
      "1. Add a child with name, kindergarten and photo.\n2. Select or create a year with a group.\n3. Add staff and members with contact info, or import the class list from a photo with AI.\n4. Upload schedule images for autumn and spring.\n5. Add holidays manually, import from a photo with AI or from a URL.\n6. Add activities such as trips, meetings and outings with location, reminders and documents.",
    helpTip:
      'Each kindergarten year has its own contacts, schedules, holidays and activities. Old data is kept as history. Long-press an item to edit or delete it — holidays can also be edited by tapping them.',
    helpSettingsText:
      "You can edit and delete children, contacts, schedules, holidays and activities by long-pressing the item. Activities sync to the family's Google calendar and trigger push notifications to the family.",
  },

  school: {
    helpWhatText:
      "The School module lets you keep track of your children's school life. Here you can store contact teachers and subject teachers, health and administrative staff (principal, school nurse etc.), classmates with guardians, schedules, holidays and activities for each school year. Use the search field to filter contacts and holidays.",
    helpHowText:
      "1. Add a child with name, school and photo.\n2. Select or create a school year with a grade.\n3. Add contact teachers, health/admin staff and classmates with guardians, or import the class list from a photo with AI.\n4. Upload schedule images for autumn and spring.\n5. Add holidays manually, import from a photo with AI or from a URL.\n6. Add activities such as trips and school events with location, reminders and documents.",
    helpTip:
      'Each school year has its own contacts, schedules, holidays and activities. Old data is kept as history. Long-press an item to edit or delete it — holidays can also be edited by tapping them.',
    helpSettingsText:
      "You can edit and delete children, contacts, schedules, holidays and activities by long-pressing the item. Activities sync to the family's Google calendar and trigger push notifications to the family.",
  },
};

// ─────────────────────────────────────────────────────────────
// SV
// ─────────────────────────────────────────────────────────────
const sv = {
  profile: {
    helpCalendarWhatText:
      "Kalenderinställningen styr hur familjens evenemang sparas i kalendrar. Välj '📱 Telefonkalender' för att automatiskt lägga till evenemang, läkartider, vaccinationer och resor i telefonens kalender. Välj '📧 Google Kalender' för att koppla familjen till en delad Google-kalender.",
    helpCalendarHowText:
      "1. Välj '📱 Telefonkalender' eller '📧 Google Kalender'.\n2. För Google: ange din e-post (valfritt) och tryck 'Anslut Google', godkänn sedan åtkomst på Googles inloggningssida.\n3. Evenemang synkroniseras automatiskt till den valda kalendern.\n4. Ägare kan också köra 'Google Kalender-synk' för att fylla kalendern med befintliga evenemang.",
    helpCalendarTip:
      "Du kan koppla bort Google-kalendern när som helst med 'Koppla ifrån kalender'. Alla evenemang finns kvar i appen.",

    helpNotificationsWhatText:
      'Aviseringar styr om du får push-aviseringar i appen när familjemedlemmar lägger till eller ändrar innehåll, t.ex. nya evenemang och serviceavtal.',
    helpNotificationsHowText:
      "Tryck på knappen för att slå aviseringar på eller av. När de är 'Av' får du inga push-aviseringar på dina egna enheter — andra familjemedlemmar påverkas inte.",

    helpMinUkeTitle: 'Min vecka',
    helpMinUkeWhatText:
      "Välj om veckomenyn ska visas i 'Din vecka'-sammanfattningen på Evenemangssidan. Dölj sektionen om du inte behöver se måltidsplanen där.",
    helpMinUkeHowText:
      "Slå på eller av brytaren för 'Veckomeny'. Ändringen gäller nästa gång du öppnar 'Din vecka'.",
    helpMinUkeTip:
      'Vilka måltidstyper (frukost, lunch, middag) som visas styrs av Matcenter-inställningarna strax under.',

    helpMatsenterWhatText:
      "Välj vilka måltidstyper som visas i veckomenyn och i 'Din vecka'-sammanfattningen: frukost, lunch och middag.",
    helpMatsenterHowText:
      "Slå frukost, lunch och middag på eller av. Endast aktiva måltider visas i veckomenyn och i 'Din vecka'.",
    helpMatsenterTip:
      "Ändringar gäller omedelbart i Matcentret och i 'Din vecka' på Evenemangssidan.",

    helpFamilyWhatText:
      'Hantera familjemedlemmar, roller och inbjudningar. Endast ägare och administratörer kan skapa inbjudningslänkar, ändra roller och ta bort medlemmar.',
    helpFamilyHowText:
      "Tryck 'Generera länk' för att skapa en inbjudningslänk med en 6-siffrig kod. Tryck 'Dela länk' för att dela den med den som ska gå med. Ägare och administratörer kan också ändra roller genom att trycka på rollen, och ta bort medlemmar från listan.",
    helpFamilyTip:
      "Inbjudningslänkar upphör att gälla efter 1 timme och kan bara användas en gång. Medlemmar kan lämna familjen med 'Lämna familj'.",

    helpMembersTip: 'Ägaren kan inte tas bort eller förlora ägarrollen.',

    helpSpondWhatText:
      "Anslut till Spond för att visa lagets evenemang direkt i appen. Endast ägare och administratörer ser den här sektionen. Spond-evenemang visas automatiskt på Evenemangssidan, där familjemedlemmar kan svara.",
    helpSpondHowText:
      "1. Ange Spond-e-post och lösenord och tryck 'Anslut till Spond'.\n2. Välj vilka grupper som ska visas (och ladda upp en grupplogo om du vill).\n3. Välj vilka respondenter som kan anmäla sig under 'Välj respondenter'.\n4. Tryck 'Spara' — utan att spara visas inga Spond-evenemang.",
    helpSpondTip:
      "Spond-lösenordet sparas säkert (krypterat). Du kan koppla ifrån när som helst med 'Koppla ifrån Spond'.",

    helpBirthdaysWhatText:
      "Hantera familjens födelsedagar. Födelsedagarna visas i Födelsedagar-modulen, på Evenemangssidan och i 'Din vecka'.",
    helpBirthdaysHowText:
      "Öppna Födelsedagar-modulen och tryck '+' för att lägga till en födelsedag. Håll in en födelsedag för att redigera eller ta bort den.",
    helpBirthdaysTip: 'Födelsedagar visas automatiskt på Evenemangssidan när de närmar sig.',
  },

  spaces: {
    helpBirthdaysWhatText:
      "Födelsedagar visar alla familjens födelsedagar sorterade efter nästa förekomst, med ålder och nedräkning (I dag / om X dagar). Födelsedagarna visas också på Evenemangssidan och i 'Din vecka'.",
    helpBirthdaysGiftsText:
      "Varje födelsedag har en egen gåvolista för aktuellt år. Tryck på födelsedagen för att expandera listan, kryssa av gåvor som köpta och lägga till nya gåvidéer. Under listan ser du en sammanfattning av tidigare års gåvolistor.",
    helpBirthdaysHowText:
      "Tryck '+' för att lägga till en ny födelsedag (namn och datum). Håll in en födelsedag för att redigera eller ta bort den. Tryck på en födelsedag för att expandera gåvolistan, och tryck '+ Lägg till gåvidé' för nya gåvor.",
    helpBirthdaysTip:
      'Gåvolistor bevaras från år till år, så att du kan se vad du gav förra gången.',
  },

  mealPlanner: {
    helpTitle: 'Veckomeny',
    helpWhatText:
      'Veckomenyn låter dig planera måltider för hela veckan. Du kan lägga till frukost, lunch och middag för varje dag, baserat på din receptbok.',
    helpHowText:
      "Använd pilarna ◀ ▶ för att bläddra mellan veckor. Tryck på en måltidsplats (t.ex. '+ Middag') för att välja recept från boken. Tryck på ett planlagt mål för att se receptet eller ta bort det från planen.",
    helpTip:
      "Använd 'Kopiera från förra veckan' för att återanvända förra veckans plan, och inställningarna i Profilen för att visa eller dölja frukost, lunch och middag.",

    helpRandomWhatText:
      'Får du inte inspiration till dagens middag? Tryck på knappen så föreslår vi en rätt från din receptbok.',
    helpRandomHowText:
      "Tryck 'Slumpad rätt' för att få ett förslag. Tryck 'Lägg till i veckoplan' för att lägga till rätten som dagens middag, eller 'Se recept' för att öppna den.",
    helpRandomTip: 'Tryck flera gånger för att få nya förslag.',

    helpSearchWhatText:
      'Sök i din receptbok på namn. I samma flik kan du också filtrera på kategorier som Kyckling, Vegetariskt och Pasta.',
    helpSearchHowText:
      'Skriv ett sökord i sökfältet. Om söket inte ger träffar kan du använda AI-sökning för att generera nya recept baserat på beskrivningen.',
    helpSearchTip:
      'Du kan också importera recept från webbplatser med 🔗-knappen, eller fotografera ett recept med 📷-knappen.',

    helpAiSearchWhatText:
      'AI-sökningen använder artificiell intelligens för att föreslå nya recept baserat på vad du skriver, när sökningen i din bok inte ger träffar.',
    helpAiSearchHowText:
      "Skriv ett sökord i sökfältet. Om inga träffar visas trycker du 'Sök med AI'. Välj vilket land recepten ska komma från — AI:n genererar tre förslag med ingredienser och tillagningssätt.",
    helpAiSearchTip:
      "Tryck 'Spara' på ett förslag för att lägga till det i receptboken. Därefter kan du redigera det som ett vanligt recept.",

    helpHandlelisteWhatText:
      'Inköpslistor låter dig samla varor du behöver köpa. Du kan skapa egna listor eller få ingredienser automatiskt från recept.',
    helpHandlelisteHowText:
      "Tryck '+' för att skapa en ny inköpslista. Ange namnet och tryck 'Lägg till' — du kommer direkt in i den nya listan. Håll in en lista för att ta bort den.",
    helpHandlelisteRecipeText:
      "När du öppnar ett recept och trycker 'Lägg till i inköpslista' skapas en ny lista med receptets namn (eller läggs ingredienserna till i en befintlig lista med samma namn).",
    helpHandlelisteRecipeTip:
      'Ingredienserna översätts till det språk du har valt i appen.',

    helpWeekMenuWhatText:
      'Veckomenyn visar måltiderna för varje dag i veckan. Du kan navigera mellan veckor med pilarna och planera frukost, lunch och middag för varje dag.',
    helpWeekMenuHowText:
      "Tryck '+'-knappen vid ett mål för att välja recept (med sökning). Tryck på ett planlagt mål för att se receptet eller ta bort det från planen. Är du på en annan vecka, tryck 'Tillbaka till denna vecka'.",
    helpWeekMenuTip:
      "Använd 'Kopiera från förra veckan' längst ner för att återanvända förra veckans plan — knappen visas bara när veckan är tom.",
  },

  detail: {
    helpTransportWhatText:
      'Lägg till flyg, tåg, hyrbil, kryssning, färja och taxi för resan. Utresa och hemresa fylls i i egna flikar, och turen visas som ett samlat element i listan.',
    helpTransportHowText:
      "Tryck '+' och välj transporttyp. Fyll i bolag, linje/flightnummer, referens (PNR), plats, datum och tider samt adresser. Stäng av 'Enkel resa' för att registrera både ut- och hemresa.",
    helpTransportTip:
      'Håll in på en transport för att redigera eller ta bort den. Endast ägaren, administratörer och den som skapade transporten kan redigera den.',

    helpHotelsWhatText:
      'Hantera boenden för resan. Lägg till hotell med namn, adress, telefon, datum och in-/utcheckningstider.',
    helpHotelsHowText:
      "Tryck '+' och fyll i hotellets namn, adress (Google-sökning), in- och utcheckningsdatum och tider, telefon och eventuella anteckningar. Tryck på ett hotell för detaljer med karta.",
    helpHotelsTip: 'Du kan lägga till flera hotell för olika delar av resan.',

    helpRestaurantsWhatText:
      'Planera ätställen för resan. Lägg till restauranger med namn, adress, datum, tid och anteckningar.',
    helpRestaurantsHowText:
      "Tryck '+' och fyll i namn, adress (Google-sökning), datum och tid samt eventuella anteckningar — t.ex. reservationsdetaljer. Tryck på en restaurang för detaljer med karta.",
    helpRestaurantsTip:
      'Du kan lägga till flera restauranger och redigera dem senare genom att hålla in.',

    helpActivitiesWhatText:
      'Planera aktiviteter och upplevelser för resan. Lägg till sevärdheter, vandringar och evenemang med datum, tid och plats.',
    helpActivitiesHowText:
      "Tryck '+' och fyll i namn, adress (Google-sökning), datum och tid samt anteckningar. Tryck på en aktivitet för detaljer med karta.",
    helpActivitiesTip:
      'Du kan lägga till flera aktiviteter och redigera dem senare genom att hålla in.',

    helpTipsWhatText:
      'Få AI-genererade tips för resmålet — baserat på resedatumen och väderprognosen. Du får en översikt, saker att göra, restauranger, användbara fraser med uttal, transport och varningar.',
    helpTipsHowText:
      "Sök upp staden i sökfältet och tryck 'Generera'. Staden sparas på resan, och du kan expandera den för att läsa tipsen eller trycka ↻ för att generera på nytt. Du kan lägga till flera städer per resa.",

    helpDocumentsWhatText:
      'Ladda upp och spara viktiga handledsdokument som flygbiljetter, passkopior och bokningar i molnet.',
    helpDocumentsHowText:
      "Expandera avsnittet 'Resedokument' genom att trycka på rubriken, och tryck sedan '+' för att ladda upp en fil. Ge dokumentet en titel och eventuell beskrivning. Tryck 'Öppna' på ett dokument för att visa eller ladda ner det, och håll in för att ta bort det.",
    helpDocumentsTip:
      'Dokumenten sparas säkert i molnet (Firebase Storage) och kräver internetanslutning för att öppnas.',
  },

  homes: {
    helpWhatText:
      'Här kan du lägga till alla dina hem — hus, sommarstuga, vinterstuga och lägenhet. För varje hem kan du öppna instruktioner, underhåll och projekt.',
    helpHowText:
      "Tryck på 'Lägg till hem'-kortet för att skapa ett hem. Fyll i namn, typ, adress (postnummer och ort fylls i automatiskt), beskrivning och eventuellt foto. Håll in på ett hem för att redigera eller ta bort det.",

    vedlikeholdHelpWhatText:
      'Underhåll hjälper dig att hålla koll på serviceavtal och färger för ditt hem. Planera återkommande service med påminnelser och dokument, och spara färger med namn, kod, märke och rum.',
    vedlikeholdHelpHowText:
      "Serviceavtal: Tryck '+' för att lägga till ett avtal med titel, person, datum från/till, tid, frekvens (engång/månadsvis/kvartalsvis/årlig) och påminnelse. Använd 'Planera upprepning' för att skapa avtal på bestämda veckodagar över flera veckor, med stöd för varannan vecka. Du kan också bifoga bilder eller dokument.\n\nFärger: Tryck '+' för att lägga till en färg. Använd 'Fotografera etikett' eller 'Fotografera vägg' för att låta AI:n läsa färgen, eller ange färgkod och tryck 'Hämta färg' för att slå upp den automatiskt.",
    vedlikeholdHelpTip:
      'Håll in på ett serviceavtal eller en färg för att redigera eller ta bort. Serviceavtal visas i "Din vecka", och färger kopplade till ett projekt redigeras i projektet.',

    prosjektHelpTitle: 'Projekt',
    prosjektHelpWhatText:
      'Projekt samlar allt som hör till ett renoverings- eller underhållsprojekt: färger, inköpslista med priser, offerter från leverantörer, uppgiftstavla och budgetöversikt.',
    prosjektHelpHowText:
      "Tryck '+' för att skapa ett projekt med titel, beskrivning, budget, startdatum och status. Tryck på ett projekt för att öppna det. I projektet får du AI-förslag på uppgifter och inköpslistor, kan scanna kvitton med AI, lägga in offerter och flytta uppgifter mellan 'Todo', 'Pågår' och 'Klar' med pilknapparna. Budgeten anges på projektet och visas som en översikt över förbrukning.",
    prosjektHelpTip:
      'Koppla inköpslisteposter till uppgifter för att hålla koll på vad som behövs till varje uppgift. Håll in på ett projekt för att redigera eller ta bort det.',

    instruksjonerHelpWhatText:
      'Instruktioner låter dig spara viktig information om ditt hem som du kan dela med familjen. Del instruktioner för "Komma hem" och "Lämna hem" — t.ex. larmkoder, Wi-Fi-lösenord, nyckelplatser och liknande.',
    instruksjonerHelpHowText:
      "Tryck '+' i en sektion för att lägga till en instruktion. Skriv in titel och innehåll manuellt, eller använd 'Skanna anteckning' (kamera) eller 'Skanna från galleri' för att låta AI:n läsa handskrivna anteckningar och fylla i fälten automatiskt. Håll in på en instruktion för att redigera eller ta bort den.",
    instruksjonerHelpTip:
      'AI-skanningen fyller också i rätt sektion och bifogar en bild av anteckningen.',
  },

  health: {
    helpWhatText:
      "Hälsomodulen låter dig hålla koll på mediciner, läkartider, vaccinationer, allergier och tillväxt för alla i familjen. Läkartider och vaccinationer visas automatiskt i Evenemang och 'Din vecka', och synkroniseras till familjens Google-kalender.",
    helpMedicationsText:
      'Lägg till mediciner med namn, person, dos och frekvens (1–4 gånger dagligen) med tider och påminnelser per dos. Du kan också ange giltighetsperiod och anteckning.',
    helpAppointmentsText:
      'Planera läkartider och tandläkarbesök med flera familjemedlemmar, läkare, plats med karta, påminnelser och dokument. Du kan planera upprepningar (t.ex. varannan vecka), och på webben kan du lägga tiden direkt i Google- eller Outlook-kalendern.',
    helpHowText:
      "Tryck '+' i en sektion för att lägga till något nytt. Tryck på ett objekt för att se detaljer (med karta och redigera-knapp där det är relevant). Håll in på ett objekt för att redigera eller ta bort det.",
    helpTip:
      "Nya läkartider och vaccinationer skickar push-aviseringar till familjen, visas i 'Din vecka' och synkroniseras till familjens Google-kalender.",
  },

  pets: {
    helpWhatText:
      "Här kan du hantera familjens alla husdjur. Lägg till husdjur med namn, typ, ras, kön, födelsedag, chip-ID, passnummer och foto. För varje husdjur kan du hålla koll på veterinärbesök, mediciner, matning, pelsvård, vaccinationer och försäkring.",
    helpHowText:
      "Tryck '+' för att lägga till ett nytt husdjur. Tryck på ett husdjur för att se detaljer och lägga till information i de olika sektionerna. Håll in på ett husdjur för att redigera eller ta bort det. I varje sektion trycker du '+' för att lägga till nya poster, och håller in för att redigera eller ta bort.",
    helpTip:
      "Veterinärbesök synkroniseras till familjens Google-kalender, och vaccinationer med datum läggs in som evenemang. Nya besök och vaccinationer skickar också push-aviseringar till familjen.",
    helpFeaturesText:
      'Veterinärbesök: Planera besök med datum, tid, plats, deltagare, påminnelse, dokument och upprepningar. Mediciner: Följ mediciner med dosering, frekvens och påminnelser per dos. Matning: Planera matningsrutiner med tid och mängd. Pelsvård: Håll koll på pelsvård och klippning. Vaccinationer: Registrera vacciner med nästa förfallodatum, påminnelse och status. Försäkring: Spara försäkringsbolag, policenummer, varaktighet och dokument.',
  },

  kindergarten: {
    helpWhatText:
      'Förskolemodulen låter dig hålla koll på barnens förskoledagar. Här kan du spara personal, medlemmar, scheman, helgdagar och aktiviteter för varje förskoleår. Använd sökfältet för att filtrera kontakter och helgdagar.',
    helpHowText:
      "1. Lägg till ett barn med namn, förskola och foto.\n2. Välj eller skapa ett år med avdelning.\n3. Lägg till personal och medlemmar med kontaktinfo, eller importera klasslistan från foto med AI.\n4. Ladda upp schemabilder för höst och vår.\n5. Lägg till helgdagar manuellt, importera från foto med AI eller från en URL.\n6. Lägg till aktiviteter som utflykter, möten och utflykter med plats, påminnelser och dokument.",
    helpTip:
      'Varje förskoleår har egna kontakter, scheman, helgdagar och aktiviteter. Gamla data bevaras som historik. Håll in på ett objekt för att redigera eller ta bort det — helgdagar kan också redigeras genom att trycka på dem.',
    helpSettingsText:
      "Du kan redigera och ta bort barn, kontakter, scheman, helgdagar och aktiviteter genom att hålla in objektet. Aktiviteter synkroniseras till familjens Google-kalender och skickar push-aviseringar till familjen.",
  },

  school: {
    helpWhatText:
      "Skolmodulen låter dig hålla koll på barnens skoldagar. Här kan du spara kontakt- och ämneslärare, hälso- och administrativ personal (rektor, skolsköterska m.fl.), klasskamrater med vårdnadshavare, scheman, helgdagar och aktiviteter för varje skolår. Använd sökfältet för att filtrera kontakter och helgdagar.",
    helpHowText:
      "1. Lägg till ett barn med namn, skola och foto.\n2. Välj eller skapa ett skolår med årskurs.\n3. Lägg till kontaktlärare, hälso-/admin-personal och klasskamrater med vårdnadshavare, eller importera klasslistan från foto med AI.\n4. Ladda upp schemabilder för höst och vår.\n5. Lägg till helgdagar manuellt, importera från foto med AI eller från en URL.\n6. Lägg till aktiviteter som utflykter och skolevenemang med plats, påminnelser och dokument.",
    helpTip:
      'Varje skolår har egna kontakter, scheman, helgdagar och aktiviteter. Gamla data bevaras som historik. Håll in på ett objekt för att redigera eller ta bort det — helgdagar kan också redigeras genom att trycka på dem.',
    helpSettingsText:
      "Du kan redigera och ta bort barn, kontakter, scheman, helgdagar och aktiviteter genom att hålla in objektet. Aktiviteter synkroniseras till familjens Google-kalender och skickar push-aviseringar till familjen.",
  },
};

// ─────────────────────────────────────────────────────────────
// DA
// ─────────────────────────────────────────────────────────────
const da = {
  profile: {
    helpCalendarWhatText:
      "Kalenderindstillingen styrer, hvordan familiens begivenheder gemmes i kalendere. Vælg '📱 Telefonkalender' for automatisk at tilføje begivenheder, lægetimer, vaccinationer og rejser til telefonens kalender. Vælg '📧 Google Kalender' for at forbinde familien til en delt Google-kalender.",
    helpCalendarHowText:
      "1. Vælg '📱 Telefonkalender' eller '📧 Google Kalender'.\n2. For Google: indtast din e-mail (valgfrit) og tryk 'Forbind Google', godkend derefter adgangen på Googles loginside.\n3. Begivenheder synkroniseres automatisk til den valgte kalender.\n4. Ejere kan også køre 'Google Kalender-synk' for at udfylde kalenderen med eksisterende begivenheder.",
    helpCalendarTip:
      "Du kan afbryde Google-kalenderen når som helst med 'Afbryd kalender'. Alle begivenheder forbliver i appen.",

    helpNotificationsWhatText:
      'Underretninger styrer, om du modtager push-underretninger i appen, når familiemedlemmer tilføjer eller ændrer indhold, f.eks. nye begivenheder og serviceaftaler.',
    helpNotificationsHowText:
      "Tryk på knappen for at slå underretninger til eller fra. Når de er 'Fra', modtager du ikke push-underretninger på dine egne enheder — andre familiemedlemmer påvirkes ikke.",

    helpMinUkeTitle: 'Min uge',
    helpMinUkeWhatText:
      "Vælg om ugeplanen skal vises i 'Din uge'-oversigten på Begivenheder-skærmen. Skjul sektionen, hvis du ikke behøver at se måltidsplanen der.",
    helpMinUkeHowText:
      "Slå kontakten for 'Ugeplan' til eller fra. Ændringen træder i kraft, næste gang du åbner 'Din uge'.",
    helpMinUkeTip:
      'Hvilke måltidstyper (morgenmad, frokost, aftensmad), der vises, styres af Madscenter-indstillingerne lige under.',

    helpMatsenterWhatText:
      "Vælg hvilke måltidstyper der vises i ugeplanen og i 'Din uge'-oversigten: morgenmad, frokost og aftensmad.",
    helpMatsenterHowText:
      "Slå morgenmad, frokost og aftensmad til eller fra. Kun aktive måltider vises i ugeplanen og i 'Din uge'.",
    helpMatsenterTip:
      "Ændringer gælder med det samme i Madscenteret og i 'Din uge' på Begivenheder-skærmen.",

    helpFamilyWhatText:
      'Administrér familiemedlemmer, roller og invitationer. Kun ejere og administratorer kan oprette invitationslinks, ændre roller og fjerne medlemmer.',
    helpFamilyHowText:
      "Tryk 'Generér link' for at oprette et invitationslink med en 6-cifret kode. Tryk 'Del link' for at dele det med den, der skal med. Ejere og administratorer kan også ændre roller ved at trykke på rollen og fjerne medlemmer fra listen.",
    helpFamilyTip:
      "Invitationslinks udløber efter 1 time og kan kun bruges én gang. Medlemmer kan forlade familien med 'Forlad familie'.",

    helpMembersTip: 'Ejeren kan ikke fjernes eller miste ejerrollen.',

    helpSpondWhatText:
      "Forbind til Spond for at vise holdets begivenheder direkte i appen. Kun ejere og administratorer ser denne sektion. Spond-begivenheder vises automatisk på Begivenheder-skærmen, hvor familiemedlemmer kan afgive svar.",
    helpSpondHowText:
      "1. Indtast Spond-e-mail og adgangskode, og tryk 'Forbind til Spond'.\n2. Vælg hvilke grupper der skal vises (og upload et gruppelogo, hvis du vil).\n3. Vælg, hvilke respondenter der kan tilmelde sig under 'Vælg respondenter'.\n4. Tryk 'Gem' — uden at gemme vises ingen Spond-begivenheder.",
    helpSpondTip:
      "Spond-adgangskoden gemmes sikkert (krypteret). Du kan afbryde når som helst med 'Afbryd Spond'.",

    helpBirthdaysWhatText:
      "Administrér familiens fødselsdage. Fødselsdagene vises i Fødselsdage-modulet, på Begivenheder-skærmen og i 'Din uge'.",
    helpBirthdaysHowText:
      "Åbn Fødselsdage-modulet og tryk '+' for at tilføje en fødselsdag. Hold inde på en fødselsdag for at redigere eller slette den.",
    helpBirthdaysTip: 'Fødselsdage vises automatisk på Begivenheder-skærmen, når de nærmer sig.',
  },

  spaces: {
    helpBirthdaysWhatText:
      "Fødselsdage viser alle familiens fødselsdage sorteret efter næste forekomst, med alder og nedtælling (I dag / om X dage). Fødselsdagene vises også på Begivenheder-skærmen og i 'Din uge'.",
    helpBirthdaysGiftsText:
      "Hver fødselsdag har sin egen gaveliste for indeværende år. Tryk på fødselsdagen for at udvide listen, afkrydse gaver som købte og tilføje nye gaveidéer. Under listen ser du en oversigt over tidligere års gavelister.",
    helpBirthdaysHowText:
      "Tryk '+' for at tilføje en ny fødselsdag (navn og dato). Hold inde på en fødselsdag for at redigere eller slette den. Tryk på en fødselsdag for at udvide gavelisten, og tryk '+ Tilføj gaveidé' til nye gaver.",
    helpBirthdaysTip:
      'Gavelister bevares fra år til år, så du kan se, hvad du gav sidst.',
  },

  mealPlanner: {
    helpTitle: 'Ugeplan',
    helpWhatText:
      'Ugeplanen lader dig planlægge måltider for hele ugen. Du kan tilføje morgenmad, frokost og aftensmad for hver dag, baseret på din opskriftsbog.',
    helpHowText:
      "Brug pilerne ◀ ▶ til at bladre mellem uger. Tryk på en måltidsplads (f.eks. '+ Aftensmad') for at vælge opskrift fra bogen. Tryk på et planlagt måltid for at se opskriften eller fjerne den fra planen.",
    helpTip:
      "Brug 'Kopiér fra sidste uge' til at genbruge sidste uges plan, og indstillingerne i Profilen for at vise eller skjule morgenmad, frokost og aftensmad.",

    helpRandomWhatText:
      'Mangler du inspiration til dagens aftensmad? Tryk på knappen, så foreslår vi en ret fra din opskriftsbog.',
    helpRandomHowText:
      "Tryk 'Tilfældig ret' for at få et forslag. Tryk 'Tilføj til ugeplan' for at tilføje retten som dagens aftensmad, eller 'Se opskrift' for at åbne den.",
    helpRandomTip: 'Tryk flere gange for at få nye forslag.',

    helpSearchWhatText:
      'Søg i din opskriftsbog på navn. I samme fane kan du også filtrere på kategorier som Kylling, Vegetar og Pasta.',
    helpSearchHowText:
      'Skriv et søgeord i søgefeltet. Hvis søget ikke giver resultater, kan du bruge AI-søgning til at generere nye opskrifter baseret på beskrivelsen.',
    helpSearchTip:
      'Du kan også importere opskrifter fra hjemmesider med 🔗-knappen, eller fotografere en opskrift med 📷-knappen.',

    helpAiSearchWhatText:
      'AI-søgningen bruger kunstig intelligens til at foreslå nye opskrifter baseret på, hvad du skriver, når søget i din bog ikke giver resultater.',
    helpAiSearchHowText:
      "Skriv et søgeord i søgefeltet. Hvis ingen resultater vises, trykker du 'Søg med AI'. Vælg hvilket land opskrifterne skal komme fra — AI'en genererer tre forslag med ingredienser og fremgangsmåde.",
    helpAiSearchTip:
      "Tryk 'Gem' på et forslag for at tilføje det til opskriftsbogen. Derefter kan du redigere det som en almindelig opskrift.",

    helpHandlelisteWhatText:
      'Indkøbslister lader dig samle varer, du skal købe. Du kan oprette egne lister eller få ingredienser automatisk fra opskrifter.',
    helpHandlelisteHowText:
      "Tryk '+' for at oprette en ny indkøbsliste. Indtast navnet og tryk 'Tilføj' — du kommer direkte ind i den nye liste. Hold inde på en liste for at slette den.",
    helpHandlelisteRecipeText:
      "Når du åbner en opskrift og trykker 'Tilføj til indkøbsliste', oprettes en ny liste med opskriftens navn (eller tilføjes ingredienserne til en eksisterende liste med samme navn).",
    helpHandlelisteRecipeTip:
      'Ingredienserne oversættes til det sprog, du har valgt i appen.',

    helpWeekMenuWhatText:
      'Ugeplanen viser måltiderne for hver dag i ugen. Du kan navigere mellem uger med pilerne og planlægge morgenmad, frokost og aftensmad for hver dag.',
    helpWeekMenuHowText:
      "Tryk '+'-knappen ved et måltid for at vælge opskrift (med søgning). Tryk på et planlagt måltid for at se opskriften eller fjerne den fra planen. Er du på en anden uge, tryk 'Tilbage til denne uge'.",
    helpWeekMenuTip:
      "Brug 'Kopiér fra sidste uge' nederst for at genbruge sidste uges plan — knappen vises kun, når ugen er tom.",
  },

  detail: {
    helpTransportWhatText:
      'Tilføj fly, tog, lejebil, krydstogt, færge og taxi til rejsen. Udrejse og hjemrejsse udfyldes i separate faner, og turen vises som ét samlet element på listen.',
    helpTransportHowText:
      "Tryk '+' og vælg transporttype. Udfyld selskab, rute/flightnummer, reference (PNR), sæde, datoer og tider samt adresser. Slå 'En vej' fra for at registrere både ud- og hjemrejse.",
    helpTransportTip:
      'Hold inde på en transport for at redigere eller slette den. Kun ejeren, administratorer og den, der oprettede transporten, kan redigere den.',

    helpHotelsWhatText:
      'Administrér overnatninger til rejsen. Tilføj hoteller med navn, adresse, telefon, datoer og in-/udtjekningstider.',
    helpHotelsHowText:
      "Tryk '+' og udfyld hotellets navn, adresse (Google-søgning), ind- og udtjekningsdatoer og -tider, telefon og eventuelt noter. Tryk på et hotel for detaljer med kort.",
    helpHotelsTip: 'Du kan tilføje flere hoteller til forskellige dele af rejsen.',

    helpRestaurantsWhatText:
      'Planlæg spisesteder til rejsen. Tilføj restauranter med navn, adresse, dato, tidspunkt og noter.',
    helpRestaurantsHowText:
      "Tryk '+' og udfyld navn, adresse (Google-søgning), dato og tidspunkt samt eventuelt noter — f.eks. reservationsdetaljer. Tryk på en restaurant for detaljer med kort.",
    helpRestaurantsTip:
      'Du kan tilføje flere restauranter og redigere dem senere ved at holde inde.',

    helpActivitiesWhatText:
      'Planlæg aktiviteter og oplevelser til rejsen. Tilføj seværdigheder, vandreture og begivenheder med dato, tidspunkt og sted.',
    helpActivitiesHowText:
      "Tryk '+' og udfyld navn, adresse (Google-søgning), dato og tidspunkt samt noter. Tryk på en aktivitet for detaljer med kort.",
    helpActivitiesTip:
      'Du kan tilføje flere aktiviteter og redigere dem senere ved at hold inde.',

    helpTipsWhatText:
      'Få AI-genererede tips til destinationen — baseret på rejsedatoerne og vejrudsigten. Du får en oversigt, ting at lave, restauranter, nyttige vendinger med udtale, transport og advarsler.',
    helpTipsHowText:
      "Søg efter byen i søgefeltet og tryk 'Generér'. Byen gemmes på rejsen, og du kan udvide den for at læse tipsene eller trykke ↻ for at generere igen. Du kan tilføje flere byer pr. rejse.",

    helpDocumentsWhatText:
      'Upload og gem vigtige rejsedokumenter som flybilletter, pas-kopier og reservationer i skyen.',
    helpDocumentsHowText:
      "Udvid sektionen 'Rejsedokumenter' ved at trykke på overskriften, og tryk derefter '+' for at uploade en fil. Giv dokumentet en titel og eventuel beskrivelse. Tryk 'Åbn' på et dokument for at se eller downloade det, og hold inde for at slette det.",
    helpDocumentsTip:
      'Dokumenterne gemmes sikkert i skyen (Firebase Storage) og kræver internetforbindelse for at åbnes.',
  },

  homes: {
    helpWhatText:
      'Her kan du tilføje alle dine hjem — hus, sommerhytte, vinterhytte og lejlighed. For hvert hjem kan du åbne instruktioner, vedligehold og projekter.',
    helpHowText:
      "Tryk på 'Tilføj hjem'-kortet for at oprette et hjem. Udfyld navn, type, adresse (postnummer og by udfyldes automatisk), beskrivelse og eventuelt billede. Hold inde på et hjem for at redigere eller slette det.",

    vedlikeholdHelpWhatText:
      'Vedligehold hjælper dig med at holde styr på serviceaftaler og farver til dit hjem. Planlæg tilbagevendende service med påmindelser og dokumenter, og gem farver med navn, kode, mærke og rum.',
    vedlikeholdHelpHowText:
      "Serviceaftaler: Tryk '+' for at tilføje en aftale med titel, person, dato fra/til, tidspunkt, frekvens (engang/månedligt/kvartalsvis/årligt) og påmindelse. Brug 'Planlæg gentagelse' for at oprette aftaler på bestemte ugedage over flere uger, med understøttelse af hver anden uge. Du kan også vedhæfte billeder eller dokumenter.\n\nFarver: Tryk '+' for at tilføje en farve. Brug 'Fotografér etiket' eller 'Fotografér væg' for at lade AI'en læse farven, eller indtast farvekode og tryk 'Hent farve' for at slå op automatisk.",
    vedlikeholdHelpTip:
      'Hold inde på en serviceaftale eller farve for at redigere eller slette. Serviceaftaler dukker op i "Din uge", og farver knyttet til et projekt redigeres i projektet.',

    prosjektHelpTitle: 'Projekter',
    prosjektHelpWhatText:
      'Projekter samler alt, der hører til et renoverings- eller vedligeholdelsesprojekt: farver, indkøbsliste med priser, tilbud fra leverandører, opgavetavle og budgetoversigt.',
    prosjektHelpHowText:
      "Tryk '+' for at oprette et projekt med titel, beskrivelse, budget, startdato og status. Tryk på et projekt for at åbne det. I projektet får du AI-forslag til opgaver og indkøbsliste, kan scanne kvitteringer med AI, tilføje tilbud og flytte opgaver mellem 'Todo', 'I gang' og 'Færdig' med pileknapperne. Budgettet angives på projektet og vises som oversigt over forbrug.",
    prosjektHelpTip:
      'Kobl indkøbslisteposter til opgaver for at holde styr på, hvad der skal bruges til hver opgave. Hold inde på et projekt for at redigere eller slette det.',

    instruksjonerHelpWhatText:
      'Instruktioner lader dig gemme vigtig information om dit hjem, som du kan dele med familien. Del instruktioner for "At komme hjem" og "At forlade hjemmet" — f.eks. alarmkoder, Wi-Fi-adgangskoder, nøgleplaceringer og lignende.',
    instruksjonerHelpHowText:
      "Tryk '+' i en sektion for at tilføje en instruktion. Indtast titel og indhold manuelt, eller brug 'Skan note' (kamera) eller 'Skan fra galleri' for at lade AI'en læse håndskrevne noter og udfylde felterne automatisk. Hold inde på en instruktion for at redigere eller slette den.",
    instruksjonerHelpTip:
      'AI-scanningen udfylder også den rigtige sektion og vedhæfter et billede af noten.',
  },

  health: {
    helpWhatText:
      "Sundhedsmodulet lader dig holde styr på medicin, lægetimer, vaccinationer, allergier og vækst for alle i familien. Lægetimer og vaccinationer vises automatisk i Begivenheder og 'Din uge', og synkroniseres til familiens Google-kalender.",
    helpMedicationsText:
      'Tilføj medicin med navn, person, dosis og frekvens (1–4 gange dagligt) med tidspunkter og påmindelser per dosis. Du kan også angive gyldighedsperiode og note.',
    helpAppointmentsText:
      'Planlæg lægetimer og tandlægebesøg med flere familiemedlemmer, læge, sted med kort, påmindelser og dokumenter. Du kan planlægge gentagelser (f.eks. hver anden uge), og på web kan du tilføje tiden direkte i Google- eller Outlook-kalenderen.',
    helpHowText:
      "Tryk '+' i en sektion for at tilføje noget nyt. Tryk på et element for at se detaljer (med kort og rediger-knap, hvor det er relevant). Hold inde på et element for at redigere eller slette det.",
    helpTip:
      "Nye lægetimer og vaccinationer sender push-underretninger til familien, vises i 'Din uge' og synkroniseres til familiens Google-kalender.",
  },

  pets: {
    helpWhatText:
      "Her kan du administrere alle familiens kæledyr. Tilføj kæledyr med navn, type, race, køn, fødselsdag, chip-ID, pasnummer og foto. For hvert kæledyr kan du holde styr på dyrlægebesøg, medicin, fodring, pleje, vaccinationer og forsikring.",
    helpHowText:
      "Tryk '+' for at tilføje et nyt kæledyr. Tryk på et kæledyr for at se detaljer og tilføje information i de forskellige sektioner. Hold inde på et kæledyr for at redigere eller slette det. I hver sektion trykker du '+' for at tilføje nye poster og holder inde for at redigere eller slette.",
    helpTip:
      "Dyrlægebesøg synkroniseres til familiens Google-kalender, og vaccinationer med dato tilføjes som begivenheder. Nye besøg og vaccinationer sender også push-underretninger til familien.",
    helpFeaturesText:
      'Dyrlægebesøg: Planlæg besøg med dato, tidspunkt, sted, deltagere, påmindelse, dokumenter og gentagelser. Medicin: Følg medicin med dosering, frekvens og påmindelser per dosis. Fodring: Planlæg fodringsrutiner med tidspunkt og mængde. Pleje: Hold styr på pelspleje og klipning. Vaccinationer: Registrér vacciner med næste udløbsdato, påmindelse og status. Forsikring: Gem forsikringsselskab, policenummer, varighed og dokumenter.',
  },

  kindergarten: {
    helpWhatText:
      'Børnehave-modulet lader dig holde styr på børnenes børnehavehverdag. Her kan du gemme personale, medlemmer, skemaer, fridage og aktiviteter for hvert børnehaveår. Brug søgefeltet til at filtrere kontakter og fridage.',
    helpHowText:
      "1. Tilføj et barn med navn, børnehave og billede.\n2. Vælg eller opret et år med afdeling.\n3. Tilføj personale og medlemmer med kontaktoplysninger, eller importér klasselisten fra billede med AI.\n4. Upload skemabilleder for efterår og forår.\n5. Tilføj fridage manuelt, importér fra billede med AI eller fra en URL.\n6. Tilføj aktiviteter som ture, møder og udflugter med sted, påmindelser og dokumenter.",
    helpTip:
      'Hvert børnehaveår har egne kontakter, skemaer, fridage og aktiviteter. Gamle data bevares som historik. Hold inde på et element for at redigere eller slette det — fridage kan også redigeres ved at trykke på dem.',
    helpSettingsText:
      "Du kan redigere og slette børn, kontakter, skemaer, fridage og aktiviteter ved at holde inde på elementet. Aktiviteter synkroniseres til familiens Google-kalender og sender push-underretninger til familien.",
  },

  school: {
    helpWhatText:
      "Skolemodulet lader dig holde styr på børnenes skolehverdag. Her kan du gemme kontakt- og faglærere, sundheds- og administrativt personale (rektor, sundhedsplejerske m.fl.), klassekammerater med værger, skemaer, fridage og aktiviteter for hvert skoleår. Brug søgefeltet til at filtrere kontakter og fridage.",
    helpHowText:
      "1. Tilføj et barn med navn, skole og billede.\n2. Vælg eller opret et skoleår med klassetrin.\n3. Tilføj kontaktlærere, sundheds-/admin-personale og klassekammerater med værger, eller importér klasselisten fra billede med AI.\n4. Upload skemabilder for efterår og forår.\n5. Tilføj fridage manuelt, importér fra billede med AI eller fra en URL.\n6. Tilføj aktiviteter som ture og skolebegivenheder med sted, påmindelser og dokumenter.",
    helpTip:
      'Hvert skoleår har egne kontakter, skemaer, fridage og aktiviteter. Gamle data bevares som historik. Hold inde på et element for help at redigere eller slette det — fridage kan også redigeres ved at trykke på dem.',
    helpSettingsText:
      "Du kan redigere og slette børn, kontakter, skemaer, fridage og aktiviteter ved at holde inde på elementet. Aktiviteter synkroniseres til familiens Google-kalender og sender push-underretninger til familien.",
  },
};

// ─────────────────────────────────────────────────────────────
// FI
// ─────────────────────────────────────────────────────────────
const fi = {
  profile: {
    helpCalendarWhatText:
      "Kalenteriasetus ohjaa, miten perheen tapahtumat tallennetaan kalentereihin. Valitse '📱 Puhelinkalenteri', jotta tapahtumat, lääkärikäynnit, rokotukset ja matkat lisätään automaattisesti puhelimen kalenteriin. Valitse '📧 Google Kalenteri' liittääksesi perheen jaettuun Google-kalenteriin.",
    helpCalendarHowText:
      "1. Valitse '📱 Puhelinkalenteri' tai '📧 Google Kalenteri'.\n2. Google: kirjoita sähköpostisi (valinnainen) ja napauta 'Yhdistä Google', hyväksy sitten käyttöoikeus Googlen kirjautumissivulla.\n3. Tapahtumat synkronoidaan automaattisesti valittuun kalenteriin.\n4. Omistajat voivat myös suorittaa 'Google Kalenteri-synkronoinnin' täyttääkseen kalenterin olemassa olevilla tapahtumilla.",
    helpCalendarTip:
      "Voit irrottaa Google-kalenterin milloin tahansa 'Irrota kalenteri' -painikkeella. Kaikki tapahtumat säilyvät sovelluksessa.",

    helpNotificationsWhatText:
      'Ilmoitukset ohjaavat, saatko push-ilmoituksia sovellukseen, kun perheenjäsenet lisäävät tai muuttavat sisältöä, esim. uusia tapahtumia ja huoltosopimuksia.',
    helpNotificationsHowText:
      "Napauta painiketta kytkeäksesi ilmoitukset päälle tai pois. Kun ne ovat 'Pois', et saa push-ilmoituksia omille laitteillesi — muut perheenjäsenet eivät vaikuta.",

    helpMinUkeTitle: 'Minun viikkoni',
    helpMinUkeWhatText:
      "Valitse, näytetäänkö viikkomenu 'Sinun viikkosi' -yhteenvetossa Tapahtumat-näkymässä. Piilota osio, jos et tarvitse ateriasuunnitelmaa sinne.",
    helpMinUkeHowText:
      "Kytke 'Viikkomenu'-kytkin päälle tai pois. Muutos tulee voimaan, kun avaat 'Sinun viikkosi' seuraavan kerran.",
    helpMinUkeTip:
      'Näytettävät ateriartyypit (aamiainen, lounas, päivällinen) määräytyvät alempana olevien Ruokakeskuksen asetusten mukaan.',

    helpMatsenterWhatText:
      "Valitse, mitkä ateriartyypit näytetään viikkomenussa ja 'Sinun viikkosi' -yhteenvetossa: aamiainen, lounas ja päivällinen.",
    helpMatsenterHowText:
      "Kytke aamiainen, lounas ja päivällinen päälle tai pois. Vain aktiiviset ateriat näkyvät viikkomennussa ja 'Sinun viikkosi' -yhteenvetossa.",
    helpMatsenterTip:
      "Muutokset tulevat heti voimaan Ruokakeskuksessa ja 'Sinun viikkosi' -yhteenvetossa Tapahtumat-näkymässä.",

    helpFamilyWhatText:
      'Hallitse perheenjäseniä, rooleja ja kutsuja. Vain omistajat ja ylläpitäjät voivat luoda kutsulinkkejä, muuttaa rooleja ja poistaa jäseniä.',
    helpFamilyHowText:
      "Napauta 'Luo linkki' luodaksesi kutsulinkin, jossa on 6-merkkinen koodi. Napauta 'Jaa linkki' jakaaaksesi sen liittyjälle. Omistajat ja ylläpitäjät voivat myös muuttaa rooleja napauttamalla roolia ja poistaa jäseniä listalta.",
    helpFamilyTip:
      "Kutsulinkit vanhenevat 1 tunnin kuluttua, ja niitä voi käyttää vain kerran. Jäsenet voivat lähteä perheestä 'Lähde perheestä' -painikkeella.",

    helpMembersTip: 'Omistajaa ei voi poistaa eikä hän voi menettää omistajaroolia.',

    helpSpondWhatText:
      "Yhdistä Spondiin näyttääksesi joukkueen tapahtumat suoraan sovelluksessa. Vain omistajat ja ylläpitäjät näkevät tämän osion. Spond-tapahtumat näkyvät automaattisesti Tapahtumat-näkymässä, jossa perheenjäsenet voivat vastata.",
    helpSpondHowText:
      "1. Kirjoita Spond-sähköposti ja salasana ja napauta 'Yhdistä Spondiin'.\n2. Valitse, mitkä ryhmät näytetään (ja lataa ryhmän logo halutessasi).\n3. Valitse 'Valitse vastaajat' -kohdasta, ketkä voivat ilmoittautua.\n4. Napauta 'Tallenna' — ilman tallennusta Spond-tapahtumia ei näy.",
    helpSpondTip:
      "Spond-salasana tallennetaan turvallisesti (salattuna). Voit irrottaa yhteyden milloin tahansa 'Irrota Spond' -painikkeella.",

    helpBirthdaysWhatText:
      "Hallitse perheen syntymäpäiviä. Syntymäpäivät näkyvät Syntymäpäivät-moduulissa, Tapahtumat-näkymässä ja 'Sinun viikkosi' -yhteenvetossa.",
    helpBirthdaysHowText:
      "Avaa Syntymäpäivät-moduuli ja napauta '+' lisätäksesi syntymäpäivän. Pidä painettuna syntymäpäivää muokataksesi tai poistaaksesi sen.",
    helpBirthdaysTip: 'Syntymäpäivät näkyvät automaattisesti Tapahtumat-näkymässä lähestyessään.',
  },

  spaces: {
    helpBirthdaysWhatText:
      "Syntymäpäivät näyttää kaikki perheen syntymäpäivät järjestettynä seuraavan esiintymisen mukaan, iän ja lähtölaskennan (Tänään / X päivän kuluttua) kanssa. Syntymäpäivät näkyvät myös Tapahtumat-näkymässä ja 'Sinun viikkosi' -yhteenvetossa.",
    helpBirthdaysGiftsText:
      "Jokaisella syntymäpäivällä on oma lahjalista nykyiselle vuodelle. Napauta syntymäpäivää laajentaaksesi listaa, merkitäksesi lahjat ostetuiksi ja lisätäksesi uusia lahjaideoita. Listan alla näet aiempien vuosien lahjalistojen yhteenvedon.",
    helpBirthdaysHowText:
      "Napauta '+' lisätäksesi uuden syntymäpäivän (nimi ja päivämäärä). Pidä painettuna syntymäpäivää muokataksesi tai poistaaksesi sen. Napauta syntymäpäivää laajentaaksesi lahjalistan ja napauta '+ Lisää lahjaidea' uusia lahjoja varten.",
    helpBirthdaysTip:
      'Lahjalistat säilytetään vuodesta toiseen, jotta näet, mitä annoit viimeksi.',
  },

  mealPlanner: {
    helpTitle: 'Viikkomenu',
    helpWhatText:
      'Viikkomemun avulla voit suunnitella ateriat koko viikolle. Voit lisätä aamiaisen, lounaan ja päivällisen jokaiselle päivälle reseptikirjasi pohjalta.',
    helpHowText:
      "Käytä nuolia ◀ ▶ selataksesi viikkoja. Napauta ateriapaikkaa (esim. '+ Päivällinen') valitaksesi reseptin kirjasta. Napauta suunniteltua ateriaa nähdäksesi reseptin tai poistaaksesi sen suunnitelmasta.",
    helpTip:
      "Käytä 'Kopioi edelliseltä viikolta' hyödyntääksesi edellisen viikon suunnitelman, ja Profiilin asetuksia näyttääksesi tai piilottaaksesi aamiaisen, lounaan ja päivällisen.",

    helpRandomWhatText:
      'Etkö saa inspiraatiota päivän päivälliseen? Napauta painiketta, niin ehdotamme reseptin reseptikirjastasi.',
    helpRandomHowText:
      "Napauta 'Satunnainen annos' saadaksesi ehdotuksen. Napauta 'Lisää viikkosuunnitelmaan' lisätäksesi annoksen päivän päivälliseksi, tai 'Näytä resepti' avataksesi sen.",
    helpRandomTip: 'Napauta uudelleen saadaksesi uusia ehdotuksia.',

    helpSearchWhatText:
      'Hae reseptikirjastasi nimellä. Samassa välilehdessä voit myös suodattaa kategorioilla kuten Kana, Kasvis ja Pasta.',
    helpSearchHowText:
      'Kirjoita hakusana hakukenttään. Jos haku ei tuota osumia, voit käyttää tekoälyhakua luodaksesi uusia reseptejä kuvauksesi perusteella.',
    helpSearchTip:
      'Voit myös tuoda reseptejä verkkosivuilta 🔗-painikkeella tai kuvata reseptin 📷-painikkeella.',

    helpAiSearchWhatText:
      'Tekoälyhaku käyttää tekoälyä ehdottaakseen uusia reseptejä kirjoittamasi perusteella, kun hakusi kirjasta ei tuota osumia.',
    helpAiSearchHowText:
      "Kirjoita hakusana hakukenttään. Jos osumia ei näy, napauta 'Hae tekoälyllä'. Valitse, mistä maasta reseptien tulee olla — tekoäly luo kolme ehdotusta aineksine ja valmistusohjeineen.",
    helpAiSearchTip:
      "Napauta 'Tallenna' ehdotuksessa lisätäksesi sen reseptikirjaan. Sen jälkeen voit muokata sitä kuten mitä tahansa reseptiä.",

    helpHandlelisteWhatText:
      'Ostoslistat auttavat keräämään ostettavat tuotteet. Voit luoda omia listoja tai saada ainekset automaattisesti resepteistä.',
    helpHandlelisteHowText:
      "Napauta '+' luodaksesi uuden ostoslistan. Kirjoita nimi ja napauta 'Lisää' — pääset suoraan uuteen listaan. Pidä painettuna listaa poistaaksesi sen.",
    helpHandlelisteRecipeText:
      "Kun avaat reseptin ja napautat 'Lisää ostoslistaan', luodaan uusi lista reseptin nimellä (tai ainekset lisätään olemassa olevaan listaan, jolla on sama nimi).",
    helpHandlelisteRecipeTip:
      'Ainekset käännetään sovelluksessa valitsemallesi kielelle.',

    helpWeekMenuWhatText:
      'Viikkomemussa näkyvät viikon jokaisen päivän ateriat. Voit selata viikkoja nuolilla ja suunnitella aamiaisen, lounaan ja päivällisen jokaiselle päivälle.',
    helpWeekMenuHowText:
      "Napauta '+'-painiketta aterian kohdalla valitaksesi reseptin (haulla). Napauta suunniteltua ateriaa nähdäksesi reseptin tai poistaaksesi sen suunnitelmasta. Jos olet toisella viikolla, napauta 'Takaisin tähän viikkoon'.",
    helpWeekMenuTip:
      "Käytä 'Kopioi edelliseltä viikolta' alhaalla hyödyntääksesi edellisen viikon suunnitelman — painike näkyy vain, kun viikko on tyhjä.",
  },

  detail: {
    helpTransportWhatText:
      'Lisää lennot, junat, vuokra-autot, risteilyt, lautat ja taksit matkalle. Matkasta paluu syötetään erillisiin välilehtiin, ja matka näkyy listalla yhtenä kokonaisuutena.',
    helpTransportHowText:
      "Napauta '+' ja valitse kulkutapa. Täytä yhtiö, linja/lentonumero, viite (PNR), paikka, päivämäärät ja ajat sekä osoitteet. Kytke 'Yksisuuntainen' pois rekisteröidäksesi sekä meno- että paluumatkan.",
    helpTransportTip:
      'Pidä painettuna kuljetusta muokataksesi tai poistaaksesi sen. Vain omistaja, ylläpitäjät ja luojä voivat muokata sitä.',

    helpHotelsWhatText:
      'Hallitse majoituksia matkalle. Lisää hotelleja nimellä, osoitteella, puhelimella, päivämäärillä ja sisään-/uloskirjautumisajoilla.',
    helpHotelsHowText:
      "Napauta '+' ja täytä hotellin nimi, osoite (Google-haku), sisään- ja uloskirjautumispäivät ja ajat, puhelin ja mahdolliset muistiinpanot. Napauta hotellia nähdäksesi yksityiskohdat kartalla.",
    helpHotelsTip: 'Voit lisätä useita hotelleja eri matkan osille.',

    helpRestaurantsWhatText:
      'Suunnittele ruokapaikkoja matkalle. Lisää ravintoloita nimellä, osoitteella, päivämäärällä, kellonajalla ja muistiinpanoilla.',
    helpRestaurantsHowText:
      "Napauta '+' ja täytä nimi, osoite (Google-haku), päivämäärä ja kellonaika sekä mahdolliset muistiinpanot — esim. varaus tiedot. Napauta ravintolaa nähdäksesi yksityiskohdat kartalla.",
    helpRestaurantsTip:
      'Voit lisätä useita ravintoloita ja muokata niitä myöhemmin pitämällä painettuna.',

    helpActivitiesWhatText:
      'Suunnittele aktiviteetteja ja elämyksiä matkalle. Lisää nähtävyyksiä, retkiä ja tapahtumia päivämäärällä, kellonajalla ja paikalla.',
    helpActivitiesHowText:
      "Napauta '+' ja täytä nimi, osoite (Google-haku), päivämäärä ja kellonaika sekä muistiinpanot. Napauta aktiviteettia nähdäksesi yksityiskohdat kartalla.",
    helpActivitiesTip:
      'Voit lisätä useita aktiviteetteja ja muokata niitä myöhemmin pitämällä painettuna.',

    helpTipsWhatText:
      'Saat tekoälyn luomia vinkkejä määränpäähän — matkapäivien ja säätiedotuksen perusteella. Saat yleiskatsauksen, tekemistä, ravintoloita, hyödyllisiä fraaseja ääntämyksineen, liikenteen ja varoituksia.',
    helpTipsHowText:
      "Hae kaupunki hakukentässä ja napauta 'Luo'. Kaupunki tallennetaan matkalle, ja voit laajentaa sen lukeaksesi vinkit tai napauttaa ↻ luodaksesi uudelleen. Voit lisätä useita kaupunkeja per matka.",

    helpDocumentsWhatText:
      'Lataa ja tallenna tärkeitä matkadokumentteja, kuten lentoliput, passikopiot ja varaukset pilveen.',
    helpDocumentsHowText:
      "Laajenna 'Matkadokumentit'-osio napauttamalla otsikkoa ja napauta sitten '+' ladataksesi tiedoston. Anna dokumentille otsikko ja mahdollinen kuvaus. Napauta 'Avaa' dokumenttia nähdäksesi tai ladataksesi sen, ja pidä painettuna poistaaksesi sen.",
    helpDocumentsTip:
      'Dokumentit tallennetaan turvallisesti pilveen (Firebase Storage) ja niiden avaaminen vaatii internet-yhteyden.',
  },

  homes: {
    helpWhatText:
      'Tässä voit lisätä kaikki kotisi — talo, kesämökki, talvimökki ja asunto. Jokaisen kodin kohdalla voit avata ohjeet, huollon ja projektit.',
    helpHowText:
      "Napauta 'Lisää koti' -korttia luodaksesi kodin. Täytä nimi, tyyppi, osoite (postinumero ja paikkakunta täytetään automaattisesti), kuvaus ja mahdollinen kuva. Pidä painettuna kotia muokataksesi tai poistaaksesi sen.",

    vedlikeholdHelpWhatText:
      'Huolto auttaa sinua pitämään kirjaa huoltosopimuksista ja väreistä kotiasi varten. Suunnittele toistuvaa huoltoa muistutuksineen ja dokumenteineen, ja tallenna värit nimellä, koodilla, merkillä ja huoneella.',
    vedlikeholdHelpHowText:
      "Huoltosopimukset: Napauta '+' lisätäksesi sopimuksen otsikolla, henkilöllä, päivämäärällä alkaen/päättyen, kellonajalla, tiheydellä (kertaan/kuukausittain/neljännesvuosittain/vuosittain) ja muistutuksella. Käytä 'Ajoita toisto' luodaksesi sopimuksia tietyille viikonpäiville usean viikon yli, tuen kanssa joka toinen viikko. Voit myös liittää kuvia tai dokumentteja.\n\nVärit: Napauta '+' lisätäksesi värin. Käytä 'Kuvaa etiketti' tai 'Kuvaa seinä' antaaksesi tekoälyn lukea värin, tai kirjoita värikoodi ja napauta 'Hae väri' hakeaksesi automaattisesti.",
    vedlikeholdHelpTip:
      'Pidä painettuna huoltosopimusta tai väriä muokataksesi tai poistaaksesi. Huoltosopimukset näkyvät "Sinun viikkosi" -yhteenvetossa, ja projektiin liitetyt värit muokataan projektissa.',

    prosjektHelpTitle: 'Projektit',
    prosjektHelpWhatText:
      'Projektit kokoavat kaiken, mikä liittyy remontti- tai huoltoprojektiin: värit, ostoslista hintoineen, toimittajien tarjoukset, tehtävätaulu ja budjettikatsaus.',
    prosjektHelpHowText:
      "Napauta '+' luodaksesi projektin otsikolla, kuvauksella, budjetilla, alkupäivällä ja tilalla. Napauta projektia avataksesi sen. Projektissa saat tekoälyehdotuksia tehtäviin ja ostoslistaan, voit skannata kuitteja tekoälyllä, lisätä tarjouksia ja siirtää tehtäviä 'Tekemättä', 'Käynnissä' ja 'Valmis' välillä nuolipainikkeilla. Budjetti määritetään projektiin ja näkyy kulutuskatsauksena.",
    prosjektHelpTip:
      'Yhdistä ostoslistarivit tehtäviin pitääksesi kirjaa siitä, mitä kuhunkin tehtävään tarvitaan. Pidä painettuna projektia muokataksesi tai poistaaksesi sen.',

    instruksjonerHelpWhatText:
      'Ohjeet antavat sinun tallentaa tärkeitä tietoja kodistasi, jotka voit jakaa perheen kanssa. Jaa ohjeet osioissa "Kotiin tulo" ja "Kotoa lähtö" — esim. hälytyskoodit, Wi-Fi-salasanat, avainten sijainnit ja vastaavat.',
    instruksjonerHelpHowText:
      "Napauta '+' osiossa lisätäksesi ohjeen. Kirjoita otsikko ja sisältö manuaalisesti, tai käytä 'Skannaa muistiinpano' (kamera) tai 'Skannaa galleriasta' antaaksesi tekoälyn lukea käsin kirjoitetut muistiinpanot ja täyttää kentät automaattisesti. Pidä painettuna ohjetta muokataksesi tai poistaaksesi sen.",
    instruksjonerHelpTip:
      'Tekoälyn skannaus täyttää myös oikean osion ja liittää muistiinpanosta kuvan.',
  },

  health: {
    helpWhatText:
      "Terveysmoduulin avulla pidät kirjaa lääkkeistä, lääkärikäynneistä, rokotuksista, allergioista ja kasvusta koko perheelle. Lääkärikäynnit ja rokotukset näkyvät automaattisesti Tapahtumat-näkymässä ja 'Sinun viikkosi' -yhteenvetossa, ja ne synkronoidaan perheen Google-kalenteriin.",
    helpMedicationsText:
      'Lisää lääkkeitä nimellä, henkilöllä, annoksella ja tiheydellä (1–4 kertaa päivässä) kertojen ajoilla ja muistutuksilla. Voit myös määrittää voimassaoloajan ja muistiinpanon.',
    helpAppointmentsText:
      'Suunnittele lääkärikäyntejä ja hammaslääkärikäyntejä useilla perheenjäsenillä, lääkärillä, paikalla kartalla, muistutuksilla ja dokumenteilla. Voit ajoittaa toistuvia käyntejä (esim. joka toinen viikko), ja web-versiossa voit lisätä ajan suoraan Google- tai Outlook-kalenteriin.',
    helpHowText:
      "Napauta '+' osiossa lisätäksesi uutta. Napauta kohdetta nähdäksesi yksityiskohdat (kartalla ja muokkauspainikkeella, jos käytettävissä). Pidä painettuna kohdetta muokataksesi tai poistaaksesi sen.",
    helpTip:
      "Uudet lääkärikäynnit ja rokotukset lähettävät push-ilmoituksia perheelle, näkyvät 'Sinun viikkosi' -yhteenvetossa ja synkronoidaan perheen Google-kalenteriin.",
  },

  pets: {
    helpWhatText:
      "Tässä voit hallita perheen lemmikkejä. Lisää lemmikkejä nimellä, tyypillä, rodulla, sukupuolella, syntymäpäivällä, siru-ID:llä, passinumerolla ja kuvalla. Jokaisen lemmikin kohdalla voit pitää kirjaa eläinlääkärikäynneistä, lääkkeistä, ruokinnasta, hoidosta, rokotuksista ja vakuutuksista.",
    helpHowText:
      "Napauta '+' lisätäksesi uuden lemmikin. Napauta lemmikkiä nähdäksesi yksityiskohdat ja lisätäksesi tietoja eri osioihin. Pidä painettuna lemmikkiä muokataksesi tai poistaaksesi sen. Jokaisessa osiossa napauta '+' lisätäksesi uusia merkintöjä ja pidä painettuna muokataksesi tai poistaaksesi.",
    helpTip:
      "Eläinlääkärikäynnit synkronoidaan perheen Google-kalenteriin, ja päivämäärällä varustetut rokotukset lisätään tapahtumina. Uudet käynnit ja rokotukset lähettävät myös push-ilmoituksia perheelle.",
    helpFeaturesText:
      'Eläinlääkärikäynnit: Suunnittele käyntejä päivämäärällä, kellonajalla, paikalla, osallistujilla, muistutuksella, dokumenteilla ja toistoilla. Lääkkeet: Seuraa lääkkeitä annoksella, tiheydellä ja muistutuksilla per annos. Ruokinta: Suunnittele ruokintarutiineja ajalla ja määrällä. Hoito: Pidä kirjaa turkinhoidosta ja trimmauksesta. Rokotukset: Rekisteröi rokotteet seuraavalla erääntymispäivällä, muistutuksella ja tilalla. Vakuutus: Tallenna vakuutusyhtiö, vakuutusnumero, kesto ja dokumentit.',
  },

  kindergarten: {
    helpWhatText:
      'Lastentarhamoduuli auttaa sinua pitämään kirjaa lasten päiväkotiarkiesta. Tässä voit tallentaa henkilöstön, jäsenet, aikataulut, vapaapäivät ja aktiviteetit jokaiselle päiväkotivuodelle. Käytä hakukenttää suodattaaksesi yhteystiedot ja vapaapäivät.',
    helpHowText:
      "1. Lisää lapsi nimellä, päiväkodilla ja kuvalla.\n2. Valitse tai luo vuosi osastolla.\n3. Lisää henkilöstö ja jäsenet yhteystiedoilla, tai tuo luettelosta kuva tekoälyllä.\n4. Lataa aikataulukuvat syksylle ja keväälle.\n5. Lisää vapaapäivät manuaalisesti, tuo kuva tekoälyllä tai URL-osoitteesta.\n6. Lisää aktiviteetteja, kuten retkiä, kokouksia ja ulkoiluja paikalla, muistutuksilla ja dokumenteilla.",
    helpTip:
      'Jokaisella päiväkotivuodella on omat yhteystiedot, aikataulut, vapaapäivät ja aktiviteetit. Vanhat tiedot säilytetään historiana. Pidä painettuna kohdetta muokataksesi tai poistaaksesi sen — vapaapäiviä voi muokata myös napauttamalla niitä.',
    helpSettingsText:
      "Voit muokata ja poistaa lapsia, yhteystietoja, aikatauluja, vapaapäiviä ja aktiviteetteja pitämällä painettuna kohdetta. Aktiviteetit synkronoidaan perheen Google-kalenteriin ja lähettävät push-ilmoituksia perheelle.",
  },

  school: {
    helpWhatText:
      "Koulumoduuli auttaa sinua pitämään kirjaa lasten kouluelämästä. Tässä voit tallentaa luokan- ja aineenopettajat, terveys- ja hallintohenkilöstön (rehtori, kouluterveydenhoitaja ym.), luokatoverit huoltajineen, aikataulut, vapaapäivät ja aktiviteetit jokaiselle koulvuodelle. Käytä hakukenttää suodattaaksesi yhteystiedot ja vapaapäivät.",
    helpHowText:
      "1. Lisää lapsi nimellä, koululla ja kuvalla.\n2. Valitse tai luo kouluvuosi luokka-asteella.\n3. Lisää luokanopettajat, terveys-/hallintohenkilöstö ja luokatoverit huoltajineen, tai tuo luettelosta kuva tekoälyllä.\n4. Lataa aikataulukuvat syksylle ja keväälle.\n5. Lisää vapaapäivät manuaalisesti, tuo kuva tekoälyllä tai URL-osoitteesta.\n6. Lisää aktiviteetteja, kuten retkiä ja koulutapahtumia paikalla, muistutuksilla ja dokumenteilla.",
    helpTip:
      'Jokaisella koulvuodella on omat yhteystiedot, aikataulut, vapaapäivät ja aktiviteetit. Vanhat tiedot säilytetään historiana. Pidä painettuna kohdetta muokataksesi tai poistaaksesi sen — vapaapäiviä voi muokata myös napauttamalla niitä.',
    helpSettingsText:
      "Voit muokata ja poistaa lapsia, yhteystietoja, aikatauluja, vapaapäiviä ja aktiviteetteja pitämällä painettuna kohdetta. Aktiviteetit synkronoidaan perheen Google-kalenteriin ja lähettävät push-ilmoituksia perheelle.",
  },
};

const data = { nb, en, sv, da, fi };

for (const lang of langs) {
  const file = path.join(base, `${lang}.json`);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const updates = data[lang];
  let count = 0;
  for (const [ns, keys] of Object.entries(updates)) {
    if (!json[ns]) {
      console.error(`${lang}: namespace missing: ${ns}`);
      continue;
    }
    for (const [key, value] of Object.entries(keys)) {
      if (!(key in json[ns])) {
        console.error(`${lang}: key missing (not writing): ${ns}.${key}`);
        continue;
      }
      json[ns][key] = value;
      count++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`${lang}: updated ${count} keys`);
}
