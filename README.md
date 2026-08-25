# 🍃 Çay Vadisi — Teetal am Schwarzen Meer

Ein First-Person-Farm- und Management-Spiel im Browser: Du führst einen
Teegarten an der türkischen Schwarzmeerküste (Karadeniz). Pflücke frische
Triebe nach der echten Regel **„iki yaprak bir tomurcuk"** (zwei Blätter, eine
Knospe), stelle Arbeiter ein, baue Gemüse an, halte Tiere, verkaufe auf dem
Wochenmarkt — und arbeite dich vom Teepflücker zum **Çay-Baron** hoch, mit
Traktor, Pickup und am Ende dem Sportwagen mit Goldfelgen.

Gebaut mit **three.js** (Vanilla, kein Framework, kein Build-Schritt).
Komplett zweisprachig: **Deutsch / Türkçe**. Spielbar am Desktop **und am
Smartphone** (virtueller Joystick, Touch-Pedale).

![Abendstimmung an der Annahmestelle](docs/screenshot_abend.jpg)

| | |
| --- | --- |
| ![Teefeld](docs/screenshot_feld.jpg) | ![Arbeiter im Feld](docs/screenshot_arbeiter.jpg) |
| ![Tiergehege](docs/screenshot_tiere.jpg) | ![Mit dem Sportwagen in die Stadt](docs/screenshot_stadt.jpg) |

## Spielen

Beliebigen statischen Webserver im Projektordner starten, z. B.:

```bash
python -m http.server 8137
```

Dann `http://localhost:8137` öffnen. Kein Build, keine externen CDNs —
alles liegt im Repo (offline lauffähig, direkt hostbar auf jedem Webspace).

## Steuerung

| Eingabe | Aktion |
| --- | --- |
| `W A S D` | Laufen / Fahren |
| Maus | Umsehen (Klick ins Bild aktiviert Mauslock) |
| Linksklick **halten** | Tee pflücken |
| `E` | Benutzen: Verkaufen, Schlafen, Seilbahn, Ein-/Aussteigen, Ernten, Hof/Markt/Autohaus |
| `Tab` | Betriebs-Panel (Arbeiter · Lager · Bilanz) |
| `P` | Privatleben (Profil · Familie · Immobilien · Börse) |
| `M` | Minimap ein/aus |
| `N` | 📱 ÇayFon-Telefon (Wetter · Taxi · Bank · Dekrete …) |
| `V` | First-/Third-Person-Ansicht |
| `H` | Hupe (im Fahrzeug) |
| `Leertaste` | Handbremse / Drift (im Fahrzeug) |
| `F` | Foto-Modus (`C` = Foto speichern) |
| `R` | Radio (im Fahrzeug/Boot) |
| 🎮 | Gamepad: Sticks bewegen/umsehen, Trigger Gas/Bremse, A benutzen, Y Ansicht |
| `Shift` | Rennen |
| `Esc` | Pause |

Touch-Geräte: virtueller Joystick links = Laufen, Ziehen rechts = Umsehen,
Finger auf Busch halten = Pflücken, Aktions-Prompt antippen = Benutzen.
Im Fahrzeug: Joystick lenkt, ▲/▼-Pedale geben Gas und bremsen.

## Spielmechanik

### Teegarten
- **Wachstum:** Triebe sprießen über den Tag; nach **Regen** doppelt so schnell.
- **Qualität:** Frische Triebe = voller Preis (★). Wer zu lange wartet, pflückt
  überständige Blätter (weniger wert). Bei Regen gepflückt = leichter Abschlag.
- **Tagesauftrag:** Jeden Tag ein Liefer-Ziel mit Bonus.
- **Ausrüstung:** größere Körbe, Teeschere, Gummistiefel, Dünger, Teleferik.

### Betrieb & Management (v2)
- **Arbeiter:** Bis zu 6 Pflücker anstellen — sie ernten selbstständig, abends
  wird ihr Tee verkauft und der Lohn gezahlt. Der **Vorarbeiter** macht sie schneller.
- **Bauernhof (Westen):** 12 Beete für Mais, Tomaten, Schwarzkohl und
  **Haselnuss**; Tiergehege mit Hühnern (Eier), Kühen (Milch) und Schafen (Wolle) —
  Produkte entstehen über Nacht.
