# fampad — Käyttöopas

<p align="center">
  <img src="../../assets/icon.png" alt="fampad Logo" width="120" height="120" />
</p>

<p align="center"><strong>Perheen kaiken kattava järjestämisalusta</strong></p>

---

## Sisältöluettelo

1. [Aloittaminen](#aloittaminen)
2. [Navigointi yleiskatsaus](#navigoinnin-yleiskatsaus)
3. [Tapahtumat ja kalenteri](#tapahtumat-ja-kalenteri)
4. [Chat](#chat)
5. [Nopea luominen -painike (+)](#nopea-luominen-painike)
6. [AI-assistentti](#ai-assistentti)
7. [Oma viikkoni](#oma-viikkoni)
8. [Paikkamme (moduulit)](#paikkamme-moduulit)
   - [Matkamme](#matkamme)
   - [Terveys](#terveys)
   - [Koulu](#koulu)
   - [Päiväkoti](#päiväkoti)
   - [Syntymäpäivät](#syntymäpäivät)
   - [Eläimet](#eläimet)
   - [Ruokakeskus (Matsenter)](#ruokakeskus)
   - [Kotimme](#kotimme)
   - [Ostoslistat](#ostoslistat)
9. [Luonti puheella ja valokuvalla](#luonti-puheella-ja-valokuvalla)
10. [Päivämäärävalitsin ja muistutukset](#päivämäärävalitsin-ja-muistutukset)
11. [Profiili ja asetukset](#profiili-ja-asetukset)
12. [Kalenterin synkronointi](#kalenterin-synkronointi)
13. [Teemat](#teemat)
14. [Kielet](#kielet)
15. [PWA ja asennus](#pwa-ja-asennus)
16. [Vinkkejä](#vinkkejä)

---

## Aloittaminen

### Tilin luominen

1. Avaa fampad selaimessa (tai asennettuna PWA:na)
2. Rekisteröidy sähköpostilla ja salasanalla — tai kirjaudu sisään, jos sinulla on jo tili
3. Valitse kieli vaiheessa 2 tervetuloa-oppaassa (norja, ruotsi, tanska, englanti, suomi)
4. Luo tai liity perheeseen vaiheessa 3 — tai ohita ja tee se myöhemmin Profiilissa

### Perheen pystytys

Kirjautumisen jälkeen sinun täytyy luoda perhe tai liittyä olemassa olevaan:

**Vaihtoehto A: Luo uusi perhe**
1. Siirry **Profiili**-välilehdelle
2. Napauta "Opprett familie" (Luo perhe)
3. Kirjoita perheen nimi
4. Sinusta tulee perheen **omistaja**

**Vaihtoehto B: Liity olemassa olevaan perheeseen**
1. Pyydä omistajaa/ylläpitäjää luomaan kutsukoodi (Profiili > Perhe > "Inviter medlem")
2. Avaa jaettu kutsulinkki tai kirjoita 6-merkkinen koodi
3. Liityt **jäsenenä**

### Perheen roolien ymmärtäminen

| Rooli | Oikeudet |
|-------|-------------|
| **Omistaja** | Täysi hallinta. Voi hallita kaikkia jäseniä. Ei voi poistua perheestä. |
| **Admin** | Voi kutsua, poistaa jäseniä ja muuttaa rooleja. |
| **Jäsen** | Voi luoda ja muokata sisältöä. Ei voi hallita muita jäseniä. |

---

## Navigoinnin yleiskatsaus

fampad käyttää alapalkin välilehtiä, neljää välilehteä keskellä olevan "+"-painikkeen ympärillä.

| # | Välilehti | Ikon | Kuvaus |
|---|------|------|-------------|
| 1 | **Tapahtumat** (Avtaler) | Kalenteri | Yhdistetty kalenteri kaikista perheen lähteistä (manuaaliset tapahtumat, Spond, terveys, eläimet, koulu/päiväkoti, koti, syntymäpäivät) |
| 2 | **Chat** | Kupla | Perheviestit kuvilla ja reaktioilla |
| 3 | **Paikkamme** (Våre steder) | Talo | Sisäänkäynti kaikkiin moduuleihin |
| 4 | **Profiili** | Henkilö | Asetukset, perheenhallinta, integraatiot |

Keskimmäinen **+**-painike avaa **Nopea luominen** -valikon. Välilehtipalkki piiloutuu automaattisesti, kun kirjoitat chattta.

---

## Tapahtumat ja kalenteri

Tapahtumat-välilehti näyttää yhdistetyn kalenterin kaikista perheen aktiviteeteista.

### Katselu

- **Listanäkymä**: Tapahtumat ryhmiteltyinä päivittäin viikkonumerobannerilla
- **Kalenterinäkymä**: Kuukausiruudukko pisteillä per päivä — napauta päivää nähdäksesi sen
- Näytä/piilota menneet tapahtumat
- Suodata moduulin ja lähteen mukaan (mukaan lukien Spond-ryhmät logoilla)
- "**Oma viikko**" (Din uke) -painike ylhäällä avaa viikko-yhteenveton (katso oma osio)

### Tapahtumien lähteet

Tapahtumat tulevat monista lähteistä ja ovat värikoodattuja moduulin mukaan:

| Lähde | Väri |
|-------|------|
| Manuaaliset tapahtumat | #3b5a75 |
| Matkat | #7EC8E3 |
| Terveys (aikaismääräykset/lääkkeet/rokotukset) | #C67B5C |
| Koulutoiminnot ja -lomat | #6B8F71 |
| Päiväkoti-aktiviteetit | #E8836A |
| Eläimet (eläinlääkäri/rokotukset) | #9B7DB8 |
| Syntymäpäivät | #E6A817 |
| Koti (huoltoaikaasmääräykset) | #6B7B8D |
| Ateriapaikat (Ruokakeskus) | #E8906C |
| Spond-tapahtumat | Näytetään ryhmälogolla |

### Tapahtuman luominen

1. Napauta **+** → "Manuelt" → "Avtale" (Tapahtuma)
2. Täytä:
   - **Otsikko** (pakollinen)
   - **Päivämäärä** ja valinnainen loppupäivä
   - **Aika** ja valinnainen loppuaika
   - **Osoite** (Google Places-haku)
   - **Ikoni** (20 esiasetettua, esim. Middag (middag), Bursdag (syntymäpäivä), Sport, Kino (elokuvat), Trening, Fjelltur (vuoristovaellus))
   - **Henkilöt** (valitse perheenjäsenet)
   - **Kuvaus** (valinnaiset muistiinpanot)
   - **Muistutus** (Ingen (ei mikään), 30 min, 1 tunti, 2 tuntia, 1 päivä, 1 viikko)
   - **Toisto** (ajoita päivät/viikot, pariton ja parillinen viikko — esim. "joka toinen viikko")
   - **Asiakirjat** (lataa liitteet)
3. Napauta "Lagre" (Tallenna)

### Tapahtuman tiedot

Napauta tapahtumaa nähdäksesi:
- Täydellinen päivämäärä, aika ja paikka
- Staattinen kartta + "Avaa Google Maps" (kun osoite on olemassa)
- Muistiinpanot, asiakirjat, ikoni ja tapahtumaan linkitetyt henkilöt
- "Lisää Google/Outlook-kalenteriin" -painikkeet (web)
- Muokkaa/poista pitkällä painalluksella (ActionModal)
- Spond-tapahtumat: vastaajastatus-merkit (hyväksytty/kielletty/ei vastausta, sisl. lapset) ja mahdollisuus muuttaa omaa vastaustasi

### Spond-tapahtumat

Jos olet yhdistänyt Spondin Profil-asetuksissa:
- Spond-tapahtumat valituista ryhmistäsi näkyvät automaattisesti
- Näet vastausstatuksen perheenjäsenille
- Napauta tapahtumaa nähdäksesi yksityiskohtia ja muuttamaan omaa vastaustasi
- Ryhmälogot ladataan Profiilissa (custom logo yryhmää kohden)
- Spond-synkronointi suoritetaan automaattisesti 30 minuutin välein

---

## Chat

Chat-välilehti tarjoaa reaaliaikaiset perheviestit.

### Viestien lähettäminen

1. Kirjoita viestisi (max 500 merkkiä)
2. Napauta lähetä-painiketta

### Kuvien jakaminen

1. Napauta kuvikon tekstikentän vieressä
2. Valitse kirjastosta tai ota kuva
3. Esikatsele kuva
4. Lähetä — kuva ladataan Firebase Storageen

### Reaktiot

- Napauta "+"-painiketta viestin vieressä avataksesi reaktiivalitsimen
- Käytettävissä olevat reaktiot: Like 👍, Smile 😊, Heart ❤️
- Määrät näytetään reaktioittain; napauta reaktiobadgea like/unlike
- Omat reaktiosi ovat korostettuja

### Toiminnot

- Reaaliaikaiset päivitykset Fireston kautta
- Päivityserottimet ("I dag" / "Eilen") viestiryhmien välillä
- Avatarit viestien vieressä
- Viimeiset 100 viestiä ladataan, max 500 merkkiä messia kohti
- Muut perheenjäsenet saavat push-ilmoituksen (Cloud Function `notifyNewChatMessage`)
- Napauta kuvia koko näytön katselemiseen
- Välilehtipalkki piiloutuu, kun chat-näppäimistö on aktiivinen

---

## Nopea luominen -painike (+)

Keskimmäinen "+"-painike avaa Nopea luominen -valikon kahdella vaiheella:

**Vaihe 1: Valitse menetelmä**
- ✏️ **Manuaalinen** — tavallinen lomake
- 🎤 **Ääni** — kop puhettasi; AI konvertoi kohteeksi valitussa moduulissa
- 📷 **Kuva** — ota/valitse kirjastosta; AI poimii tiedot kuvista

**Vaihe 2: Valitse moduuli**
1. **Tapahtuma** (manuaaliset kalenteritapahtumat)
2. **Terveysaika**
3. **Eläinlääkärivierailu**
4. **Kouluaktiviteetti**
5. **Päiväkotiaktiviteetti**
6. **Huoltoaika** (koti)
7. **Matka**

AI-assistentti-rivi löytyy Nopea luominen -valikon ylhäältä — katso seuraava osio.

---

## AI-assistentti

AI-assistentti on keskustelupohjainen apuri sovelluksessa (Nopea luominen -valikon ylhäällä). Se voi:
- Vastata kysymyksiin (esim. "Mitä tapahtuu keskiviikkona?")
- Ohjata sinut näytöille (terveys, eläimet, koulu, päiväkoti, koti, tapahtumat, matkat)
- Suorittaa toimintoja vahvistuksesi jälkeen (esim. "Luo terveysaika tiistai kello 10" → vahvista → luotu)
- Mikrofonikuvikon kautta: kop puhettasi, joka transkribersoidaan ja lähetetään assistentille
- Korjata vastauksia: voit kirjoittaa korjauksen, jos assistenti vastaa väärin

---

## Oma viikkoni

"Oma viikko" (Din uke) näyttää kaiken, mitä tapahtuu tällä viikolla yhdessä näkymässä.

### Avaaminen

1. Siirry **Tapahtumat**-välilehdelle
2. Napauta "Din uke" -painiketta ylhäällä

### Mitä näytetään

- Yhteenveto-otsikko viikkonumerolla ja päivämääräajalla
- Päivä kortti sДДllikkiin kotiosoitteellesi
- Tilastopillit (määrät tapahtumia, matkoja, koulu-/päiväkotiaktiviteetteja)
- Kronologinen päiväagenda, joka yhdistää kaikki lähteet: tapahtumat, Spond, matkat (sisl. kuljetukset/hotellit/ravintolat), terveysajat, lääkkeet, rokotukset, eläinlääkärivierailut ja -rokotukset, koulu/päiväkoti (aktiviteetit ja lomat), syntymäpäivät, kotipalvelut ja viikkomenut-ajat

### Mukauttaminen

Profiili → "Min uke" (Minä viikko) -kohdassa:
- **Viikkomenu**: näytä/piilota aterioiden osio Oma viikkossa
- **Ruokakeskus-asetukset** (Frokost (aamiainen) 🥞 / Lunsj (lounas) 🥪 / Middag (middag) 🍽️) ohjaavat, mitkä ateriat näytetään ja lasketaan

---

## Paikkamme (moduulit)

Kaikki moduulit löytyvät **Paikkamme**-välilehdeltä. Jokainen kortti näyttää ikonin, nimen ja kohteiden määrän.

| Moduuli | Väri |
|-------|-------|
| Matkamme | #7EC8E3 |
| Terveys | #C67B5C |
| Koulu | #6B8F71 |
| Päiväkoti | #E8836A |
| Syntymäpäivät | #E6A817 |
| Eläimet | #9B7DB8 |
| Ruokakeskus | #E8906C |
| Kotimme | #6B7B8D |

### Matkamme

Suunnittele ja järjestä perheen matkat:

- **Matka yleiskatsaus**: matkat kaupungin, maan, päivämäärien, aikojen ja perh enjäsenien (pakolliset) kanssa; matkakortit näyttävät staattisen kartan ja sää-pillen kaupunkia kohden
- **Sää**: 10 päivän sääennuste + tunneittain (aamiainen/lounas/iltapäivä/ilta/yö) ensimmäinen päivä lämpötilalla, UV-indeksilla, sateen todennäköisyydellä, tuulella; historialliset keskiarvot tuleville matkoille; sivuttaminen ja päivitys
- **Valuuttakalkulaattori**: livekurssit (Frankfurter API), maa→valuutta autovaalinta, vaihda suunta
- **Kuljetus**: lennot, junat, vuokrausauto (vuokrausauto), vene (vene), ferje (färja) ja tak si omalla lomakkeella tyyppiä kohden (lentokenttä/terminaali, lentonr., varausnr., istuin, vaunu, kuljettaja, reg.nr.) ja lähtö/palu-välilehdillä "En vei"-kytkimellä; kuljetustiedot tukevat karttoja ja linkkejä yhtiöihin (Norwegian, SAS, Vy, Hertz ym.)
- **Hotellit, ravintolat, aktiviteetit**: lomakkeet päivämäärä/ajalle, osoitteelle (Google Maps) ja muistiinpanoille
- **Pakkauslistat**: ruksittavat pakkauslistat, uudelleennimeä, kopioi lista, poista
- **Asiakirjat**: lataa ja säilytä matka-asiakirjat
- **Hyödylliset linkit**: tallenna linkit favicon-esikatseluilla
- **Kohteiden vinkit (AI)**: AI:n generoimat vinkit kaupunkia kohden (tehtävää, ravintolat, paikalisfraasit, varoitukset)

**Kuljetuslomake**: jokainen kulkuneuvo (fly/tog/bil/båt/ferje/taxi) käyttää kaksoislomekketta **Utreise/Hjemreise**-välilehdillä ja "En vei"-kytkimellä, joka piilottaa paluumatkan.

### Terveys

Pidä kirjaa perheen terveydestä:

- **Aikataulut (ajat)**: päivämäärä, kelloaika, lääkärin nimi, osoite/kartta, muistiinpanot
  - **Henkilö**: valitse perheenjäseneen (useampikin voi valita)
  - **Muistutukset**: ystävälliset etiketit (30 min, 1 tunti, 2 tuntia, 1 päivä, 1 viikko)
- **Lääkkeet**: nimi, vahvuus/dos, frekvenssi (1–4× päivässä) erillisilla ajoilla per paikka ja omat muistutusajat per aika
- **Rokotukset**: päivämäärä ja seuraava erääntymispäivä
- **Allergiat**: vaikeusaste (lievä/maltillinen/vakava)
- **Kasvu**: kirjaa pituus ja paino ajan yli
- Henkilövalitsin: kaikki kohteet voi omist familjemCBäsenille
- Asiakirjat voi ladata
- Aikaismääräykset paikalla näyttävät kartan, joka avaa Google Mapsin
- Merkit: "I dag" (Tänään), "Om N dager" (N päivän kuluttua)
- Kaikki uudet pushataan perheelle (Cloud Function `notifyHealthItem`)
- Puhe/kuvament oluonti toimii myös terveysajoille

### Koulu

Järjestä koulutietoja lasta kohden:

- **Lapset**: lisää lapsia koulun nimen, luokka-asteen ja yhteyden tietojen kanssa
- **Vuosi-välilehdet**: luo/muokkaa/poista kouluvuodet
- **Ruudut**: Yhteyshenkilöt, Aikataulu, Aktiviteetit, Lomat
- **Yhteyshenkilöt**: opettajat, terveys henkilökunta (rehtori ym.), luokkatoverit puhelin/sähköposti/vanh ementiedolla — suorat soita/sähköposti-painikkeet
- **Aikataulu**: per lukukausi, päivä/aika/ainede/ope taja
- **Aktiviteetit**: tur (retki)/aktiviteetti (aktiviteetti)/møte (kokous) päivämääräjakson, muistutuksen, a siakirjojen, kuvien ja Google-kalenterisy nsyn kanssa
- **Lomat**: manuaalinen, AI-tuonti valokuvasta tai tuonti URL-osoitteesta (kouluweb sivulta)
- **AI-tuonti**: valokuva yhteyslistasta tai lomalistasta → AI poimii → valitse/kumoa valinta kaikki → tallenna
- Aktiviteetit toisto tukevat ryhmäkoPIOntia

### Päiväkoti

Sama toimintojoukko kuin Koulu, mutta päivähoito osalta (lapset, yhteys henkilöt, aikataulu, aktiviteetit, lomat, AI-tuonti).

### Syntymäpäivät

Älä koskaan unohda syntymäpäivää:

- **Syntymäpäivalista**: nimi + päivämäärä, laskurilla ("I dag" (Tänään) / "Om N dager" (N päivän kuluttua)) ja iällä
- **Lahja ideat**: syntymäpäivän mukaan — lisää lahjoja, rUKS hankitut, näytä edellisten vuosien lahjat
- **Ilmoitukset**: push 7 päivää ennen ja päivänä (klo 08:00 paikallista aikaa)
- Maksimi 50 syntymäpäivää

### Eläimet

Hallitse eläinhoitoa:

- **Eläimet**: nimi, tyyppi (kissa, koira, kala, lintu, kaniini, kilpikonna, hamst eri, hevonen, muu), sukupuoli, rotu, syntymäpäivä, ID-numero, passi, siru-ID + sirupäivä, kuva
- **Eläinlääkärivierailut**: päivämäärä, eläinlääkäri, paikka (kartta), muistutus, asiakirjat
- **Lääkkeet**: nimi, dos, frekvenssi
- **Ruokinta**: määrä/tyyppi
- **Hoito**: viimeksi tehty / seuraava
- **Rokotukset**: päivämäärä + seuraava erääntymispäivä
- **Vakuutus**: yhtiö, polises numero, voimassaolo loppupäivä, asiakirja
- Puhe/kuvament luonti toimii myös täällä

### Ruokakeskus (Matsenter)

Suunnittele perheen ateriat kolmella alavälilehdellä:

- **Viikkomenu**: menu ma–suntu, aamiainen/lounas/middag-ajat profilestasi; osoita reseptejä ajoiille; navigoi viikkoja; "Kopioi viime viikolta"; "Takaisin nykyiseen viikkoon"; satunnaiset ehdottukset("Tällä viikolla…")
- **Reseptit**: kerää reseptejä (max 200) kategorioilla (suosikit ❤️, kana, liha, kala, vegetar (vegetar), pasta, gryte (uunipato), suppe (keitto), frokost (aamiainen), sott (jälkiruoka)); hki; AI-resepti haku 22 kielellä; tuonti URL:sta; kuva→resepti (OCR); aika/annokset/muoto/keittö maalipflagilla; automaattinen kaloriarvio (AI), jos ei annettu
- **Ostoslista**: reaaliaikainen ruksittava ostos lista; kopioi, uudelleennimeä, poista — tuotteet voidaan lisätä suoraan reseptistä (aineosat)

### Ostoslistat

- Luo ja hallitse ruksittavia ostoslistoja (max 100)
- Tuotteet voi ruksusi pois/päälle
- Uudelleennimeä, kupioi, poista listoja
- Tuotteet voidaan lisätä suoraan resepteistä Ruokakesk uksesta

### Kotimme

Hallitse kotia ja mökkejä:

- **Koti**: tyyppi (talo, sommerhytte (kesämökki), vinterhytte (tal vimökki), leilighet (asunto)), osoite (Google Places), postinumero/paikka, kuvaus, kuva, staattinen kartta
- **Ohjeet**: "Komme hjem" (kotia)- ja "Forlate hjem" (jättää kotiin)-osiot kuvien skannauksella (OCR poimii ohje tekstit ja väri etiketit)
- **Vedlikehold (huolto) sopimukset Serviceavtale**: päivämäärä/aika/frekvenssi (kerran/kaksi kertaa kuukaudessakvartaaleittain/ikävuosittain)， toisto (päivät/viikot), kalenterisynk + push perheelle
- **Fargekoder (värikoodit)**: valokuvasetikisesti seinästä → AI poimii nimen/koodin/heksan; margumentti, huone
- **Prosjekter (projektit)**: status (aktiivinen/odottaa/valmis), budjetti (budjetti/kulutettu/jäljellä), värikoodit OCR llä, sisäiset ostoslistat (nimi, määrä, yksikköhinta, lösummat kokoinoSSAjat), tarjoukset (toimittaja, hinta, kuvit-OCR), tehtävät (tehdä/meneillään/valmis), "K quits yhdistä ostoslistaan", AI-ehdotukset projektiteehtäville ja projekti analyyseille

---

## Luonti puheella ja valokuvalla

### Puhe → kohde

Luo kohteita puhumalla:

1. Napauta **+** → "Tale" → valitse moduuli
2. Napauta mikrofoni aloitaaskesi kopat
3. Puhu natuurisesti, esim. "KokousFUupäiväkodin kanssa keskiviikkona kello 14"
4. Napauta stopp
5. AI transkribersoi ja poimii: otsikko, päivämäärä (ymmärtää "i morgen" ("huomenna"), "på mandag" ("maanantina")), aika (ymmärtää "halv tre" ("puoli kolme"), "kvart over to" ("vartia yli kaksi")), kuvaus
6. Tarkista ja muokkaa
7. Tallenna — tapahtumat lisätään myös puhel kesti kalenteriin ja pushataan perheelle

Toimii kohteille: Tapahtuma, Terveysaika, Eläinlääkärivierailu, Kouluaktiviteetti, Päiväkotiaktiviteetti, Huoltoaika (koti), Matka.

### Kuva → kohde

1. Napauta **+** → "Foto" → valitse moduuli
2. Ota kuva tai valitse kirjastosta
3. AI poimii kaikki näkyvät kohteet otsikoilla, päivämääriillä ja aijoilla
4. Tarkista, muokkaa, valitse säilytettävät
5. Tallenna yksi kerrallaan tai kaikki kerralla

### Kuva → resepti

1. Ruokakeskus → kameraikoni
2. Kuva reseptistä kokkirasta tai näytöltä
3. AI poimii nimen, aineosat määrineen, ohjeet
4. Tallenna reseptikirjaan

---

## Päivämäärävalitsin ja muistutukset

### DatePickerModal

Kaikki päivämäärä-/ajaikentät käyttävät mukautettua valitsinta:

- **Skrollavlista**: päivämääräehdotuksia (760 päivää) tai aikoja (30-min-intervallit)
- **Hakukentä**: kirjoita päivämäärä (YYYY-MM-DD) tai aika (HH:MM) hypätäksesi suoraan
- **Manua alinen syöttö**: kirjoita meillä tahansa päivämäärä — hyödyllistä historiallisille päivämäärille (syntymäpäivät, aiemmat rokotukset)
- **Auto-scroll**: lista scrol rautuu valittuun/kirjoitettuun päivään

### dateFrom/dateTo auto-synk

Aktiviteeteille päivämääräjaksoilla (koulu, päiväkoti, terveys, eläin):
- **dateFrom** muutos päivittää **dateTo** automaattisesti
- **dateTo** soa valoa koskaan ennen **dateFrom**
- Voit asettaa toisen loppupäivän manuaalisesti

### Muistutusvaihtoehdot

| Etiket | Minuutteja |
|--------|----------|
| Ingen (Ei mikään) | 0 |
| 30 min | 30 |
| 1 tunti | 60 |
| 2 tuntia | 120 |
| 1 päivä | 1440 |
| 1 viikko | 10080 |

Muistutukset lähetetään puhelinilmoituksina ystäväll isillä etiketeillä. Ojitus: **1 tunti**. Oletusaika uusille kohteille: **10:00–11:00**.

Lääkkeet tukevat erillisiä aikoja yk sien per (1–4× päivässä) omilla muistutusajoilla per ajankohta.

---

## Profiili ja asetukset

Profiili-välilehti sisältää kaikki henkilo kohtaiset ja perheen asetukset.

### Henkilökohtaiset

- **Nimi**: muokka näyttönimeä
- **Puhelin**: lisää puhelinnumero
- **Avatar**: lataa profiilikuva (käytt chatissa)
- **Sähköposti**: (vain luettavissa)

### Perhe

- **Perhe kortti**: näytä jäsenet ja roolit
- **Kutsu jäsen**: luokutsukoodi (voimassa 1 tunti, kertakäyt tö) / jaa linkki
- **Muuta rooli**: ylenennä alasennä adminin ja jäsenen välillä (omistaja/admin)
- **Poista jäsen** (omistaja/admin)
- **Poistu perheestä** (ei-omistajat)
- **Luo perhe**, jos sinulla ei ma

### Kalenteri

- **Kalenterityyppi": valitse **puhelin kalenteri*** tai **Google-kalenteri**
- **Google-yhdistämine ": OAuth yhdistämine ("Kitteturnousto ✓")void katkaisu
- **Google Sync paneeli**: Suorita/Dry-run yhteenvedolla (skannattu, luotu, skippedExists (oli jo), uudelleenluotu, epäonnistunut, ei yhteyttä) ja ongelmalista
- **Puhelinkale nteri**: iOS (expo-calendarin kautta) luo tapahtumia puhelkesti kalenteriin
- Web: "Lisää Google/Outlook-kalenteriin" -painikkeet kohteelle

### Ilmoitukset

- S kytkä push-ilmoitukset päälle/pois (lupa pyydetään)
- Lääkemuistutukset per ajankohta, syntymäpäiväilmoitukset (7 päivää ennen + päivänä, klo 08:00 paikallista), aktiviteetimuistutukset
- Web: näyttää bannerin viimeisten 7 päivän aikananeathart retille muistutuksille (voidaan hylätä)

### Oma viikko

- Näyt/piilota "Viikkomenu"-osio (ateriat) Oma viikko -nä kymässä
- Ruokakeskus-kytkimet: Frokost 🥞 / Lunsj 🥪 / Middag 🍽️

### Ruokakeskus

- Kytketytt: Frokost 🥞 / Lunsj 🥪 / Middag 🍽️
- Ohjaavat viikkomenu sta ja "Oma viikko"

### Spond (omistja/admin)

1. Kirjoita Spond sähköposti ja salasana (salattu tallennettuna)
2. Valitse, mitkä ryhmät synkisoidaan
3. Lataa/valitse logo y rymäad kohden (kirjasto tai kamera)
4. Valhetse, kenet voivat vastata ("vastaajat")
5. Spond-tapahtumat näkyvät automaattisesti kalenterissa (synk 30 min välein)
6. Poista Spond tilin yhdistys

### Teema

Kat sosi [ Teemat](#teemat) -osion yksityiskohdolle. (katso oma osio)

### Kieli

Katso [Kielet](#kielet) -osio.

### App (vain webb / web)

- "Last inn på nytt" (Lataa uudelleen) — poista service workers ja välimuisti päivittää

---

## Kalenterin synkronointi

fampad tukee kaksisuuntaista kalenterisynkronointia:

**Google Kalenteri (Cloud Functionien kautta)**: Tapahtumat, matkat, kuljetus, lääkkeet, terveysajat, eläinlääkärivierailut, koulu-/päiväkotiaktiviteetit, kotihuolto-ajat — luonti, päivittä ja poisto synkronoidaan automaattisesti käyttäjille, jotka ovat yhdistäneet Google-kalenterin.

**Puhelin kalenteri**: iOS-sovellus voi luoda tapahtumia suoraan puhelimen kalenteriin (valitse puhelinkalenteri Profiilissa). Web-käyttäjät käyttävät "Lisää Google/Outlook"-painikkeita.

**Backfill (taytonnus)**: Suorita manuaalinen synkronisaatio olemassaolevasta datasta Google Sync paneelista (Dry-run näyttää, mikä tapahtuisi).

---

## Teemat

fampad tarjoaa joustavan teemaminen Profiili-asetukset via:

**Rivi 1 — Moduuliväri s** (muuttaa sovelluksen aksentin moduulin väriin):
- Koulu (#6B8F71), Päiväkoti (#E8836A), Matkat (#7EC8E3), Syntymäpäivät (#E6A817), Eläimet (#9B7DB8), Ateriat (#E8906C), Terveys (#C67B5C)

**Rivi 2 — App-värit**:
- Slategray (siniharmaa, #3b5a75), Dustyrose (hämärärosa, #A37B85)

**Rivi 3 — Tumma tila**:
- Tumma (#333)-kytkin

Vä ri/Tumma/Järjestelmä noudattaa laitteen vaalea/tumma asetusta, kun"järjestelmä"on valittu. Teema ensisijaisuus tallennetaan ja säilyy istuntojen välillä.

---

## Kielet

fampad tukee 5 käyttöliittymäkieltä:

1. **Norsk (Bokmål) (norja)** — oletus
2. **Svenska (ruotsi)**
3. **Dansk (tanska)**
4. **English (englanti)**
5. **Suomi**

### Vaihda kieli

1. Siirry Profiiliin
2. Vieritä "Språk" (Kieli) -kohtaan
3. Valitse kieli lip-painikkeilla
4. Koko käyttöliittymä päivittyy välittömästi

### Reseptihaku ja käännös

- AI-reseptihaku tukee 17+ AI-hakukieltä ja 22 kieltä (sisl. 5 käyttöliittymäkieltä)
- Reseptit voidaan kääntää kaikkiin 5 kieleen (nimi, kuvaus, aineosat, ohjeet)

---

## PWA ja asennus

### Asenna fampad

fampad on Progressive Web App (PWA):

**iOS (Safari):**
1. Avaa fampad Safarin
2. Napauta Jaa-painiketta
3. "Lisää kotinäytölle"
4. Vahvista

**Android (Chrome):**
1. Avaa fampad Chromessa
2. Napauta kolmen pisteen menu
3. "Lisää kotinäytölle"
4. Vahvista

**Desktop:**
1. Etsi asennuskuvake osoitepalkissa
2. Napauta asentaak sertin

### Päivitysbanneri

Kun uusi versio on saatavilla, näytetään banneri ("Uusi versio saat avissa") — napauta ladataksesi. Tarkistus 5 minuutin välein. Web: "Lataa uudelleen" Profiilissa poistaa cache/service workers manuaalisti.

---

## Vinkkejä

### Nopea navigointi

- Käytä **+**-painiketta nopeaan luomiseen tapahtumia, terveysaikoja, eläinlääkärivierailuja, aktiviteeteja, huolto aikoja tai matkoja
- Pitkäpainallus kohdte muokkaa/poista -valikolla
- Napauta kalenteripäiviä nähdäksesi päivän tapahtumat
- Käytä AI-assistenttia + -valikosta luonnollisiinkysymyksin ja toimiin

### Spond

- Yhdistä Spond nähdäksesi seurojen tapahtumat perheen tapahtumien rinnalla
- Vastaa kuts.userInteractionEnableduihin suoraan sovelluksessa (hyväksy/hylkää), sisl. lapsille
- Näytä, kuka tulee tapahtumaan (merkkien tilan perusteella)
- Spond-logot näkyvät tapahtumissa ja suodatinpaneelissa

### Aterioidensuunnittelu

- Hyödynnä AI-ehdotuksia uusien reseptien löytämiseen
- Tuo URL:sta tai valokuvasta
- Luo ostoslista suoraan reseptin aineosista
- Suunnittele viikkomenut aamiainen/lounas/middag-ajalla; "Kopioi viime viikolta"
- Kalorit arvioidaan automaattisesti AI:lla, jos ei annettu

### Matkosuunnittelu

- Sää: 10 päivän ennuste + tunneittainen + historiallinen tieto kaupunkia kohden
- AI-matkapäätteen vinkit: kohteita, ravintoloita, fraaseja, varoituksia
- Valuuttakalkulaattori reaaliaikaisin kurssein
- Kuljetus Utreise/Hjemreise-välilehdillä ja "En vei"-kytkimellä
- Pakkauslistat ruksibokseilla
- Spond-logot näkyvät tapahtumissa ja suodatinpaneelissa

### Tietoturva

- Kaikki tiedot tallennetaan perheen omiin arkistointeihin
- Vain perheen jäsenet näkevät tiedot
- Kutsukoodit vanhenevat tunnin kuluttua ja niitä voi käyttää vain kerran
- Voit jättää perheen milloin tahansa (poistaa pääsynsi)

---

*fampad v1.0.0 — Perheesi, järjestettynä.*
