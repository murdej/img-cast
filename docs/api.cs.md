# img-cast – programátorská dokumentace

[English](api.md) · **Čeština**

Formát scriptu: [script-format.cs.md](script-format.cs.md). Typy: `src/img-cast.d.ts`.

## Model

Přehrávač vykreslí scénu do `container`. Ten dostane `overflow: hidden` a (pokud nemá jiné) `position: relative`.
Kontejner obsahuje jednu vnitřní vrstvu („svět“, kterou posouvá a zvětšuje `zoom-to`) a každý `image` v ní je dvojice elementů:

```
<div>   ← wrapper: position:absolute, left/top (x, y), translate podle xa/ya, visibility
  <img> ← obrázek: `styles` a CSS animace (`animate`)
</div>
```

Polohu (`slide`, `set`, `move-to`) tedy řeší wrapper a vzhled/animace `img`, takže se navzájem neruší
(např. `transform: scale()` v animaci nerozhodí zarovnání).

Kroky se provádějí sekvenčně, pokud nemá `slide` nebo `sub-steps` `async: true` – pak script pokračuje hned a `await` na něj může počkat později (viz [script-format.cs.md](script-format.cs.md#souběžné-kroky)). Krok je hotový okamžitě (`image`, `set`), po uplynutí `duration` (`slide`, `pause`)
nebo – u `animate` – jen s `"wait": true`; bez něj animace běží na pozadí a script pokračuje dál.

## `new ImgCast(container, script, options?)`

| Parametr          | Popis                                                          |
|-------------------|----------------------------------------------------------------|
| `container`       | `HTMLElement`, do kterého se vykresluje                        |
| `script`          | objekt `{ steps, animations? }`                                |
| `options.baseUrl` | základ pro relativní `url` obrázků; výchozí `document.baseURI` |
| `options.speed`   | rychlost přehrávání, výchozí `1`                               |

## `ImgCast.load(container, url, options?)` → `Promise<ImgCast>`

Stáhne JSON přes `fetch` a vytvoří přehrávač; `baseUrl` je adresa scriptu (lze přepsat v `options`).
Při HTTP chybě vyhodí `Error`.

## Vlastnosti a metody

| Člen | Popis |
|------|-------|
| `play(): Promise<void>` | zastaví případné přehrávání, vyčistí scénu, přednačte obrázky a přehraje script. Promise se splní po posledním kroku, nebo po `stop()`/`reset()`. Chyby ve scriptu (neznámé `id`, animace) Promise zamítnou. |
| `stop()` | přeruší přehrávání, scéna zůstane v aktuálním stavu, běžící animace se zruší |
| `reset()` | `stop()` + odstranění všech obrázků ze scény |
| `speed` | kladné číslo; `2` = dvakrát rychleji, `0.5` = poloviční. Škáluje `duration` u `slide`, `pause`, `animate`. Uplatní se od dalšího kroku. Neplatná hodnota → `RangeError`. |
| `playing` | `true`, pokud přehrávání běží |
| `container`, `script`, `baseUrl` | předané hodnoty |

## Události

`ImgCast` je `EventTarget`.

| Událost | `detail` | Kdy |
|---------|----------|-----|
| `step` | `{ index, step, path }` | před provedením každého kroku, i kroků zanořených v `sub-steps`; `index` je pozice v jeho seznamu, `path` pole pozic od kořene (např. `[2, 0]`) |
| `end` | – | po dokončení posledního kroku (ne po `stop()`) |

## Souřadnice a jednotky

- `x`, `y`: číslo nebo řetězec bez jednotky = `px`; jinak libovolná CSS délka (`"50%"`, `"10em"`). Procenta jsou vůči kontejneru.
- `xa`, `ya`: `left|center|right`, resp. `top|center|bottom`, nebo `"*%"` – co určuje hodnota `x`/`y` (kotevní bod obrázku).
- `move-to`: `id` existujícího image; převezme jeho aktuální `left`/`top` (při probíhajícím `slide` aktuální mezipolohu). Explicitní `x`/`y` mají přednost, zarovnání se nepřebírá.

## Animace

`animations` definuje pojmenované animace; klíče `*%` jsou keyframy (CSS vlastnosti v kebab-case i camelCase),
`duration` a `timing-function` jsou výchozí hodnoty, které lze v kroku `animate` přepsat. Animace se spouští
přes `Element.animate()` na vnitřním `img`; po skončení se obrázek vrátí do stavu daného `styles`.

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
- Kamera (`zoom-to`) je CSS transformace vnitřní vrstvy animovaná přes `requestAnimationFrame`; změna velikosti kontejneru při zoomované scéně se projeví až při dalším pohybu kamery.
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