- **Stadt (Osten):** Wochenmarkt mit **täglich schwankenden Preisen** (verkaufe,
  wenn der Kurs gut steht!) und Autohaus.
- **Fahrzeuge:** Traktor, Pickup, Limousine, Sportwagen — echtes Fahren mit
  Chase-Kamera, Scheinwerfern bei Nacht und Motorsound. Steht Traktor oder
  Pickup in der Nähe, wächst dein Pflückkorb (Ladefläche ×3 / Anhänger ×5).
- **Automatisierung:** Teleferik, Bewässerung (Ernten reifen schneller),
  **Silo** (Lager wird abends automatisch verkauft).
- **Wohlstand:** Nettovermögen bestimmt deinen Rang — vom *Teepflücker* über
  den *Hofbesitzer* bis zur *Legende vom Karadeniz*.

### Reisen & Imperium (v3)
- **İskele-Reisen:** Vom Bootssteg aus nach **Zonguldak** (billige Kohle),
  **Kdz. Ereğli** (Osmanlı-Erdbeer-Setzlinge) und **Devrek** (Baston mit
  +8 % Tempo, Walnuss-Setzlinge). Jede Stadt zahlt Premium-Preise für
  passende Waren — Reisezeit kostet Tagesstunden.
- **Çay-Fabrik:** Verpackt die Arbeiter-Ernte abends automatisch zu Paketen
  unter **deinem eigenen Label** (Name frei wählbar). Energie kommt aus
  Zonguldak-Kohle oder von der Stromrechnung.
- **Begehbarer Supermarkt:** Dein Label steht sichtbar im Regal; verkaufe
  Pakete zum Tages-Einzelhandelspreis.
- **Export:** Täglich neue Aufträge nach 🇩🇪 🇳🇱 🇦🇿 🇯🇵 🇺🇸 mit Großabnehmer-Preisen.

### Privatleben (v3)
- **Profil [P]:** Name, Label, Outfit-Farbe.
- **Familie:** Hochzeit und Nachwuchs geben dauerhafte Verkaufsboni.
- **Immobilien:** Yayla-Hütte, Stadthaus, Villa am Meer — Miete jeden Abend.
- **Börse:** Drei Aktien mit Tageskursen (kaufen, halten, verkaufen).
- **Kaçak çay:** Nachts hinterm Markt wartet ein Schwarzhändler: +60 %
  steuerfrei — aber die Jandarma kontrolliert, beschlagnahmt und kassiert
  Bußgelder. Jeder Deal erhöht den Fahndungsdruck.

### Action, Rollen & Alltag (v4)
- **Third-Person-Ansicht [V]:** Sieh deinen Avatar (mit Outfit-Farbe und
  Rollen-Kleidung) über die Schulter.
- **Rollen:** Çaycı, Profi-Pflücker (+15 % Pflücktempo) oder Jandarma
  (Staatsgehalt, aber kein Schwarzmarkt).
- **Flughafen:** Cessna-Flüge nach **İstanbul** (Kapalıçarşı zahlt Spitzenpreise)
  und **Almanya** — die klassische **Gurbetçi-Schicht**: der Resttag ist weg,
  dafür kommt dicker Euro-Lohn zurück.
- **Nachbarn Temel & Dursun:** Zufallsereignisse mit Entscheidungen —
  Grenzstreit, İmece-Erntehilfe, ausgebüxte Ziegen und Schafe,
  Gurbetçi-Besuch mit BMW.
- **Hausausbau:** Anbau → Obergeschoss → Sat-Schüssel, sichtbar am Haus,
  jeweils mit Bonus.
- **Survival-Modus** (optional beim Start): Hunger & Energie managen —
  Simit, Pide und Çay kaufen, sonst wirst du langsam.
- **Quatsch & Action:** Hupe [H], Handbremsen-Drift [Leertaste] mit
  Reifenquietschen — und ein **echter CC0-Fußball** am Stadtplatz, den du
  (auch mit dem Auto!) durch die Gegend kicken kannst.
- **Echte Fotoscan-Modelle** (Poly Haven, CC0): Fußball, Fässer,
  Çayevi-Terrasse mit Holztisch, Stühlen und Messing-Teekanne.

