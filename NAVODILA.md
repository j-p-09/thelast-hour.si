# THE LAST HOUR – navodila za objavo (brezplačno, brez kartice)

Igra ima **dva dela**, oba brezplačna:

| Del | Kje živi | Kaj vsebuje |
|---|---|---|
| **Spletna stran** (HTML/CSS/JS) | **GitHub Pages** (mapa `1-GITHUB`) | to, kar vidi igralec |
| **Zaledje** (časovnik, preverjanje odgovorov, rešitve, prijave) | **Google Apps Script** + Google Preglednica (mapa `2-GOOGLE`) | skrivnosti igre; ne sme na GitHub |

Firebase za to različico **ni potreben** (njegove strežniške funkcije so plačljive). Potrebujete samo **Google račun** in **GitHub račun**.

---
## KORAK A – Zaledje v Google Apps Script (približno 10 minut)

1. Odprite **https://script.google.com** (prijavljeni z Google računom) → **Nov projekt** (New project). Zgoraj kliknite »Untitled project« in ga poimenujte `THE LAST HOUR`.
2. Na levi, pod »Datoteke« (Files), kliknite `Code.gs`. **Izbrišite vso vsebino** (Ctrl+A, Delete).
3. Na računalniku odprite datoteko `2-GOOGLE/Code.gs` z Beležnico / TextEdit, **Ctrl+A, Ctrl+C**, in v urejevalniku Apps Script **Ctrl+V**. Kliknite ikono diskete (Shrani).
4. Na levi ob »Datoteke« kliknite **+** → **Script** → ime `PdfData` (brez končnice). Izbrišite vsebino, prilepite vsebino datoteke `2-GOOGLE/PdfData.gs`. Shranite.
5. Na levi kliknite **zobnik (Project Settings)** → pomaknite se do **Script Properties** → **Edit script properties** → **Add script property** in dodajte dve vrstici:
   - `ADMIN_EMAIL` = vaš e-naslov za administratorja (npr. `jaz@gmail.com`)
   - `ADMIN_PASSWORD` = dolgo, svoje geslo (vsaj 12 znakov). Shranite (Save).
   To geslo vidite samo vi (lastnik projekta); v kodi ga ni.
6. Vrnite se na urejevalnik (ikona `< >`). Zgoraj izberite funkcijo **`pripravi`** → **Run (Zaženi)**. Vpraša za dovoljenja: **Review permissions** → izberite svoj račun → »Google hasn't verified this app« → **Advanced** → **Go to THE LAST HOUR (unsafe)** → **Allow**. To je normalno za vaš lasten skript. Ustvari se Google Preglednica »THE LAST HOUR – podatki igre« (tam se hranijo podatki; ne brišite je).
7. Zgoraj desno **Deploy (Uvedba) → New deployment (Nova uvedba)** → ikona zobnika ob »Select type« → **Web app (Spletna aplikacija)**.
   - **Execute as (Izvajaj kot):** Me (jaz)
   - **Who has access (Kdo ima dostop):** **Anyone (Kdor koli)**
   → **Deploy**. Kopirajte **Web app URL** (konča se z `/exec`). Shranite ga.
8. (Neobvezno, priporočeno) Izberite funkcijo **`namestiCasovnik`** → Run. Tako se preiskave z iztečenim časom zaključijo tudi, če nihče ne gleda.

## KORAK B – Spletna stran na GitHub Pages (približno 10 minut)

1. Na **github.com** → **+ (New repository)** → ime npr. `the-last-hour` → **Public** → **Create repository**.
2. **Add file → Upload files**. **Povlecite VSO VSEBINO mape `1-GITHUB`** (`index.html`, `administrator.html`, mapa `assets`, `README.md`, …) v okno. Pomembno: datoteka `index.html` mora biti v korenu repozitorija (ne v podmapi). Počakajte, da se vse naloži → **Commit changes**.
   - Skrite datoteke (`.nojekyll`): če je brskalnik ne naloži, ni težava, stran bo delovala.
3. V repozitoriju odprite `assets/js/config.js` → ikona **svinčnika** (Edit) → zamenjajte `https://script.google.com/macros/s/VSTAVITE_ID/exec` z naslovom iz koraka A.7 → **Commit changes**.
4. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `/ (root)` → Save.** Po 1–2 minutah se pokaže naslov: `https://VAŠE-IME.github.io/the-last-hour/`.

## KORAK C – Preizkus
1. Odprite naslov igre → **Registracija detektiva** (ustvarite testni račun).
2. Odprite `…/administrator.html` → prijava z `ADMIN_EMAIL` in `ADMIN_PASSWORD` → **Detektivi → Odobri**.
3. Na igralčevi strani se račun samodejno odobri (počakajte nekaj sekund) → **Začni solo preiskavo**.

---
## Če karkoli spremenite v Code.gs
Deploy → **Manage deployments** → svinčnik → **Version: New version** → Deploy. (URL ostane enak.)

## Pogoste težave
- **»Igra še ni povezana z zaledjem«:** `config.js` še vsebuje `VSTAVITE_ID` ali naslov ni pravilen (mora se začeti z `https://script.google.com/macros/s/` in končati z `/exec`).
- **Prijava admina ne uspe:** preverite `ADMIN_EMAIL` / `ADMIN_PASSWORD` v Script Properties (brez presledkov).
- **»Strežnik ni dosegljiv«:** uvedba mora imeti dostop **Anyone**. Po spremembi dostopa naredite novo različico.
- **Prvi klic je počasen** (1–3 s): Google »zbudi« skript. To je običajno.
- **Karkoli drugega:** v Apps Script levo **Executions (Izvajanja)** pokaže napake; sporočilo mi pošljite.

## Pomembna varnostna pravila
- **`Code.gs` in `PdfData.gs` NIKOLI ne gresta na GitHub**: vsebujeta rešitve primera. Na GitHub gre samo mapa `1-GITHUB` (v njej ni nobenih odgovorov).
- Geslo administratorja je samo v Script Properties.
- Podatki igre (uporabniki, preiskave) so v Preglednici, ki jo vidite samo vi.
