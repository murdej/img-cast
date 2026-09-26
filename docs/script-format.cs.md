# Formát scriptu

[English](script-format.md) · **Čeština**

Script je JSON soubor, který popisuje scénu: jaké obrázky se objeví, kam se pohybují a jaké animace se přehrají.

```json
{
  "steps": [ /* příkazy, provádějí se postupně */ ],
  "animations": { /* pojmenované CSS animace, nepovinné */ },
  "slide-speed": "400pps",  /* nepovinné, viz Klíče v kořeni */
  "zoom-speed": "1s"        /* nepovinné, viz Klíče v kořeni */
}
```

- [Klíče v kořeni](#klíče-v-kořeni)
- [Přehled příkazů](#přehled-příkazů)
- [Umístění: `x`, `y`, `xa`, `ya`](#umístění)
- [Příkazy](#příkazy): [`image`](#image) · [`set`](#set) · [`slide`](#slide) · [`pause`](#pause) · [`animate`](#animate) · [`sub-steps`](#sub-steps) · [`await`](#await) · [`zoom-to`](#zoom-to)
- [Souběžné kroky: `async`, `awid`, `await`](#souběžné-kroky)
- [Sledování: `follow`](#sledování-obrázků-follow)
- [Kamera a zoom](#kamera-a-zoom)
- [`animations`](#animations)
- [Kompletní příklad](#kompletní-příklad)

## Klíče v kořeni

| Klíč | Význam |
|------|--------|
| `steps` | seznam [příkazů](#příkazy) |
| `animations` | pojmenované [animace](#animations) pro `animate` |
| `slide-speed` | výchozí rychlost každého [`slide`](#slide) **bez** `duration` (viz níže) |
| `zoom-speed` | výchozí rychlost každého [`zoom-to`](#zoom-to) **bez** `duration` (viz níže) |

`slide-speed` a `zoom-speed` mají stejný formát – číslo s jednotkou:

| Hodnota | Význam | Příklad |
|---------|--------|---------|
| `(číslo)s`, `(číslo)ms` | každý pohyb trvá tuto pevnou dobu | `"1.5s"`, `"800ms"` |
| `(číslo)pps`, `(číslo)ppms` | stálá rychlost v pixelech za sekundu / milisekundu; doba je `vzdálenost / rychlost` | `"400pps"` |

Vzdálenost u `slide` je délka posunu v pixelech. Vzdálenost u `zoom-to` je dráha, kterou urazí střed kamery;
pokud se jen mění zoom (střed zůstává), je to rozdíl viditelné plochy scény (úhlopříčka změny viditelné šířky a výšky).
Explicitní `duration` v kroku má vždy přednost. Bez `duration` a bez příslušného klíče v kořeni je krok okamžitý.
Nesprávná hodnota (např. `"fast"`) je chyba při spuštění `play()`.

## Přehled příkazů

Každá položka `steps` je objekt s klíčem `cmd` (název příkazu) a parametry příkazu.
Kroky se provádějí **postupně**; další začne, až předchozí skončí.

| `cmd` | Co dělá | Čeká na |
|-------|--------------|-------------|
| [`image`](#image) | přidá obrázek do scény | nic (okamžitě) |
| [`set`](#set) | okamžitě změní existující obrázek | nic (okamžitě) |
| [`slide`](#slide) | plynule posune obrázek | konec pohybu |
| [`pause`](#pause) | počká | uplynutí času |
| [`animate`](#animate) | spustí pojmenovanou animaci na obrázku | nic, nebo konec animace (`wait`) |
| [`sub-steps`](#sub-steps) | provede vnořený seznam kroků | dokončení všech vnořených kroků (pokud není `async`) |
| [`await`](#await) | počká na `async` kroky | dokončení zadaných `awid` |
| [`zoom-to`](#zoom-to) | posune / přiblíží „kameru“ | konec pohybu (pokud není `async`) |

## Umístění

Obrázky se umisťují ve scéně (kontejneru) pomocí **kotevního bodu** `x`, `y`.
`xa`/`ya` určují, který bod *obrázku* se na něj umístí.

| Parametr | Význam | Hodnoty | Výchozí |
|-----------|---------|--------|---------|
| `x`, `y` | poloha kotevního bodu ve scéně | číslo nebo řetězec: `"100"` a `100` = pixely, `"100px"`, `"50%"` (šířky/výšky scény), libovolná CSS délka | `0` |
| `xa` | který vodorovný bod obrázku leží na `x` | `left`, `center`, `right` nebo procento, např. `"25%"` | `left` |
| `ya` | který svislý bod obrázku leží na `y` | `top`, `center`, `bottom` nebo procento, např. `"25%"` | `top` |

Příklady:

| `x`, `y` | `xa`, `ya` | Výsledek |
|----------|------------|--------|
| `"0"`, `"0"` | `left`, `top` | levý horní roh obrázku v levém horním rohu scény |
| `"50%"`, `"50%"` | `center`, `center` | obrázek vycentrovaný ve scéně |
| `"100%"`, `"100%"` | `right`, `bottom` | obrázek v pravém dolním rohu |
| `"-100%"`, `"0"` | `center`, `center` | obrázek těsně mimo scénu (skrytý) |

## Příkazy

### `image`

Přidá do scény nový obrázek. Odkazuje se na něj později přes `id`.

| Klíč | Povinný | Význam |
|-----|:--------:|---------|
| `id` | ano | identifikátor pro ostatní příkazy |
| `url` | ano | adresa obrázku; relativní adresy se počítají od umístění scriptu (viz `baseUrl`) |
| `x`, `y` | ne | pozice, viz [Umístění](#umístění) |
| `xa`, `ya` | ne | zarovnání, viz [Umístění](#umístění) |
| `visible` | ne | `true` (výchozí) / `false` – skryje obrázek, aniž by ho odstranil |
| `move-to` | ne | převezme `x` a `y` z jiného obrázku, viz [`move-to`](#move-to) |
| `styles` | ne | objekt CSS vlastností aplikovaných na obrázek, např. `{ "opacity": 0 }` |
| `follow` | ne | `id` jiného obrázku: když se ten pohne, pohne se s ním i tento, viz [Sledování](#sledování-obrázků-follow) |

```json
{ "cmd": "image", "id": "cursor", "url": "./cursor.svg", "x": "50%", "y": "50%" }
```

Obrázky se vrství v pořadí přidání – pozdější jsou nahoře.

#### `move-to`

Místo souřadnic se lze odkázat na jiný obrázek:

- hodnotou je `id` obrázku, který je **už definovaný**, jinak jde o chybu;
- obrázek převezme *aktuální* pozici (`x` a `y`) toho obrázku;
- explicitní `x` / `y` ve stejném kroku mají přednost;
- zarovnání (`xa`, `ya`) se **nepřebírá** – přesouvaný obrázek si ponechá své;
- přesun je okamžitý; pro plynulý použijte [`slide`](#slide).

```json
{ "cmd": "set", "id": "click", "move-to": "cursor" }
```

### `set`

Okamžitě změní existující obrázek. Přijímá stejné parametry jako [`image`](#image) (`id` vybírá obrázek):
`url`, `x`, `y`, `xa`, `ya`, `visible`, `move-to`, `styles`, `follow` (`null` sledování ukončí). Mění se jen zadané parametry; `styles` se přidávají ke stávajícím.

```json
{ "cmd": "set", "id": "app", "url": "./ps-002.png" }
```

### `slide`

Plynule posune obrázek na novou pozici.

| Klíč | Povinný | Význam |
|-----|:--------:|---------|
| `id` | ano | který obrázek se pohybuje |
| `x`, `y` | ne | cílová pozice (neuvedená souřadnice se nemění) |
| `move-to` | ne | posun na pozici jiného obrázku (`x`/`y` mají přednost) |
| `duration` | ne | trvání v ms; bez něj platí [`slide-speed`](#klíče-v-kořeni), jinak `0` = okamžitě |
| `timing-function` | ne | CSS timing function: `linear` (výchozí), `ease`, `ease-in`, `ease-out`, `ease-in-out`, `cubic-bezier(...)` |
| `async` | ne | `true` = další kroky pokračují **zároveň** s pohybem, viz [Souběžné kroky](#souběžné-kroky) |
| `awid` | ne | jméno async kroku pro [`await`](#await) (má smysl jen s `async`) |

Další krok začne po skončení pohybu (pokud není `async` `true`).

```json
{ "cmd": "slide", "id": "cursor", "x": "100px", "y": "100px", "duration": 500, "timing-function": "ease-in" }
```

### `pause`

Počká před dalším krokem.

| Klíč | Význam |
|------|--------|
| `duration` | trvání v ms |

```json
{ "cmd": "pause", "duration": 500 }
```

### `animate`

Spustí na obrázku animaci definovanou v [`animations`](#animations).

| Klíč | Povinný | Význam |
|-----|:--------:|---------|
| `id` | ano | obrázek, na kterém animace běží |
| `animation` | ano | název animace z `animations` |
| `wait` | ne | `true` = před dalším krokem se počká na konec animace; `false` (výchozí) = animace běží na pozadí |
| `duration` | ne | trvání v ms; přepíše výchozí hodnotu animace |
| `timing-function` | ne | CSS timing function; přepíše výchozí hodnotu animace |

```json
{ "cmd": "animate", "id": "click", "animation": "click", "wait": true }
```

### `sub-steps`

Skupina kroků. Obsahuje vlastní seznam kroků, ve kterém lze do libovolné hloubky zanořovat další `sub-steps`.

| Klíč | Povinný | Význam |
|------|:-------:|--------|
| `steps` | ano | seznam kroků, stejný formát jako `steps` v kořeni scriptu |
| `async` | ne | `true` = kroky za `sub-steps` pokračují **zároveň** se skupinou, viz [Souběžné kroky](#souběžné-kroky) |
| `awid` | ne | jméno async skupiny pro [`await`](#await) (má smysl jen s `async`) |

Kroky uvnitř se provádějí postupně. Bez `async` začne další krok za `sub-steps`, až když skončí celá skupina
(včetně jejích vlastních async kroků).

```json
{ "cmd": "sub-steps", "async": true, "awid": "intro", "steps": [
  { "cmd": "slide", "id": "cursor", "x": "100px", "duration": 500 },
  { "cmd": "pause", "duration": 200 }
] }
```

### `await`

Počká na dokončení zadaných async kroků.

| Klíč | Povinný | Význam |
|------|:-------:|--------|
| `awid` | ano | řetězec nebo pole řetězců – `awid`, na která se čeká (u pole na všechna) |

```json
{ "cmd": "await", "awid": ["intro", "move"] }
```

Pokud je krok, na který se čeká, už hotový, `await` pokračuje okamžitě. `awid`, které ještě nebylo spuštěno, je chyba.

## Souběžné kroky

Normálně další krok začne, až skončí předchozí. Kroky `slide`, `zoom-to` a `sub-steps` přijímají `async: true`:
spustí se a script **hned pokračuje** dalším krokem, zatímco ony běží na pozadí.

- `awid` dá async kroku jméno. Jména jsou sdílená v celém scriptu (i napříč úrovněmi zanoření), takže
  `await` může čekat i na krok z jiné skupiny. Opakované použití jména nahradí dřívější.
- [`await`](#await) čeká na pojmenované kroky.
- Seznam kroků (kořen nebo skupina `sub-steps`) nikdy neskončí dřív než všechny jeho async kroky – událost `end`
  se tedy vyvolá (a `sub-steps` bez `async` skončí) až po dokončení všeho.
- Dva async `slide` téhož obrázku se ruší – vyhraje pozdější. Paralelně posouvejte různé obrázky, nebo použijte `await`.
- Chyba v async kroku (např. neznámé `id`) se projeví u nejbližšího `await` na něj, nebo na konci jeho seznamu.

```json
[
  { "cmd": "slide", "id": "cursor", "x": "300px", "y": "200px", "duration": 800, "async": true, "awid": "cursor" },
  { "cmd": "slide", "id": "panel", "x": "0", "duration": 400 },
  { "cmd": "await", "awid": "cursor" },
  { "cmd": "animate", "id": "click", "animation": "click", "wait": true }
]
```

Kurzor a panel se pohybují zároveň; kliknutí začne, až dorazí oba.

### `zoom-to`

Posune a přiblíží „kameru“ – viditelnou část scény. Týká se **všeho** ve scéně (všech obrázků).
Na začátku kamera ukazuje celou scénu (zoom `1`, střed uprostřed).

| Klíč | Povinný | Význam |
|------|:-------:|--------|
| `zoom` | ne | přiblížení: `1` = celá scéna, `2` = dvakrát větší (vidět je polovina scény); neuvedeno = zoom se nemění |
| `x`, `y` | ne | střed záběru v souřadnicích scény (jednotky jako v [Umístění](#umístění)); neuvedená osa se nemění |
| `zoom-to` | ne | `id` obrázku: jednorázově nastaví střed na aktuální pozici obrázku (jako [`move-to`](#move-to)); `x`/`y` mají přednost |
| `follow` | ne | `id` obrázku: střed **sleduje** obrázek při každém pohybu – i po skončení příkazu |
| `nzax`, `nzay` | ne | „no-zoom area“: velikost oblasti kolem středu záběru, ve které se může sledovaný bod pohybovat, aniž by se kamera pohnula; `px` (pixely obrazovky) nebo `%` šířky / výšky scény; výchozí `0` |
| `duration` | ne | doba, za kterou kamera dojede, v ms; bez něj platí [`zoom-speed`](#klíče-v-kořeni), jinak okamžitě |
| `timing-function` | ne | CSS timing function (výchozí `linear`) |
| `async`, `awid` | ne | souběžné spuštění, viz [Souběžné kroky](#souběžné-kroky) |

```json
{ "cmd": "zoom-to", "zoom": 2, "x": "300px", "y": "200px", "duration": 800, "timing-function": "ease-in-out" }
```

Pravidla:

- Cíl středu se vybírá v pořadí: `follow` → `zoom-to` → `x`/`y` (vyhrává první uvedené; `follow` ostatní ignoruje). Není-li uvedeno nic, střed zůstává a mění se jen zoom.
- `follow` zůstává aktivní, dokud jiný `zoom-to` nenastaví jiný cíl (`follow`, `zoom-to`, `x`, `y`) – pak kamera přestane sledovat.
  `zoom-to`, který mění jen `zoom` (nebo hodnoty `nza*`), sledování zachová. Sledování končí s koncem přehrávání (záběr zůstane).
- Sledovaným bodem je pozice `x`, `y` obrázku (jeho kotva, viz [`xa`, `ya`](#umístění)), ne jeho střed.
- S `nzax`/`nzay` se kamera **nehýbe**, dokud je bod uvnitř oblasti; když ji opustí, kamera se posune jen tolik,
  aby byl bod na okraji oblasti. Hodí se pro kurzor, který se jen trochu vychýlí od středu.
- Nový `zoom-to` přeruší předchozí, ještě běžící.

```json
{ "cmd": "zoom-to", "follow": "cursor", "zoom": 2, "nzax": "30%", "nzay": "30%", "duration": 600 }
```

## Sledování obrázků: `follow`

Parametr `follow` u `image` / `set` udělá z obrázku **následovníka** jiného obrázku:

```json
{ "cmd": "image", "id": "badge", "url": "./badge.svg", "x": "20px", "y": "-30px", "follow": "cursor" }
```

- Kdykoli se sledovaný obrázek pohne (`slide`, `set` s `x`/`y`/`move-to`), pohnou se všichni následovníci o **stejnou vzdálenost**.
  Pozice zadaná následovníkovi je počáteční odstup; ten si pak drží.
- U `slide` se následovníci pohybují zároveň a se stejným `duration` a `timing-function`, takže zůstávají vůči vedoucímu na stejném místě.
- Funguje řetězově (A sleduje B sleduje C) a jeden obrázek může sledovat libovolně mnoho následovníků. Cykly jsou bezpečné.
- Pohyb následovníka vedoucího nepohne. `"follow": null` v `set` sledování ukončí.

## Kamera a zoom

Zoom zvětšuje **celou scénu** – kamera jen určuje, jaká její část je vidět; souřadnice `x`, `y` obrázků se nemění.
Velikost kontejneru zůstává, co je mimo záběr, se ořízne. `%` v `x`/`y` se vždy vztahují k celé (nezoomované) scéně.
Viz [`zoom-to`](#zoom-to). Kamera se s každým `play()` a `reset()` vrací do výchozího stavu.

## `animations`

Definuje opakovaně použitelné animace pro [`animate`](#animate). Je to objekt: klíč je název animace, hodnota její definice.

| Klíč definice | Význam |
|---------------|--------|
| `"0%"` … `"100%"` | klíčové snímky – objekt CSS vlastností, které má obrázek v daném okamžiku |
| `duration` | výchozí trvání v ms (výchozí `1000`) |
| `timing-function` | výchozí CSS timing function (výchozí `linear`) |

```json
"animations": {
  "click": {
    "0%":   { "transform": "scale(20)", "opacity": 0 },
    "50%":  { "transform": "scale(20)", "opacity": 1 },
    "95%":  { "transform": "scale(1)",  "opacity": 1 },
    "100%": { "transform": "scale(1)",  "opacity": 0 },
    "timing-function": "linear",
    "duration": 500
  }
}
```

Po skončení animace se obrázek vrátí do stavu daného jeho `styles`.

## Kompletní příklad

Kurzor myši se přesune na bod, objeví se tam značka kliknutí a vymění se snímek obrazovky.

```json
{
  "steps": [
    { "cmd": "image", "id": "app", "url": "./ps-001.png" },
    { "cmd": "image", "id": "cursor", "url": "./cursor.svg", "x": "50%", "y": "50%" },
    { "cmd": "image", "id": "click", "url": "./mark.svg", "x": "-100%", "y": "0",
      "xa": "center", "ya": "center", "styles": { "opacity": 0 } },

    { "cmd": "slide", "id": "cursor", "x": "910px", "y": "184px", "duration": 1500, "timing-function": "ease-in" },
    { "cmd": "set", "id": "click", "move-to": "cursor" },
    { "cmd": "animate", "id": "click", "animation": "click", "wait": true },

    { "cmd": "set", "id": "app", "url": "./ps-002.png" },
    { "cmd": "pause", "duration": 500 }
  ],
  "animations": {
    "click": {
      "0%":   { "transform": "scale(20)", "opacity": 0 },
      "50%":  { "transform": "scale(20)", "opacity": 1 },
      "95%":  { "transform": "scale(1)",  "opacity": 1 },
      "100%": { "transform": "scale(1)",  "opacity": 0 },
      "timing-function": "linear",
      "duration": 500
    }
  }
}
```

Funkční script s obrázky je v [`examples/sample-1`](../examples/sample-1/script.json).
