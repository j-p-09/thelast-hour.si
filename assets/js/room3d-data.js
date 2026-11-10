// Javni podatki Primera 002 (brez rešitev): povzetek, osumljenci, obrazec obtožbe. Možnosti obtožbe so enake kot v primeru 001: vključujejo tudi napačne.
export const CASE2_META = {
  id: 'PRIMER-002', no: '002', title: 'PRIMER 002: ZAKLENJENA PISARNA',
  subtitle: 'Soba, v kateri je vsak predmet priča.',
  durationMin: 60, hintPenalty: 40, wrongPenalty: 100, maxAccusations: 3, accuseOpenFound: 16, totalClues: 28, accuseOpenSec: 600,
  briefing: [
    'V noči s sobote, 17. oktobra, na nedeljo so v zaklenjeni pisarni v vili našli Leona Marolta (67), lastnika dražbene hiše. Vrata so bila zaklenjena od znotraj, ključ je ostal v ključavnici, okno je bilo zapahnjeno.',
    'Vzrok smrti: zastrupitev z ogljikovim monoksidom. Telo so odpeljali; soba je ostala tak, kot so jo našli. Vi ste v njej.',
    'Pametna ključavnica vrat je preklopila v forenzični način. Odpre se šele, ko vanjo vnesete pravilno rešitev: storilca, motiv, način in čas dejanja.',
    'Pet oseb je bilo tisti dan v hiši ali blizu nje. Vsaka je v čem lagala. Ubijalec je samo eden. Imate natanko 60 minut.',
  ],
  controls: [
    ['Premik', 'W A S D ali puščice (Shift = hitreje)'],
    ['Pogled', 'povlecite z miško ali prstom; Q / E obrača'],
    ['Pregled predmeta', 'klik ali dotik na predmet (ali Presledek)'],
    ['Svetilka', 'tipka F'],
    ['UV-svetilka', 'tipka U (ko jo najdete)'],
  ],
  rules: [
    'Preiskava traja natanko 60 minut. Čas meri strežnik.',
    'Prostor lahko deli največ trije detektivi. Odkritja, predmeti in rešene ključavnice so skupni.',
    'Vsak namig stane 40 točk. Končno obtožbo lahko oddate največ trikrat; vsaka napačna stane 100 točk.',
    'Obtožba se odklene, ko ekipa odkrije 16 sledi ali ko ostane manj kot 10 minut.',
  ],
};
export const SUSPECTS = [
  { id: 'S1', name: 'Katarina Marolt', age: 59, job: 'Žena', statement: '»Ob 17:30 sem odšla v gledališče, domov sem prišla ob 22:50. O Leonovih poslih in oporoki ne vem ničesar.«' },
  { id: 'S2', name: 'Žiga Marolt', age: 31, job: 'Sin', statement: '»Prišel sem šele zvečer. Denarja nisem prosil. Odšel sem ob 21:00.«' },
  { id: 'S3', name: 'dr. Rok Zajc', age: 58, job: 'Družinski zdravnik in prijatelj', statement: '»Cel dan sem bil v ambulanti. Z Leonom se nisva slišala od srede.«' },
  { id: 'S4', name: 'Maja Peterlin', age: 36, job: 'Cenilka v dražbeni hiši', statement: '»Katalog sva delala od 14h do 16h in Leon ni zapustil sobe niti za minuto. Potem sem odšla domov v Celje.«' },
  { id: 'S5', name: 'Anton Černe', age: 63, job: 'Hišnik, 25 let v službi', statement: '»Do 23:20 nisem vstopil v delovno sobo. Gospodu sem večerjo pustil pred vrati.«' },
];
export const ACCUSE_FORM = [
  { id: 'culprit', label: 'Storilec', options: [['S1', 'Katarina Marolt, žena'], ['S2', 'Žiga Marolt, sin'], ['S3', 'dr. Rok Zajc, zdravnik in prijatelj'], ['S4', 'Maja Peterlin, cenilka'], ['S5', 'Anton Černe, hišnik']] },
  { id: 'motive', label: 'Motiv', options: [['M1', 'Prikrivanje ponarejenih certifikatov, ki bi jih Leon v ponedeljek predal odboru'], ['M2', 'Preprečitev nove oporoke, po kateri ne bi dedovala vile'], ['M3', 'Rešitev pred bančno izterjavo 40.000 €'], ['M4', 'Prikrivanje napačne zdravniške diagnoze'], ['M5', 'Maščevanje zaradi grožnje z odpustom']] },
  { id: 'method', label: 'Način izvedbe', options: [['W1', 'Onesposobljen detektor CO in skoraj zaprta dimna zaklopka, ko Leona ni bilo v sobi; zvečer se je v zaklenjeni sobi zastrupil z ogljikovim monoksidom'], ['W2', 'Detektor in zaklopko je med prepirom onesposobil Žiga, ko je bil sam z očetom'], ['W3', 'Zamenjane tablete: smrtni odmerek zdravila za srce'], ['W4', 'Strup v viskiju v karafi'], ['W5', 'Leona je od zunaj zaklenil z rezervnim ključem in ga pustil v dimu']] },
  { id: 'time', label: 'Čas dejanja (sabotaže)', options: [['T1', '15:12 do 15:13'], ['T2', '20:31 do 21:05'], ['T3', '17:10 do 17:19'], ['T4', '19:40 do 19:46'], ['T5', '22:17']] },
  { id: 'contradiction', label: 'Odločilno protislovje (neobvezno)', optional: true, options: [['C1', 'Maja trdi, da Leon sobe ni zapustil niti za minuto; ključavnica, senzor gibanja in telefon kažejo, da ga od 15:09 do 15:27 ni bilo.'], ['C2', 'Žiga trdi, da denarja ni prosil; e-pošta kaže zahtevo za 40.000 €.'], ['C3', 'Rok trdi, da z Leonom od srede ni govoril; telefon beleži 17-minutni klic ob 15:09.'], ['C4', 'Katarina trdi, da o oporoki ne ve ničesar; odvetnik pravi, da je v sredo klicala in spraševala.'], ['C5', 'Anton trdi, da v sobo ni vstopil; ključavnica kaže vstop ob 19:40.']] },
];
