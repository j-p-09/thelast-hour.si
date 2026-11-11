// Javni podatki Primera 002 (brez rešitev): povzetek, osumljenci, obrazec obtožbe. Možnosti obtožbe so enake kot v primeru 001: vključujejo tudi napačne.
export const CASE2_META = {
  id: 'PRIMER-002', no: '002', title: 'PRIMER 002: ZAKLENJENA PISARNA',
  subtitle: 'Soba, v kateri je vsak predmet priča.',
  durationMin: 60, hintPenalty: 40, wrongPenalty: 100, maxAccusations: 3, accuseOpenFound: 16, totalClues: 28, accuseOpenSec: 600, superHints: 3, superPenalty: 30, locks: 4,
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
    'Vsak namig stane 40 točk, vsak od treh super namigov 30 točk. Končno obtožbo lahko oddate največ trikrat; vsaka napačna stane 100 točk.',
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

// ---------- PRIMER 003 ----------
export const CASE3_META = {
  id: 'PRIMER-003', no: '003', title: 'PRIMER 003: SOBA 13', subtitle: 'Sanatorij sv. Helene. Nekaj v njem še ni končalo.', horror: true,
  durationMin: 60, hintPenalty: 60, wrongPenalty: 150, maxAccusations: 3, accuseOpenFound: 12, accuseOpenSec: 480, totalClues: 19, superHints: 2, superPenalty: 50, locks: 7,
  briefing: [
    'Sanatorij sv. Helene je zaprt od leta 1979. Lokalni pravijo, da se v sobi 13 ponoči sliši dihanje. Pred tremi dnevi je neznanec predal policiji zvezek brez podpisa: »Marta ni umrla za pljučnico.«',
    'Vstopili ste skozi izhod, ki se je za vami zaprl. Ključavnica je zarjavela in se ne premakne, dokler ne poveste, kaj se je zgodilo.',
    'Pred vami so tri sobe: ordinacija, soba 13 in kapela. Vrata med njimi se odprejo šele, ko rešite njihove ključavnice. Nazaj lahko greste kadar koli.',
    'Svetilka je vaš prijatelj: baterije so omejene. Nekaj v stavbi ve, da ste tu. Imate natanko 60 minut.',
  ],
  controls: [
    ['Premik', 'W A S D ali puščice (Shift = hitreje)'], ['Pogled', 'povlecite z miško ali prstom; Q / E obrača'], ['Pregled predmeta', 'klik ali dotik (ali Presledek)'], ['Svetilka', 'tipka F (porablja baterijo)'],
  ],
  rules: [
    'Preiskava traja natanko 60 minut. Čas meri strežnik.', 'Prostor lahko deli največ trije detektivi. Odkritja, predmeti in rešene ključavnice so skupni.',
    'Namig stane 60 točk, super namig 50 točk, napačna obtožba 150 točk. Super namigi so le 2.', 'Primer vsebuje zvoke in utripajočo svetlobo. Vklopite lahko »Blag način«.',
  ],
};
export const SUSPECTS3 = [
  { id: 'S1', name: 'dr. Anton Vilfan', age: 41, job: 'Vodja oddelka za živčne bolezni', statement: '»Vsako zdravljenje je bilo po predpisih. Pacientka je umrla zaradi pljučnice.«' },
  { id: 'S2', name: 'sestra Berta Kos', age: 38, job: 'Glavna medicinska sestra', statement: '»Tisto noč sem bila doma. Papirje sem izpolnila, kot je zahtevala služba.«' },
  { id: 'S3', name: 'Franc Kranjc', age: 55, job: 'Direktor sanatorija', statement: '»O vsem sem izvedel šele po dogodku. Bil sem na dopustu.«' },
  { id: 'S4', name: 'Mirko Brezar', age: 47, job: 'Vrtnar', statement: '»Vrta nisem zapustil. S sanatorijem nimam opravka.«' },
];
export const ACCUSE_FORM3 = [
  { id: 'culprit', label: 'Kdo je vodil zdravljenje, ki je ubilo Marto', options: [['S1', 'dr. Anton Vilfan, zdravnik'], ['S2', 'sestra Berta Kos'], ['S3', 'direktor Franc Kranjc'], ['S4', 'vrtnar Mirko Brezar']] },
  { id: 'method', label: 'Vzrok smrti', options: [['M1', 'Elektrošok: napetost, višja od varne, ob 6. seansi'], ['M2', 'Pljučnica (uradni vzrok)'], ['M3', 'Zastrupitev z zdravili'], ['M4', 'Zadušitev v postelji']] },
  { id: 'cover', label: 'Kdo je ponaredil papirje', options: [['B1', 'Sestra Berta Kos'], ['B2', 'Direktor Kranjc'], ['B3', 'Vrtnar Brezar'], ['B4', 'Nihče: napaka v evidenci']] },
  { id: 'grave', label: 'Kje leži Marta', options: [['G1', 'Pod oltarjem v kapeli'], ['G2', 'V vrtu za sanatorijem'], ['G3', 'V kurilnici v kleti'], ['G4', 'V reki za zdraviliščem']] },
  { id: 'contradiction', label: 'Odločilno protislovje (neobvezno)', optional: true, options: [['C1', 'Uradno potrdilo pravi pljučnica; karton in dnevnik naprave kažeta elektrošok 110 V ob 3:17.'], ['C2', 'Berta trdi, da je bila tisto noč doma; zvezek priča, da je bila v sanatoriju.'], ['C3', 'Kranjc trdi, da je bil na dopustu; pismo iz spovednice kaže, da je vedel.'], ['C4', 'Mirko trdi, da vrta ni zapustil; lopata ima blato izpod kapele.']] },
];

// ---------- PRIMER 004 ----------
export const CASE4_META = {
  id: 'PRIMER-004', no: '004', title: 'PRIMER 004: ČRNI TOVOR', subtitle: 'Policijska akcija: vdor v skladišče Zorman Logistika.', premium: true,
  durationMin: 120, hintPenalty: 40, wrongPenalty: 100, maxAccusations: 3, accuseOpenFound: 14, accuseOpenSec: 900, totalClues: 20, superHints: 3, superPenalty: 40, locks: 8,
  briefing: [
    'Zorman Logistika: skladišče na robu mesta. Obveščevalci poročajo o tihotapljenju orožja, a nihče ne ve, kdo ga organizira. Nocoj so vsi na delu, stavba je polna oboroženih varnostnikov.',
    'Najprej se pripravite na postaji: oborožite se, vadite na strelišču, določite težavnost in vloge. Detektiv vodi akcijo, specialca ga krijeta.',
    'Nato se odpeljete do stavbe. Ko vdrete, se začne odštevanje 120 minut. Obvladajte nasprotnike, odklenite uganke in pridite do glavnega osumljenca.',
    'Osumljenec se preda samo, če vsaj eden od vas meri vanj s pištolo. Sicer zbeži. Ko ga vklenete, ga odpeljete v celico in oddate zapisnik.',
    'Pazite: poškodujete se lahko vsi, in tudi padete. Ekipa ima omejeno število življenj.',
  ],
  controls: [
    ['Premik', 'W A S D (Shift = hitreje)'], ['Pogled', 'miška (klik na sliko zaklene kazalec, Esc ga sprosti)'], ['Ogenj', 'levi klik ali Presledek'], ['Merjenje', 'desni klik ali Z'],
    ['Polnjenje', 'R'], ['Uporaba, lisice', 'E'], ['Svetilka / nočni vid', 'F / N'], ['Značka / klic', 'B / V'],
  ],
  rules: [
    'Odštevanje (120 minut) se začne ob vdoru v stavbo, ne prej.', 'Prostor lahko deli največ trije policisti. Uganke in odkritja so skupni, nasprotniki pa se na vsaki napravi izračunajo posebej.',
    'Namig stane 40 točk, super namig 40 točk, napačna obtožba 100 točk.', 'Vsaka smrt porabi eno življenje ekipe. Ko jih zmanjka, je akcija neuspešna.',
  ],
};
export const SUSPECTS4 = [
  { id: 'S1', name: 'Viktor Zorman', age: 58, job: 'Lastnik podjetja', statement: '»Podjetje vodim pošteno. V skladišču nisem bil že mesece.«' },
  { id: 'S2', name: 'Nina Kralj', age: 41, job: 'Računovodkinja', statement: '»Podpisujem račune, ki mi jih prinesejo. Blaga nisem nikoli videla.«' },
  { id: 'S3', name: 'Rado Bizjak', age: 46, job: 'Vodja varovanja', statement: '»Tisti teden sem bil na dopustu. S pošiljkami nimam nič.«' },
  { id: 'S4', name: 'Tadej Hribar', age: 35, job: 'Voznik', statement: '»Samo vozim, kamor mi rečejo. Za tovor ne vem ničesar.«' },
];
export const ACCUSE_FORM4 = [
  { id: 'culprit', label: 'Organizator tihotapljenja', options: [['S1', 'Viktor Zorman, lastnik'], ['S2', 'Nina Kralj, računovodkinja'], ['S3', 'Rado Bizjak, vodja varovanja'], ['S4', 'Tadej Hribar, voznik']] },
  { id: 'method', label: 'Način tihotapljenja', options: [['M1', 'Orožje v zabojnikih z dvojnim dnom in ponarejenih tovornih listih'], ['M2', 'Po pošti'], ['M3', 'Z dronom'], ['M4', 'V avtomobilih zaposlenih']] },
  { id: 'cover', label: 'Kako je prikril sled', options: [['B1', 'Z izklopom kamer ob 03:47 in izbrisom posnetkov'], ['B2', 'S podkupovanjem policije'], ['B3', 'S požigom skladišča'], ['B4', 'Ni skrival']] },
  { id: 'hideout', label: 'Kje se je skrival', options: [['H1', 'V varnostni sobi za zadnjimi vrati'], ['H2', 'V kleti'], ['H3', 'V pisarni lastnika'], ['H4', 'Na strehi']] },
  { id: 'contradiction', label: 'Odločilno protislovje (neobvezno)', optional: true, options: [['C1', 'Bizjak je bil po razporedu na dopustu, a ga dnevnik recepcije in strežnik izpričata ob 03:12 in 03:47.'], ['C2', 'Zorman trdi, da ni vedel, a je v sefu pogodba z »Z.«.'], ['C3', 'Nina trdi, da blaga ni videla, a je podpisala vse račune.'], ['C4', 'Tadej trdi, da je samo voznik, a pozna vse poti.']] },
];