### Jahreszeiten, Meer & Geschichte (v5)
- **Jahreszeiten:** Alle 7 Tage wechselt die Saison — goldener Herbst,
  **Winter mit Schneedecke und Schneefall** (der Tee ruht, die Pflücker
  pausieren ohne Lohn), Frühling mit Wachstumsschub.
- **Wetter mit Zähnen:** Fırtına-Stürme beschädigen reife Triebe,
  Morgennebel hängt bis 10 Uhr überm Tal, nach dem Regen spannt sich ein
  **Regenbogen** über die Berge.
- **Boot & Angeln:** Motorboot am Steg kaufen, aufs Schwarze Meer rausfahren,
  Olta auswerfen und beim Biss rechtzeitig einholen — Hamsi, Lüfer und mit
  Glück ein teurer Kalkan.
- **Dede-Çayı:** Eine Questlinie in 5 Kapiteln um das geheime Rezept deines
  Großvaters — vom Brief bis zum goldenen Samowar (permanent +10 % Teepreis).
- **16 Erfolge** mit Pokalen auf dem Trophäenregal am Haus.
- **Kemal Ağa:** Der rivalisierende Teebaron kämpft mit Preisdumping um die
  Supermarkt-Regale — erobere 60 % Marktanteil und werde Çay-König.
- **Foto-Modus [F]:** freie Kamera ohne HUD, [C] speichert ein PNG.
- **Gamepad-Support** und **Spielstand-Export/-Import** als Datei.

### Wirtschaft, Alltag & Teilen (v6)
- **🌐 Deployment:** bewusst **kein GitHub Pages** (Repo bleibt privat).
  Geplant ist eine **Subdomain auf nesbun.de** — einfach alle Dateien 1:1 auf
  statisches Hosting laden (kein Build-Schritt nötig). Das **PIN-Gate**
  (Standard-Code: `cay1453`, änderbar in `js/gate.js`) ist auf `*.nesbun.de`
  bereits aktiv; localhost bleibt offen.
- **📱 PWA:** „Zum Startbildschirm hinzufügen" — läuft dank Service Worker
  komplett offline wie eine echte App.
- **📻 Autoradio [R]:** Prozedural erzeugte Musik im Fahrzeug — Radyo
  Karadeniz (Kemençe-Stil im 7/8-Gefühl) und Arabesk FM, ganz ohne Audiodateien.
- **🏦 Bank:** Kredite mit Tageszins und **Fırtına-Versicherung**, die
  Sturmschäden komplett abdeckt.
- **🎲 Zar-Abend im Çayevi:** Würfelduell gegen Temel mit Einsatz und Revanche.
- **👷 Arbeiter mit Persönlichkeit:** Namen, Erfahrungslevel (⭐–⭐⭐⭐,
  pflücken schneller) und **Şoför-Beförderung** (voller Teepreis, braucht Pickup).
- **🍵 Drei Tee-Linien:** Siyah, Yeşil (Fabrik-Upgrade) und **Beyaz Çay** —
  die Rize-Rarität, freigeschaltet durch Dedes Rezept.
- **🐝 Yayla:** Bergstraße zur Hochalm mit Blumenwiese — Bienenstöcke liefern
  **Anzer-Honig**, Kühe geben im Sommer Extra-Milch.
- **🎩 Kemal Ağa in Person:** flaniert im Anzug über den Stadtplatz und
  stichelt je nach Marktanteil.
- **🎉 Çay-Festivali:** am letzten Tag jeder Saison — Wimpelketten, +25 %
  Preise und Ernte-Wettbewerb mit Preisgeld.
- **🇬🇧 English** als dritte Sprache.

### Nacht, Ruf & New Game+ (v7)
- **🌙 Echte Nacht:** Der Tag endet nicht mehr um 20 Uhr — bis Mitternacht
  darfst du freiwillig wach bleiben (dann kippst du um). Sternenhimmel,
  Mondlicht, dunkles Meer.
- **🎣 Nachtangeln:** Nachts beißen Lüfer und Kalkan deutlich öfter — das
  Boot bekommt dafür eine Laterne.
- **🟢 Kaçak-Schmuggler:** Ab 21 Uhr ankert ein Schiff mit grüner Laterne vor
  der Küste. Tee-Pakete bringen dort das Doppelte — wenn die Küstenwache
  nicht zuschlägt (Ware weg, Strafe, Ruf ruiniert).
