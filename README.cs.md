# img-cast

[English](README.md) · **Čeština**

Přehrávač animací (screencastů) ze statických obrázků podle JSON scriptu.
Čistý ES modul, **bez závislostí** a **nezávislý na frameworku** – funguje s čímkoli, co dá k dispozici `HTMLElement`.

Obrázky, kurzor, kliknutí a další prvky se ve scéně umisťují, posouvají a animují pomocí CSS transitions a Web Animations API.

## Instalace

```sh
npm install img-cast
# nebo
pnpm add img-cast
```

## Rychlý start

```html
<div id="stage" style="width: 1107px; height: 714px"></div>
<script type="module">
  import { ImgCast } from 'img-cast';

  const cast = await ImgCast.load(document.getElementById('stage'), '/casts/demo/script.json');
  cast.addEventListener('end', () => console.log('hotovo'));
  await cast.play();
</script>
```

Script může být i objekt: `new ImgCast(element, { steps: [...], animations: {...} }, { baseUrl: '/casts/demo/' })`.

Příklad scriptu:

```json
{
  "steps": [
    { "cmd": "image", "id": "app", "url": "./ps-001.png" },
    { "cmd": "image", "id": "cursor", "url": "./cursor.svg", "x": "50%", "y": "50%" },
    { "cmd": "slide", "id": "cursor", "x": "100px", "y": "100px", "duration": 500, "timingFunction": "ease-in" },
    { "cmd": "pause", "duration": 500 }
  ]
}
```

## API ve zkratce

| Člen | Popis |
|------|-------|
| `new ImgCast(container, script, { baseUrl, speed, loop })` | vytvoří přehrávač |
| `ImgCast.load(container, url, options)` | načte script přes `fetch`, `baseUrl` = adresa scriptu |
| `preload()` | přednačte všechny obrázky scriptu |
| `play()` | přehraje od začátku, Promise skončí s koncem |
| `stop()` / `reset()` | zastaví / zastaví a vyčistí scénu |
| `speed` | rychlost přehrávání (1 = normální, 2 = dvakrát rychleji) |
| `loop` | `true` = donekonečna, číslo = celkový počet přehrání |
| události `step`, `loop`, `end` | průběh přehrávání |
| `defineScript()`, `normalizeScript()` | pomocník pro TypeScript, starší `kebab-case` → `camelCase` |

Úplná dokumentace: [docs/api.cs.md](docs/api.cs.md), formát scriptu: [docs/script-format.cs.md](docs/script-format.cs.md).

## Požadavky

Moderní prohlížeč (ES moduly, `Element.animate`, `EventTarget`). Knihovna sahá na DOM, není určena pro Node.js bez DOMu (SSR: importovat lze, používat jen v prohlížeči).

## Ukázka

`examples/index.html` v repozitáři (`sample-1` základy, `sample-2` async/await, `sample-3` follow a zoom, `sample-4` makra, CSS třídy, smyčka, `sample-5` popisky a pevné objekty) – spustit přes HTTP server (moduly a `fetch` nefungují přes `file://`):

```sh
python3 -m http.server   # a otevřít /examples/
```

## Licence

[ISC](LICENSE)
