# img-cast – programátorská dokumentace

[English](api.md) · **Čeština**

Formát scriptu: [script-format.cs.md](script-format.cs.md). Typy: `src/img-cast.d.ts`.

## Model

Přehrávač vykreslí scénu do `container`. Ten dostane `overflow: hidden` a (pokud nemá jiné) `position: relative`.
Kontejner obsahuje jednu vnitřní vrstvu („svět“, kterou posouvá a zvětšuje `zoomTo`) a každý `image` v ní je dvojice elementů:

```
<div>   ← wrapper: position:absolute, left/top (x, y), translate podle xa/ya, visibility
  <img> ← obrázek: `styles` a CSS animace (`animate`)
</div>
```

Polohu (`slide`, `set`, `moveTo`) tedy řeší wrapper a vzhled/animace `img`, takže se navzájem neruší
(např. `transform: scale()` v animaci nerozhodí zarovnání).

Kroky se provádějí sekvenčně, pokud nemá `slide` nebo `subSteps` `async: true` – pak script pokračuje hned a `await` na něj může počkat později (viz [script-format.cs.md](script-format.cs.md#souběžné-kroky)). Krok je hotový okamžitě (`image`, `set`), po uplynutí `duration` (`slide`, `pause`)
nebo – u `animate` – jen s `"wait": true`; bez něj animace běží na pozadí a script pokračuje dál.

## `new ImgCast(container, script, options?)`

| Parametr          | Popis                                                          |
|-------------------|----------------------------------------------------------------|
| `container`       | `HTMLElement`, do kterého se vykresluje                        |
| `script`          | objekt [scriptu](script-format.cs.md) (`steps`, `animations?`, `macros?`, `cssClasses?`, ...). Klíče ve starším `kebab-case` se převedou automaticky |
| `options.baseUrl` | základ pro relativní `url` obrázků; výchozí `document.baseURI` |
| `options.speed`   | rychlost přehrávání, výchozí `1`                               |
| `options.loop`    | `false` (výchozí) = jednou, `true` = donekonečna, číslo = celkový počet přehrání |

## `ImgCast.load(container, url, options?)` → `Promise<ImgCast>`

Stáhne JSON přes `fetch` a vytvoří přehrávač; `baseUrl` je adresa scriptu (lze přepsat v `options`).
Při HTTP chybě vyhodí `Error`.

## Vlastnosti a metody

| Člen | Popis |
|------|-------|
| `preload(): Promise<void>` | přednačte všechny obrázky scriptu – včetně kroků vnořených v `subSteps` a kroků maker tak, jak je volá `call` (s dosazenými argumenty). Obrázky se načtou jednou; opakovaná volání i `play()` je znovu použijí. Chybějící obrázek přednačtení neshodí. Zavolej ji brzy (např. hned po `load`), aby `play()` začal bez čekání. |
| `play(): Promise<void>` | zastaví případné přehrávání, vyčistí scénu, přednačte obrázky a přehraje script (opakovaně podle `loop`). Promise se splní po posledním kroku posledního přehrání, nebo po `stop()`/`reset()` – s `loop: true` až po `stop()`. Chyby ve scriptu (neznámé `id`, animace, makro) Promise zamítnou. |
| `stop()` | přeruší přehrávání, scéna zůstane v aktuálním stavu, běžící animace se zruší |
| `reset()` | `stop()` + odstranění všech obrázků ze scény |
| `speed` | kladné číslo; `2` = dvakrát rychleji, `0.5` = poloviční. Škáluje `duration` u `slide`, `pause`, `animate`. Uplatní se od dalšího kroku. Neplatná hodnota → `RangeError`. |
| `loop` | `false` = jednou, `true` = donekonečna, kladné celé číslo = celkový počet přehrání. Lze měnit za běhu (kontroluje se na konci každého přehrání); neplatná hodnota → `RangeError`. |
| `playing` | `true`, pokud přehrávání běží |
| `container`, `script`, `baseUrl` | předané hodnoty |

## Události

`ImgCast` je `EventTarget`.

| Událost | `detail` | Kdy |
|---------|----------|-----|
| `step` | `{ index, step, path }` | před provedením každého kroku, i kroků zanořených v `subSteps`; `index` je pozice v jeho seznamu, `path` pole pozic od kořene (např. `[2, 0]`) |
| `loop` | `{ iteration }` | na konci přehrání, po kterém následuje další (kvůli `loop`); `iteration` je počet dokončených přehrání |
| `end` | – | po dokončení posledního kroku posledního přehrání (ne po `stop()`; nikdy s `loop: true`) |

## Souřadnice a jednotky

- `x`, `y`: číslo nebo řetězec bez jednotky = `px`; jinak libovolná CSS délka (`"50%"`, `"10em"`). Procenta jsou vůči kontejneru.
- `xa`, `ya`: `left|center|right`, resp. `top|center|bottom`, nebo `"*%"` – co určuje hodnota `x`/`y` (kotevní bod obrázku).
- `moveTo`: `id` existujícího image; převezme jeho aktuální `left`/`top` (při probíhajícím `slide` aktuální mezipolohu). Explicitní `x`/`y` mají přednost, zarovnání se nepřebírá.

## Animace

`animations` definuje pojmenované animace; klíče `*%` jsou keyframy (CSS vlastnosti v kebab-case i camelCase),
`duration` a `timingFunction` jsou výchozí hodnoty, které lze v kroku `animate` přepsat. Animace se spouští
přes `Element.animate()` na vnitřním `img`; po skončení se obrázek vrátí do stavu daného `styles`.

## Smyčka

```js
const cast = await ImgCast.load(el, 'script.json', { loop: true }); // nebo cast.loop = 3
cast.play();          // opakuje, dokud nezavoláš cast.stop()
```

Každé opakování začíná od čisté scény (jako `play()` – obrázky, kamera a jména `awid` se vynulují); obrázky zůstávají přednačtené,
takže mezi přehráními nic neblikne. Rychlost přehrávání a další nastavení se zachovají. Script bez jakéhokoli čekání
stránku nezablokuje – přehrávač mezi opakováními uvolní vlákno prohlížeči.

## Pomocné funkce

| Funkce | Popis |
|--------|-------|
| `defineScript(script)` | vrátí `script` beze změny; v TypeScriptu ho zkontroluje proti typu `Script` a nabízí doplňování |
| `normalizeScript(json)` | převede starší `kebab-case` script na `camelCase` a vrátí nový objekt (konstruktor i `ImgCast.load` to dělají automaticky) |

```ts
import { ImgCast, defineScript } from 'img-cast';

const script = defineScript({
  steps: [
    { cmd: 'image', id: 'app', url: './ps-001.png' },
    { cmd: 'slide', id: 'app', x: 100, duration: 500, timingFunction: 'ease-in' },
  ],
});
new ImgCast(document.getElementById('stage')!, script).play();
```

Všechny typy (`Script`, `Step`, `Macro`, `CssClasses`, ...) se exportují z `img-cast`.

## Použití s frameworky

Knihovna nezná žádný framework – stačí jí element. Příklad (React):

```jsx
function Cast({ src }) {
  const ref = useRef(null);
  useEffect(() => {
    let cast;
    ImgCast.load(ref.current, src).then((c) => { cast = c; c.play(); });
    return () => cast?.reset();
  }, [src]);
  return <div ref={ref} style={{ width: 1107, height: 714 }} />;
}
```

Analogicky ve Vue (`onMounted`/`onBeforeUnmount`) nebo Svelte (`onMount`).

## Omezení

- Vyžaduje DOM (prohlížeč). Import v Node.js (SSR) projde, konstruktor ne.
- Kamera (`zoomTo`) je CSS transformace vnitřní vrstvy animovaná přes `requestAnimationFrame`; změna velikosti kontejneru při zoomované scéně se projeví až při dalším pohybu kamery.
- `follow` používá aktuální vypočtenou pozici obrázků, takže sleduje i obrázek uprostřed `slide`.
- Jména `awid` jsou globální pro jedno přehrávání; při každém `play()` se vymažou.
- Async kroky nelze rušit jednotlivě – všechny najednou jen `stop()`/`reset()`.
- Změna `speed` neovlivní již běžící krok.
- Neexistuje pauza/seek uprostřed scriptu, jen `play`/`stop`/`reset`.

## Vývoj a vydání

```sh
pnpm install
pnpm run check        # kontrola syntaxe
pnpm pack --dry-run   # co se dostane do balíčku (src, README, CHANGELOG, LICENSE)
```

Vydání nové verze:

1. Doplnit `CHANGELOG.md` (přesunout `Unreleased` pod novou verzi s datem).
2. `pnpm version <patch|minor|major>` (upraví `package.json`, případně vytvoří git tag).
3. `pnpm publish` (`prepublishOnly` spustí kontrolu; `publishConfig.access` je `public`).