- **🤝 Çay-Kooperative & Dorf-Ruf:** Aufträge, İmece und Festivalsiege bauen
  deinen Ruf (0–100) auf; Schwarzhandel zerstört ihn. Ab 20 Ruf kannst du der
  Kooperative beitreten: +6 % Teepreis, −15 % Saatgut, Dividende am Festivaltag.
- **🔧 Sanayi-Werkstatt:** Fahrzeuge verschleißen beim Fahren und werden
  langsamer. In der Werkstatt neben dem Autohaus: Reparatur, Motor-Tuning
  (+15 % Tempo) und Sportreifen (bessere Lenkung, weniger Regen-Malus).
- **🐕 Kangal:** Der treue Hirtenhund folgt dir überallhin, wedelt, bellt —
  und verjagt nachts den Fuchs, der sonst Eier aus dem Hühnerstall stiehlt.
- **📸 Fotoalbum:** Fotomodus-Aufnahmen (F, dann C) landen zusätzlich im
  Album (Pausemenü) — ansehen, löschen, behalten.
- **⭐ New Game+:** Nach der Dede-Geschichte oder als Çay-Baron neu starten:
  Prestige-Stern (+5 % auf alle Verkäufe, stapelbar), 10 % Startkapital,
  Erfolge bleiben.
- **📈 Preis-Charts:** Kursverläufe aller Aktien und deiner Tageseinnahmen
  als Mini-Charts in Börse und Bilanz.

### İstanbul, Urlaub & das große Leben (v8)
- **🕌 İstanbul begehbar:** Der Flug landet jetzt in einem eigenen
  Bosporus-Viertel — Kai mit Kapalıçarşı (Premium-Verkauf), Moscheen,
  Galata-Turm, beleuchtete Bosporus-Brücke, Kız Kulesi, fahrende Fähren,
  Passanten und **echte Wasserspiegelung** (three.js Reflector). Der Vapur
  bringt dich zurück ins Tal.
- **🌴 Urlaub:** İzmir, Antalya, Fethiye-Ölüdeniz — und die **Malediven** als
  Luxusreise (bringt einmalig Dorf-Ruf). Urlaub kostet den Resttag, gibt volle
  Energie, 3 Tage +10 % auf alle Verkäufe und eine gezeichnete **Postkarte im
  Album**.
- **📱 ÇayFon [N]:** In-Game-Smartphone mit 9 Apps — ehrliche
  **Wettervorhersage** (echte Schauer-/Sturmzeiten des Tages!),
  Piyasa-Markttipps, Bank, Börse, **Dolmuş-Taxi** (Fast Travel, GTA-Style),
  Kararname, Album, Radio und Kamera.
- **📜 Kararname (Tropico-Feeling):** Ein Dekret gleichzeitig — Çay-Subvention,
  Reklam-Kampagne, Gece Mesaisi oder Pazar-Steuer, jedes mit Preis und
  Nebenwirkung.
- **🐟 Hamsi-Fischerei:** Schleppnetz (Ağ) kaufen und in voller Fahrt
  auswerfen — im Winter läuft der **Hamsi-Akını** mit doppeltem Schwarm.
  🐬 Delfine begleiten schnelle Boote.
- **🐻 Bär:** Streift nachts durchs Teefeld und klaut Korbernte — der Kangal
  stellt sich ihm in den Weg.
- **🏁 Kayık-Rennen:** Bojen-Zeitrennen vor der Küste gegen Temels Bestzeit
  (Preisgeld + Ruf).
- **🫖 Çay-Ustası:** Aufbrüh-Minispiel im Çayevi — dreimal die grüne Zone
  treffen, dann ist der Tee „tavşan kanı".
- **🗣️ Pazarlık:** Am Markt feilschen — mit gutem Ruf steigen die Chancen
  auf +30 %.
- **🏨 Pansiyon-Tourismus:** Eigene Pension mit ruf-abhängigen
  Gäste-Einnahmen, Touristen im Sommer und geführter **Tal-Tour** (Teefeld →
  Alım Yeri → İskele) gegen Geld & Ruf.
- **🛷 Rodelhang:** Im Winter mit dem Holzschlitten den Hang hinunter.
- **📻 Radyo-News:** Beim Fahren tickern echte Wetter- und Markt-Nachrichten.

