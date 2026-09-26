# img-cast

**English** · [Čeština](README.cs.md)

Player for animations (screencasts) built from static images and described by a JSON script.
A plain ES module with **no dependencies**, **framework-independent** – it works with anything that can give you an `HTMLElement`.

Images, cursors, click marks and other items are placed, moved and animated in the scene using CSS transitions and the Web Animations API.

## Installation

```sh
npm install img-cast
# or
pnpm add img-cast
```

## Quick start

```html
<div id="stage" style="width: 1107px; height: 714px"></div>
<script type="module">
  import { ImgCast } from 'img-cast';

  const cast = await ImgCast.load(document.getElementById('stage'), '/casts/demo/script.json');
  cast.addEventListener('end', () => console.log('done'));
  await cast.play();
</script>
```

The script can also be an object: `new ImgCast(element, { steps: [...], animations: {...} }, { baseUrl: '/casts/demo/' })`.

Example script:

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

## API at a glance

| Member | Description |
|--------|-------------|
| `new ImgCast(container, script, { baseUrl, speed, loop })` | creates a player |
| `ImgCast.load(container, url, options)` | loads the script with `fetch`; `baseUrl` = the script's URL |
| `preload()` | preloads all images of the script |
| `play()` | plays from the start; the Promise resolves when finished |
| `stop()` / `reset()` | stops / stops and clears the scene |
| `speed` | playback speed (1 = normal, 2 = twice as fast) |
| `loop` | `true` = repeat forever, a number = total plays |
| events `step`, `loop`, `end` | playback progress |
| `defineScript()`, `normalizeScript()` | TypeScript helper, legacy `kebab-case` → `camelCase` |

Full documentation: [docs/api.md](docs/api.md). Script format: [docs/script-format.md](docs/script-format.md).

## Requirements

A modern browser (ES modules, `Element.animate`, `EventTarget`). The library touches the DOM and is not meant for Node.js without a DOM (for SSR you can import it, but only use it in the browser).

## Example

`examples/index.html` in the repository (`sample-1` basics, `sample-2` async/await, `sample-3` follow and zoom, `sample-4` macros, CSS classes, loop) – serve it over HTTP (modules and `fetch` do not work over `file://`):

```sh
python3 -m http.server   # then open /examples/
```

## License

[ISC](LICENSE)
