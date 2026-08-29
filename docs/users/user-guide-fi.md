# fampad — Käyttöopas

<p align="center">
  <img src="../../assets/icon.png" alt="fampad Logo" width="120" height="120" />
</p>

<p align="center"><strong>Perheesi kaikki yhdessä organisaatiokeskuksessa</strong></p>

---

## Sisällysluettelo

1. [Aloittaminen](#getting-started)
2. [Navigointikatsaus](#navigation-overview)
3. [Tapahtumat & Kalenteri](#events--calendar)
4. [Keskustelu](#chat)
5. [Pikaluontipainike](#quick-create-button)
6. [Viikkoyleistävä ("Minun viikko")](#weekly-summary-min-uke)
7. [Moduulit](#spaces-modules)
   - [Matkat](#trips--travel)
   - [Terveys](#health)
   - [Lemmikit](#pets)
   - [Koulu](#school)
   - [Päiväkoti](#kindergarten)
   - [Syntymäpäivät](#birthdays)
   - [Ruokavalio](#meal-plan)
   - [Ostoslistat](#shopping-lists)
8. [Ääni & Valokuva Tapahtumaan/Toimintaan](#voice--photo-to-eventactivity)
9. [PäivämääräValitsin & Muistutukset](#datepicker--reminders)
10. [Profiili & Asetukset](#profile--settings)
11. [Teemat](#themes)
12. [Kielituki](#language-support)
13. [PWA & Asennus](#pwa--install)
14. [Vinkit & Nikkarit](#tips--tricks)

---

## Aloittaminen

### Luo käyttäjätilisi

1. Avaa fampad selaimessasi tai asenna se PWA-na
2. Syötä sähköpostisi ja salasanasi rekisteröityäksesi
3. Sinut asetetaan automaattisesti uudelle käyttäjätilille

### Aseta perheesi

Kirjautumisen jälkeen sinun täytyy joko luoa tai liittyä perheeseen:

**Vaihtoehto A: Luo uusi perhe**
1. Siirry **Profiili**-välilehdelle
2. Napauta "Opprett familie" (Luo perhe)
3. Syötä perheen nimi
4. Sinusta tulee perheen **omistaja**

**Vaihtoehto B: Liity olemassa olevaan perheeseen**
1. Pyydä perheen järjestelmänvalvojaa luomaan kutsukoodi (Profiili > Perhe osio > "Inviter medlem")
2. Syötä 6-merkkinen koodi profiilinäkymässä
3. Liityt **jäsenenä**

### Ymmärrä perheen roolit

| Rooli | Käyttöoikeudet |
|-------|----------------|
| **Omistaja** | Täydellinen hallinta. Hallitsee kaikkia jäseniä, voi luoda/poistaa perheen. Ei voi lähteä. |
| **Järjestelmänvalvoja** voi kutsua jäseniä, poistaa jäseniä, muuttaa rooleja. |
| **Jäsen** | Voi luoda ja muokata sisältöä. Ei voi hallita muita jäseniä. |

---

## Navigointikatsaus

fampad käyttää alareunan välilehtipalkkia, jonka välilehdet on sijoitettu symmetrisesti keskimmäisen "+"-painikkeen ympärille. Keskustelu ja Meidän paikat ovat sijoitettu muiden välilehtien ja keskimmäisen plus-painikkeen välille.

| Välilehti | Kuvake | Kuvaus |
|-----------|--------|--------|
| **Kalenteri** | Kalenteri | Tapahtumat kaikista lähteistä (manuaaliset, Spond, terveys, lemmikit) |
| **Keskustelu** | Keskustelupallo | Perheen viestintä kuvilla ja reaktioilla |
| **Meidän paikat** | Kompassi/Talo | Moduulikeskus — pääsy kaikkiin moduuleihin |
| **Profiili** | Henkilö | Asetukset, perheen hallinta, integraatiot |

**+ (plus)**-painike keskellä välilehtipalkkia avaa **pikaluontimodaalin** nopeaan sisällön luomiseen.

---

## Tapahtumat & Kalenteri

Tapahtumavälilehti näyttää yhdistetyn kalenterin kaikista perheen toiminnoista.

### Tapahtumien katselu

- **Listanäkymä**: Tapahtumat ryhmiteltyinä päivämäärän mukaan vieritettävässä listassa
- **Kalenterinäkymä**: Kuukausikalenterin ruudukko näyttää pisteet jokaisella päivällä
- Napauta kalenterikuvaketta vaihtaaksesi listanäkymän ja kalenterinäkymän välillä

### Tapahtumien lähteet

Tapahtumat tulevat useista lähteistä ja ovat värikoodattuja:
- **Manuaaliset tapahtumat** jotka luot (vihreä)
- **Spond-tapahtumat** urheiluseurastasi (punainen)
- **Terveysajanvaraukset** (#C67B5C)
- **Eläinlääkärivierailut** (#9B7DB8)
- **Koulutoiminnot** (#6B8F71)
- **Päiväkotoiminnot** (#E8836A)
- **Matkat** aloitus-/loppupäivämäärillä (#7EC8E3)

### Luo tapahtuma

1. Napauta **+**-painiketta välilehtipalkissa
2. Valitse "Manuelt" (Manuaalinen) tapahtumiosiossa
3. Täytä tiedot:
   - **Otsikko** (pakollinen)
   - **Päivämäärä** ja valinnainen loppupäivämäärä
   - **Aika** ja valinnainen loppuaika
   - **Osoite** (Google Places -haku)
   - **Kuvaus** (valinnaiset muistiinpanot)
   - **Muistutus** (Ei, 30 min, 1 tunti, 2 tuntia, 1 päivä, 1 viikko)
   - **Dokumentin lataus** (valinnainen)
4. Napauta "Lagre" (Tallenna)

### Spond-tapahtumat

Jos olet liittänyt Spondin profiiliasetuksiin:
- Spond-tapahtumat valituista ryhmistäsi ilmestytvät automaattisesti
- Näet RSVP-tilan (hyväksytty/hylätty/vastaamaton) perheen jäsenille
- Napauta Spond-tapahtumaa nähdäksesi tiedot ja muuttaaksesi vastauksesi

### Tapahtuman tiedot

Napauta mitä tahansa tapahtumaa nähdäksesi:
- Täydellinen päivämäärä, aika ja sijainti
- Staattinen kartta näyttää sijainnin
- Kuvaus ja muistiinpanot
- RSVP-tila (Spond-tapahtumille)
- Ladatut dokumentit
- Muokkaus ja poisto -vaihtoehdot (pitkä painaminen toimintovalikolle)

---

## Keskustelu

Keskusteluvälilehti tarjoaa perheen viestintärikkailla ominaisuuksilla.

### Viestien lähettäminen

1. Kirjoita viestisi tekstikenttään
2. Napauta lähetysnuolta julkaistaksesi

### Kuvien jakaminen

1. Napauta kuvaketta tekstikentän vieressä
2. Valitse valitse galleriasta tai ota valokuva
3. Esikatsele kuva
4. Napauta lähetä — kuva ladataan Firebase Storageen

### Reaktiot

- Pitkä painaminen viestillä lisää reaktion
- Käytettävissä olevat reaktiot: Tykkää, Hymy, Sydän
- Reaktiosi näkyvät viestin alla

### Ominaisuudet

- Reaaliaikaiset päivitykset Firestore-kuulijoilta
- Viestit vierivät automaattisesti alareunaan
- Käyttäjäavatarit näkyvät viestien vieressä
- Kuvat näkyvät linssinä napauttamalla laajenna

---

## Pikaluontipainike

**+**-painike keskellä välilehtipalkkia avaa modaalin pikaluontipikakuvakkeilla, jotka on järjestetty moduulittain. Jokainen moduuli tarjoaa kolme luontimenetelmää: **Manuelt** (manuaalinen lomake), **Tale** (ääni-/tallennus) ja **Foto** (kuvantunnistus).

### Tapahtumasektio
- **Manuelt** — Luo uusi manuaalinen tapahtuma
- **Tale** — Ääni-tapahtumaan: tallenna puhe, AI muuntaa tapahtumaksi
- **Foto** — Kuva-tapahtumaan: ota valokuva aikataulusta, AI poimii tapahtumat

### Terveyssektio
- **Manuelt** — Luo uusi terveydenajanvaraus
- **Tale** — Ääni-toimintaan: tallenna puhe, AI luo terveydenajanvarauksen
- **Foto** — Kuva-toimintaan: ota valokuva, AI luo terveydenajanvarauksen

### Lemmikkisektio
- **Manuelt** — Suunnittele eläinlääkärivierailu
- **Tale** — Ääni-toimintaan: tallenna puhe, AI luo eläinlääkärivierailun
- **Foto** — Kuva-toimintaan: ota valokuva, AI luo eläinlääkärivierailun

### Koulusektio
- **Manuelt** — Luo uusi koulutoiminta (retki/toiminta/kokous)
- **Tale** — Ääni-toimintaan: tallenna puhe, AI luo koulutoiminnan
- **Foto** — Kuva-toimintaan: ota valokuva, AI luo koulutoiminnan

### Päiväkotisektio
- **Manuelt** — Luo uusi päiväkotoiminta
- **Tale** — Ääni-toimintaan: tallenna puhe, AI luo päiväkotoiminnan
- **Foto** — Kuva-toimintaan: ota valokuva, AI luo päiväkotoiminnan

### Matkasektio
- **Manuelt** — Luo uusi matka

---

## Viikkoyleistävä ("Minun viikko")

Viikkoyleistävä näyttää kaiken mikä tapahtuu tällä viikolla yhdessä näkymässä.

### Pääsy siihen

1. Siirry **Tapahtumat** (Kalenteri) välilehdelle
2. Napauta "Min uke" (Minun viikko) -painiketta ylhäällä

### Mitä sisältyy

Viikkoyleistävä näyttää nykyisen viikon (maanantai sunnuntaiin) seuraavilla:

- **Yhteenvetokehote**: Viikonnumero ja aikaväli
- **Päiväaikajana**: Jokainen päivä näyttää kaikki toiminnot kronologisesti
- **Tilastochipsit**: Nopea laskenta tapahtumista, matkoista ja muista kohteista
- **Värikoodatut kohteet**: Jokaisella lähteellä on oma värinsä

### Osiot

| Osiso | Sisältö |
|-------|---------|
| **Arrangementer** | Manuaaliset tapahtumat viikolle |
| **Spond** | Urheiluseuran tapahtumat RSVP-tilalla |
| **Reiser** | Aktiiviset matkat (liikenne, hotellit, ravintolat) |
| **Helse** | Terveysajanvaraukset ja lääkkeet |
| **Kjæledyr** | Eläinlääkärivierailut ja rokotukset |
| **Skole** | Koulutoiminnot (retki, toiminta, kokous) |
| **Barnehage** | Päiväkotoiminnot |
| **Bursdager** | Tulevat syntymäpäivät |
| **Middager** | Viikko ruokavalio (aamiainen, lounas, illallinen)

### Osioiden mukauttaminen

Voit näyttää/piilottaa osioita Profiili > "Min uke" -asetuksista. Mukauta mitä tietoja näkyy viikkonäkymässäsi.

---

## Moduulit

Pääsy kaikkiin moduuleihin **Meidän paikat** -välilehdeltä. Jokaisella moduulilla on oma korttinsa kuvakkeella, nimellä ja kohteiden määrällä.

### Matkat

**Kuvake**: Kompassi | **Väri**: #7EC8E3 (Sininen)

Suunnittele ja järjestä perheen matkoja seuraavilla:

- **Matkakatsaus**: Luo matkoja määränpääksi, päivämäärillä ja koordinaateilla
- **Liikenne**: Varaa lentoja, juna-autoja, busseja, veneliikennettä, takseja, lauttoja lähtö-/saapumisajoilla
- **Hotellit**: Majoitus sisään-/ulostarkistusajoilla ja osoitteilla
- **Ravintolat**: Varaukset päivämäärillä ja muistiinpanoilla
- **Toiminnot**: Suunnitellut toiminnot aikatauluilla
- **Pakkaukset**: Valittavat pakkauslistat
- **Dokumentit**: Lataa ja tallenna matkadokumentit
- **Linkit**: Tallenna hyödyllisiä URL:itä
- **Sää**: AI-haettu sääennuste määränpääsillesi
- **Määränpäävinkit**: AI-generoidut matkavinkit (tehtävät, ravintolat, paikalliset fraasit, huijausvaroitukset)

**Liikenteen lisääminen**: Jokainen liikennetyyppi (lento, juna, auto, veneliikenne, taksi, lautta) käyttää kaksoislomakemallia lähtö- (utreise) ja saapumis- (hjemreise) välilehdillä. Merkitse "En vei" (yhdensuuntaisesti) piilottaaksesi paluumatkan lomakkeen.

### Terveys

**Kuvake**: Medikaalinen | **Väri**: #C67B5C (Punainen/Ruskea)

Seuraa perheen terveysetietoja:

- **Lääkkeet**: Seuraa reseptejä annostuksella ja tiheydellä
- **Ajanvaraukset**: Suunnittele lääkärivierailuja päivämäärällä, ajalla, sijainnilla
  - **Henkilö**: Monivalinta — määritä ajanvaraukset useille perheen jäsenille
  - **Lääkäri**: Lääkärin nimi
  - **Päivämäärä/Aika**: dateFrom/dateTo automaattisella synkronoinnilla
  - **Muistutukset**: Ystävälliset nimikkeet (30 min, 1 tunti, 2 tuntia, 1 päivä, 1 viikko)
- **Rokotukset**: Kirjaa rokotukset seuraavilla määräpäivillä
- **Allergiat**: Dokumentoi allergiat vakavuustasoilla
- **Kasvu**: Kirjaa pituus- ja painomittauksia ajan myötä

Jokainen osio on taitettavissa lisää-/muokkaa-/poisto-toiminnallisuudella. Ajanvaraukset sijainneilla näyttävät kartan, joka avaa Google Mapsin napauttamalla.

### Lemmikit

**Kuvake**: Lemmikki | **Väri**: #9B7DB8 (Violetti)

Hallitse lemmikinhoitoa omistetuilla osioilla:

- **Lemmikit**: Lisää lemmikkejä nimellä, tyypillä, rodulla, syntymäpäivällä, čip-numerolla, passinumerolla
- **Eläinlääkärivierailut**: Suunnittele ja seuraa eläinlääkärivierailuja
  - **Lääkäri**: Eläinlääkärin nimi
  - **Päivämäärä/Aika**: dateFrom/dateTo automaattisella synkronoinnilla
  - **Muistutukset**: Ystävälliset nimikkeet (30 min, 1 tunti, 2 tuntia, 1 päivä, 1 viikko)
- **Lääkkeet**: Seuraa lemmikkilääkkeitä ja annostuksia
- **Ruoka**: Kirjaa ruokinta-aikataulut ja määrät
- **Turkkihoito**: Seuraa turkkihoitoaikataulua seuraavilla määräpäivillä
- **Rokotukset**: Kirjaa rokotushistoria
- **Vakuutus**: Tallenna vakuutusyksityiskohdat ja vanhenemispäivät

### Koulu

**Kuvake**: Dokumentit | **Väri**: #6B8F71 (Vihreä)

Järjestä koulutietoja:

- **Lapset**: Lisää lapsia koulun nimellä ja yhteystiedoilla
- **Toiminnot**: Luo koulutoimintoja (retki/toiminta/kokous) seuraavilla:
  - **Tyyppi**: retki, toiminta, kokous
  - **Aikaväli**: dateFrom/dateTo automaattisella synkronoinnilla (dateTo muuttuu dateFromin mukaan, ei koskaan ennen dateFromia)
  - **Aikaväli**: Valinnaiset aloitus-/loppuajat
  - **Muistutukset**: Ystävälliset nimikkeet (Ei, 30 min, 1 tunti, 2 tuntia, 1 päivä, 1 viikko)
  - **Dokumentit**: Lataa ja tallenna dokumentit (suostumuslomakkeet, aikataulut jne.)
  - **Kalenterin synkronointi**: Google Calendar -integraatio kaikille toimintatyypeille
  - **Yhteystiedot**: Opettajat ja luokkatoverit puhelin-/sähköposti-/vanhemmatiedoilla
  - **Aikataulut**: Lataa lukukauden aikataulukuvia

**AI-tuonti**: Käytä Koulun AI-ominaisuutta:
1. Ota valokuva luokkalistasta
2. AI poimii kaikki nimet ja vanhempien yhteystiedot
3. Käy läpi ja vahvista poimitut tiedot
4. Yhteystiedot lisätään automaattisesti

### Päiväkoti

**Kuvake**: Päiväkoti | **Väri**: #E8836A (Oranssi)

Hallitse päiväkotitietoja samoin ominaisuuksilla kuin Koulu:

- **Lapset**: Lisää lapsia päiväkodin nimellä ja yhteystiedoilla
- **Toiminnot**: Luo päiväkotoimintoja (retki/toiminta/kokous) päivämäärä-/aikaväleillä, muistutuksilla, dokumenteilla ja kalenterin synkronoinnilla
- **Yhteystiedot**: Opettajat ja henkilökunta yhteystiedoilla
- **Aikataulut**: Lataa aikataulukuvia

### Syntymäpäivät

**Kuvake**: Syntymäpäivä | **Väri**: Oranssi

Muista syntymäpäivät aina:

- **Syntymäpäivalista**: Lisää syntymäpäivät nimellä ja päivämäärällä
- **Lahjaideat**: Lisää lahjaideat jokaiselle syntymäpäivälle ja merkitse ostetuksi
- **Ilmoitukset**: Vastaanota push-ilmoitukset päivänä ja 7 päivää ennen

### Ruokavalio

**Kuvake**: Bestik | **Väri**: Teal

Suunnittele perheen aterioita seuraavilla:

- **Reseptikirjat**: Selaa, etsi ja suodata reseptejä kategorian mukaan
- **AI-res eptiehdot**: Kuvaile mitä haluat, saat 3 reseptivaihtoehtoa
- **Tuonti URL:stä**: Liitä reseptin URL ja AI poimii reseptin
- **Valokuva reseptiin**: Ota valokuva reseptistä, AI poimii ainesosat ja ohjeet
- **Reseptin kääntäminen**: Käännä reseptejä norjaksi, ruotsiksi, tanskaksi, englanniksi tai suomeksi
- **Viikko ruokavalio**: Määritä aamiainen, lounas ja illallinen jokaiselle päivälle
- **Ostoslistat**: Luo ostoslistat automaattisesti ruokavalioista

**Reseptikategoriat**: kana, liikala, kala, kasvisruoka, pasta, kattila, keitto, aamiainen, jälkiruoka

### Ostoslistat

Luo ja hallitse valittavia ostoslistoja. Kohteita voidaan lisätä ruokavalioista tai manuaalisesti.

---

## Ääni & Valokuva Tapahtumaan/Toimintaan

### Ääni-Tapahtumaan/Toimintaan

Luo tapahtumia tai toimintoja puhumalla:

1. Napauta **+**-painiketta > "Tale" missä tahansa moduuliosiossa
2. Napauta mikrofonia aloittaaksesi tallennuksen
3. Puhu luonnollisesti, esim.: "Kokous päiväkodin kanssa keskiviikkona kello 14"
4. Napauta pysäytä kun olet valmis
5. AI transkriboi puheesi ja poimii:
   - Tapahtuman/toiminnan otsikko
   - Päivämäärä (tulkkaa "huomenna", "maanantaina" jne.)
   - Aika (ymmärtää "puoli kolme", "neljännekshi kaksi" jne.)
   - Kuvaus
6. Käy läpi ja muokkaa tarvittaessa
7. Tallenna

Ääni-tapahtuma toimii kaikille moduuleille:
- **Tapahtumat**: Luo kalenteritapahtuman
- **Terveys**: Luo terveydenajanvarauksen
- **Lemmikit**: Luo eläinlääkärivierailun
- **Koulu**: Luo koulutoiminnan (retki/toiminta/kokous)
- **Päiväkoti**: Luo päiväkotoiminnan

### Valokuva-Tapahtumaan/Toimintaan

Luo tapahtumia tai toimintoja valokuvista:

1. Napauta **+**-painiketta > "Foto" missä tahansa moduuliosiossa
2. Ota valokuva tai valitse galleriasta
3. AI poimii kaikki näkyvät tapahtumat/toiminnot otsikoilla, päivämäärillä ja ajoilla
4. Käy läpi poimitut tapahtumat
5. Tallenna yksittäin tai tallenna kaikki

### Valokuva-Reseptiin

Tuo reseptejä valokuvista:

1. Siirry Ruokavalio > napauta kamerakuvaketta
2. Ota valokuva reseptistä keittokirjasta tai näytöltä
3. AI poimii: nimen, ainesosat määrillä, ohjeet
4. Käy läpi ja tallenna reseptikirjaasi

---

## PäivämääräValitsin & Muistutukset

### DatePickerModal

Kaikki päivämäärä- ja aikasyöttöt käyttävät mukautettua DatePickerModalia seuraavilla ominaisuuksilla:

- **Vieritettävä lista**: Selaa päivämäärä (365 päivää) tai aikoja (30 minuutin välein)
- **Hakupalkki**: Syötä päivämäärä (YYYY-MM-DD) tai aika (HH:MM) hypätäksesi suoraan
- **Manuaalinen päivämääräsyöttö**: Päivämäärävalitsimen alaosassa kirjoita mikä tahansa päivämäärä manuaalisesti — hyödyllinen historiallisille päivämäärille (syntymäpäivät, aiemmat rokotukset jne.)
- **Automaattinen vieritys**: Kun päivämäärä kirjoitetaan tai valitaan, lista vierittää näyttääksen sen

### dateFrom/dateTo Automaattinen synkronointi

Toiminnoille aikaväleillä (koulu, päiväkoti, terveys, eläinlääkäri):
- **dateFrom** muuttaminen päivittää automaattisesti **dateTo** vastaamaan
- **dateTo** ei aseteta koskaan ennen **dateFromia**
- Voit asettaa eri loppupäivämäärät manuaalisesti

### Muistutusvaihtoehdot

Kaikki moduulit käyttävät samoin muistutusvaihtoehtoja:

| Nimike | Minuuttia |
|--------|-----------|
| Ei | 0 |
| 30 min | 30 |
| 1 tunti | 60 |
| 2 tuntia | 120 |
| 1 päivä | 1440 |
| 1 viikko | 10080 |

Muistutukset lähetetään puhelinilmoituksina ystävällisillä nimikkeillä (ei "60 minuuttia" vaan "1 tunti").

Oletusmuistutus: **1 tunti** (60 minuuttia)
Uusien kohteiden oletusaika: **10:00–11:00**

---

## Profiili & Asetukset

Profiilivälilehti sisältää kaikki henkilökohtaiset ja perheen asetukset.

### Henkilökohtaiset asetukset

- **Nimi**: Muokkaa näyttönimeäsi
- **Puhelin**: Lisää puhelinnumerosi
- **Avatar**: Lataa profiilikuva (käytetään keskustelussa)
- **Kieli**: Valitse norjan, ruotsin, tanskan, englannin ja suomen väliltä

### Perheen hallinta

- **Luo perhe**: Aloita uusi perhe
- **Liity perheeseen**: Syötä 6-merkkinen kutsukoodi
- **Kutsu jäsen**: Luo jaettava kutsukoodi (vain järjestelmänvalvoja/omistaja)
- **Poista jäsen**: Poista joku perheestä (vain järjestelmänvalvoja/omistaja)
- **Muuta roolia**: Ylennä/alenna järjestelmänvalvojan ja jäsenen välillä (vain järjestelmänvalvoja/omistaja)
- **Lähde perheestä**: Lähde nykyisestä perheestä (vain ei-omistajat)

### Kalenterin integraatio

1. Yhdistä Google- tai Outlook-kalenterisi
2. Valitse mihin kalenteriin tapahtumat synkronoidaan
3. Kun luot tapahtumia "Lisää kalenteriin" -vaihtoehdolla, tapahtumat viedään
4. Google Calendar -synkronointi toimii kaikille toimintatyypeille: tapahtumat, koulutoiminnot, päiväkotoiminnot, terveydenajanvaraukset, eläinlääkärivierailut

### Ilmoitukset

- Ota push-ilmoitukset käyttöön/pois käytöstä
- Määritä mitkä osiot näkyvät "Min uke" -viikkoyleistävässä
- Syntymäpäivämuistutukset lähetetään automaattisesti kello 08:00 Oslon aikaa
- Toimintamuistutukset käyttävät ystävällisiä nimikkeitä (ei raakoja minuuttimääriä)

### Spond-integraatio

1. Syötä Spond-sähköpostisi ja salasanasi
2. Valitse mitä Spond-ryhmiä synkronoida
3. Kartoita Spond-jäsenet perheen jäsenille RSVP-seurantaan
4. Spond-tapahtumat ilmestytvät automaattisesti kalenteriisi

---

## Teemat

fampad tarjoaa 9 visuaalista teemaa, jotka ovat saatavilla profiiliasetuksista:

| Teema | Kuvaus |
|-------|--------|
| **Vaalea** | Puhtaan valkoinen tausta |
- **Tumma** | Silmäystävällinen iltakäyttöön
- **Järjestelmä**: Seuraa laitteesi vaalea/tumma -asetusta
- **Oranssi**: Lämmin oranssi korostus
- **Syvä sininen**: Ammattimainen syvänsininen paletti
- **Hopea**: Eleganterit hopeasävyt
- **Violetti**: Luova violettiteema
- **Vaaleanpunainen**: Kiiltävä vaaleanpunainen korostus
- **Vihreä**: Rauhoittava vihreä väriskeema

Teemasi tallennetaan ja säilyvät istuntojen välillä.

---

## Kielituki

fampad tukee 5 kieltä:

1. **Norja (Bokmål)** — Oletus
2. **Ruotsi**
3. **Tanska**
4. **Englanti**
5. **Suomi**

### Kielen vaihtaminen

1. Siirry Profiiliin
2. Vieritä "Språk" (Kieli) -kohtaan
3. Valitse haluamasi kieli
4. Käyttöliittymä päivittyy välittömästi

### Reseptin kääntäminen

Reseptit voidaan kääntää kaikille 5 kielelle:
1. Avaa resepti
2. Napauta käännöspainiketta
3. AI kääntää reseptin nimen, kuvauksen, ainesosat ja ohjeet
4. Napauta kielivälilehteä nähdäksesi sillä kielellä

---

## PWA & Asennus

### Asenna fampad

fampad on Progressive Web App (PWA), jonka voit asentaa laitteeseesi:

**iOS:ssa (Safari):**
1. Avaa fampad Safarissa
2. Napauta Jaa-painiketta (neliö nuolella)
3. Napauta "Lisää Kotivalikkoon"
4. Nimeä se ja napauta "Lisää"

**Androidissa (Chrome):**
1. Avaa fampad Chromessa
2. Napauta kolmen pisteen valikkoa
3. Napauta "Lisää Kotivalikkoon"
4. Vahvista asennus

**Tietokoneella:**
1. Etsi asennuskuvake osoitepalkista
2. Klikkaa asentaaksesi fampadin tietokonesovelluksena

### Päivitysbanneri

Kun uusi versio on saatavilla, fampad näyttää päivitysbannerin. Napauta päivittääksesi ja saadaksesi uusimman version.

---

## Vinkit & Nikkarit

### Nopea navigointi

- Käytä **+**-painiketta nopeasti luodaksesi tapahtumia, terveydenkohteita, lemmikkivierailuja, koulu-/päiväkotoimintoja tai matkoja
- Pitkä painaminen kohteilla muokkaus-/poisto-vaihtoehtoja varten
- Napauta kalenterin pisteitä kalenterinäkymässä nähdäksesi kyseisen päivän tapahtumat

### Spond-integraatio

- Yhdistä Spond nähdäksesi kaikki seuran tapahtumat perheen tapahtumien rinnalla
- RSVP suoraan fampad-sovelluksesta
- Näe mitkä perheen jäsenet osallistuvat

### Ruokavaliosuunnittelu

- Käytä AI-ehdotuksia uusien reseptien löytämiseen
- Tuo reseptejä mistä tahansa verkkosivustosta liittämällä URL:n
- Kuvaskannaa reseptejä keittokirjoista
- Luo ostoslistat viikkorruokavaliostasi

### Matkasuunnittelu

- Lisää sääennusteet määränpääsillesi
- Saä AI-generoidut määränpäävinkit ja paikalliset fraasit
- Käytä liikennevälilehtiä (lähtö/saapuminen) kiertomattoja varten
- Seuraa pakkauslistoja valintaruuduilla

### Tietoturva

- Kaikki tiedot tallennetaan perheen yksityiseen Firestore-tietokantaan
- Vain perheen jäsenet näkevät tietosi
- Kutsukoodit vanhenevat 1 tunnin jälkeen turvallisuussyistä
- Voit lähteä perheestä milloin tahansa (poistaa käyttöoikeutesi)

---

*fampad v1.0.0 — Perheesi, järjestetty.*