### Derby, Peynir & Kemals Geheimnis (v9)
- **⚽ Karadeniz-Derby:** Tor mit Netz am Stadtplatz — 60 Sekunden, so viele
  Tore wie möglich mit dem physik-echten CC0-Fußball (Prämie pro Tor, Bonus
  ab 3).
- **🧀 Peynir-Kette:** Ziegen als neues Hoftier, **Mandıra** (macht nachts
  aus 2 Milch 1 Peynir) und **Muhlama-Lokanta** in der Stadt (serviert abends
  Peynir + Mais als Muhlama, 340 ₺ pro Pfanne).
- **🚁 Helikopter:** Das Endgame-Fahrzeug — frei über das ganze Tal fliegen
  (Leertaste steigen, Shift sinken), landet überall.
- **🥁 Dorfhochzeit & Halay:** Neues Nachbarschafts-Event mit prozeduraler
  **Davul-Zurna-Musik**; am Festivaltag kannst du am Platz Halay tanzen.
- **🏞️ Bahçe Genişletme:** Neues Shop-Upgrade rodet die Randparzellen —
  deutlich mehr Teebüsche, auch für die Arbeiter.
- **🐐 Şelale-Bergpfad:** Wasserfall mit Gischt und Rastbank hoch in den
  Bergen; die Ziegen klettern mit. Eine Rast pro Tag gibt Energie.
- **📖 Story-Saison 2 — Kemal Ağas Vergangenheit:** 5 neue Kapitel (Die
  Einladung, Das alte Foto, Temel erzählt, Dedes Rezept, Barış). Am Ende:
  Frieden mit Kemal — nie wieder Preisdumping.

### Grafik-Paket, Dolmuş & Karşıköy (v10)
- **✨ Grafik-Paket:** Ziegeldächer (2k-PBR) auf allen Häusern, Putzwände,
  weiche Schatten (PCFSoft), echter **Fotoscan-Holzsteg** am Bootsanleger,
  Laternen mit warmem Nachtlicht, Çay-Wagen, Bänke, Sträucher, Findlinge
  und Moosfelsen aus Poly-Haven-Fotoscans im ganzen Tal.
- **🚌 Dolmuş-Linie:** Dein Minibus pendelt sichtbar Hof–Haus–Stadt, hält an
  drei Stationen und bringt jeden Abend Fahrgeld (wächst mit dem Ruf).
- **🌊 Sel-Katastrophe:** Selten schwillt der Bach an — morgens kommt die
  Warnung, bis 15 Uhr Sandsäcke stapeln (oder versichert sein), sonst
  kostet das Hochwasser Geld und Beete.
- **🎣 Angel-Turnier:** Am Festivaltag am Steg — 90 Sekunden gegen Temel,
  Dursun und Kemal, mit Bestenliste und Preisgeld.
- **🧿 Basar-Schätze:** Acht glitzernde Fundstücke liegen versteckt im Tal
  (von der Yayla bis zum İstanbul-Kai). Sammelalbum im Betriebs-Panel,
  Komplettbonus vom Antiquitätenhändler.
- **🐝 Waben-Ernte:** Timing-Minispiel an den Bienenstöcken — bei perfekter
  Hand gibt es **Anzer-Gold** und Extra-Honig.
- **🏘️ Karşıköy:** Zweites Dorf am anderen Talende mit Putzhäusern,
  Mini-Moschee, eigenem **Pazar** (Premium für Peynir, Honig & Hofprodukte)
  und dem Bolzplatz der „Karşıköy Gençlik" — Elfmeter-Duell mit Einsatz.

### Heli-Aufträge, Feste & Automation (v11)
- **🚁 Heli-Aufträge:** Mit eigenem Helikopter kommen Notrufe rein —
  Bergrettung an Şelale, Yayla oder Nordkamm und Express-Lieferungen
  Fabrik → Karşıköy. Landen im Zielgebiet genügt.
- **🎆 Festivalnacht-Feuerwerk:** Am Abend jedes Festivals steigen
  prozedurale Raketen überm Meer (Points + Additive Blending, mit Knall
  und Knistern aus der WebAudio-Engine).
- **🐄 Tierzucht:** Jedes Tier bekommt einen Namen (Sarıkız, Pamuk,
  Karabaş…), ab zwei Tieren gibt es nachts Nachwuchs, und am Festival
  läuft der **Preistier-Wettbewerb**.
- **🚚 Şoför 2.0 (Lieferketten-Automation):** Neue Telefon-App „Lojistik"
  mit drei Regeln — Auto-Export, Auto-Supermarkt (bis 10 Pakete/Tag) und
  Auto-Pazar (Hofprodukte zum Karşıköy-Premium). Braucht Şoför + Pickup,
  kostet Spesen pro Abend.
- **🌰 Haselnuss-Plantage:** Eigener Hain am Osthang (20 strauchige
  Bäume, Nüsse im Herbst sichtbar) — erntet jeden Herbstabend von selbst.
- **🕌 Ezan-Tagesrhythmus:** Zweimal täglich ruft der Ezan — bewusst
  dezent umgesetzt (kein Melodie-Imitat): kurzer Hinweis, und die
  Kasaba-Bewohner sammeln sich ruhig beim Çayevi.

### Gulet, Konak & Dorfkatzen (v12)
- **📸 Foto-Missionen:** Die Lokalgazete vergibt morgens Foto-Aufträge —
  Şelale, Delfine vom Boot, Festival-Feuerwerk, Sonnenuntergang oder
  İstanbul. Motiv im Fotomodus (F → C) einfangen: Honorar + Ruf.
- **⛵ Segel-Gulet:** Traditionsschiff am Kai (beim Händler kaufbar).
  Ab Ruf 10 einmal täglich eine automatische Küstentour mit zahlenden
  Gästen — Panoramakamera segelt mit, Gage wächst mit dem Ruf.
- **🏆 Çay-Meisterschaft von Rize:** Am Festivaltag (ab Ruf 40) treten
  drei Disziplinen an: Pflücken im Akkord, der perfekte Aufguss und das
  Pazarlık-Finale — neun Timing-Wertungen gegen Rizes Meister, Pokal
  und 3.000 ₺ für den Şampiyon.
- **🏛️ Konak-Restaurierung:** Die Herrenhaus-Ruine am Hang lässt sich in
  drei Etappen restaurieren (Gerüst sichtbar) und wird zum
  **KONAK MÜZESİ** — täglicher Eintritt wächst mit dem Ruf, eine
  komplette Sammelkarten-Ausstellung verdoppelt die Kasse.
- **🌦️ Mikro-Wetterzonen:** Gischtnebel hängt dauerhaft an der Şelale,
  Frühdunst liegt bis 11 Uhr über der Yayla — lokales Wetter statt
  Einheitshimmel.
- **🐈 Dorfkatzen:** Vier Katzen streunen durch Çayevi-Terrasse, Hof,
  Karşıköy und Pansiyon. Mit Hamsi füttern (E) — die Katze folgt eine
  Minute; zehn Fütterungen machen dich zum Katzenfreund des Dorfes (+Ruf).
  Miau & Schnurren natürlich prozedural.
- **🤝 Joint Venture mit Kemal Ağa:** Nach dem Story-Frieden bietet die
  Fabrik den Vertrag „ÇAYKEM" an — Kemals Werk liefert täglich 2 Pakete
  für die eigene Marke, Verkaufspreis +10 %, und Kemal grüßt endlich
  freundlich.

### Dorf-Ausbau (v13)
- **🏘️ Muhtarlık:** Neues Schild in der Kasaba — der Muhtar vertraut dir
  ab Ruf 15 Dorfprojekte an, die du als Ağa finanzierst. Jedes Projekt
  wächst sichtbar in drei Phasen: Bauschild → Gerüst → fertiges Gebäude.
- **🏫 Grundschule (15.000 ₺, 2 Bautage):** Die dankbare Dorfjugend hilft
  auf den Feldern — Löhne dauerhaft −10 %, +8 Ruf.
- **🍵 Çay-Bahçesi-Anbau (9.000 ₺, 1 Bautag):** Teegarten-Terrasse mit
  Markise am Çayevi — dein Anteil: +150 pro Abend, +5 Ruf.
- **🕌 Moschee-Restaurierung (20.000 ₺, 2 Bautage):** Kuppel und Minarett
  erstrahlen neu — jedes Festival +2 Moral-Tage (Verkaufsbonus), +10 Ruf.

### Skelett-animierte Menschen (v13.3)
- Alle Menschen (Pflücker, Dorfbewohner, Kemal Ağa, Third-Person-Avatar)
  sind jetzt **echte geriggte 3D-Charaktere** mit Skelett-Animationen:
  Idle, Walk, Run und „Working" (Teepflücken) laufen über
  `AnimationMixer` mit weichem Überblenden.
- Basis: Quaternius' „Animated Human" (CC0), per FBX2glTF nach GLB
  konvertiert (0,7 MB); sechs 32×32-Palettentexturen liefern
  Outfit- und Hautton-Varianten.
- Instanzen werden mit `SkeletonUtils.clone` erzeugt; Strohhut,
  Rückenkorb und Jandarma-Mütze hängen direkt an Kopf-/Wirbel-Bones
  und bewegen sich mit.
- Fällt der GLB-Load aus, greifen automatisch die prozeduralen
  v13.2-Figuren als Fallback.

### Saison
- 7 Tage, danach Medaille (Bronze/Silber/Gold) und Endlosmodus.
- Cinematic-Intro beim ersten Start, Minimap (M), Sternenhimmel mit Mond,
  Dorfbewohner-NPCs, Traktor-Anhänger.
- Fortschritt wird automatisch gespeichert (`localStorage`, alte v1-Stände
  werden übernommen).

### Geplant
- **Multiplayer** (Koop im Tal) — bewusst noch nicht eingebaut, steht auf
  der Roadmap.

## Technik

- three.js r0.185, ES-Module mit Importmap, **kein Bundler**
- Prozedurales Terrain mit analytischer Höhenfunktion (Terrassen!),
  3-Wege-PBR-Splatting (Wiese/Erde/Fels) via `onBeforeCompile`
- ~70 000 instanzierte Grashalme mit Wind-Böen im Vertex-Shader
- ~1 000 Teebüsche als 3 InstancedMeshes (Körper, Blattwolke, Trieb-Layer
  mit Per-Instanz-Wachstumsattribut)
- Physischer Himmel (three.js `Sky`) mit Tagesverlauf; Environment-Map wird
  periodisch per PMREM aus dem Himmel gebacken
- Fotogescannte CC0-Modelle (Poly Haven), selektiv dezimiert:
  Stämme ~6 %, Blattwerk ~16 % der Original-Polygone, Meshopt-komprimiert
- Meer mit dreifach gescrollten Normal-Maps + Environment-Reflexion
- Regen, Möwen, Pflück-Partikel, Tag/Nacht, dynamischer Nebel
- **Kompletter Sound prozedural per WebAudio** (Meer, Wind, Regen, Möwen,
  Pflücken, Verkauf, Motor, Kuh/Schaf/Huhn) — keine Audiodateien, keine Lizenzfragen
- Automatische Qualitätsstufen (Gras-Dichte, Schattenauflösung, Pixel-Ratio)
- v2: prozedurale Low-Poly-Fahrzeuge, -Tiere, -NPCs und -Stadt (0 zusätzliche
  Assets, alles aus Code), Arcade-Fahrphysik auf dem analytischen Terrain

## Projektstruktur

```
index.html          Einstieg + UI-Overlays
css/style.css       HUD, Menüs, Shop
js/
  main.js           Bootstrap, Loop, Qualität
  config.js         Balancing & Welt-Konstanten
  game.js           Tageszyklus, Wetter, Pflücken, Wirtschaft, Interaktionen
  player.js         First-Person-Controller (+ Touch-Joystick)
  vehicles.js       Fahrzeuge: Modelle, Fahrphysik, Chase-Cam
  workers.js        Arbeiter-NPCs mit Pflück-KI
  ui.js / i18n.js   HUD, Panels & Zweisprachigkeit (DE/TR)
  audio.js          prozedurale WebAudio-Engine
  world/            terrain, sky, ocean, grass, tea, props, rain, birds,
                    particles, farm (Beete+Tiere), city (Kasaba), structures
vendor/             three.js + Addons (lokal, publish-ready)
assets/             CC0-Texturen & -Modelle (siehe ASSETS.md)
tools/              Download-/Optimierungs-Skripte (nur Entwicklung)
```

## Lizenzen

Code: MIT. Assets: CC0 (Poly Haven, ambientCG) bzw. MIT (three.js,
Wasser-Normal-Map) — Details in [ASSETS.md](ASSETS.md).
