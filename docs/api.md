# img-cast – API documentation

**English** · [Čeština](api.cs.md)

Script format: [script-format.md](script-format.md). Types: `src/img-cast.d.ts`.

## Model

The player renders the scene into `container`. The container gets `overflow: hidden` and (unless it already has another one) `position: relative`.
The container holds one inner layer (the "world", moved and scaled by `zoom-to`), and every `image` in it is a pair of elements:

```
<div>   ← wrapper: position:absolute, left/top (x, y), translate from xa/ya, visibility
  <img> ← image: `styles` and CSS animations (`animate`)
</div>
```

Positioning (`slide`, `set`, `move-to`) is therefore handled by the wrapper, and appearance/animation by the `img`,
so they don't interfere (e.g. `transform: scale()` in an animation doesn't break alignment).

Steps run sequentially, unless a `slide` or `sub-steps` has `async: true` – then the script continues right away and
`await` can wait for it later (see [script-format.md](script-format.md#parallel-steps)). A step finishes immediately (`image`, `set`), after `duration` elapses (`slide`, `pause`)
or – for `animate` – only with `"wait": true`; without it the animation runs in the background and the script continues.

## `new ImgCast(container, script, options?)`

| Parameter | Description |
|-----------|-------------|
| `container` | `HTMLElement` to render into |
| `script` | object `{ steps, animations? }` |
| `options.baseUrl` | base for relative image `url`s; default `document.baseURI` |
| `options.speed` | playback speed, default `1` |

## `ImgCast.load(container, url, options?)` → `Promise<ImgCast>`

Fetches the JSON with `fetch` and creates a player; `baseUrl` is the script's URL (can be overridden in `options`).
Throws an `Error` on an HTTP error.

## Properties and methods

| Member | Description |
|--------|-------------|
| `play(): Promise<void>` | stops any running playback, clears the scene, preloads images and plays the script. The Promise resolves after the last step, or after `stop()`/`reset()`. Script errors (unknown `id`, animation) reject it. |
| `stop()` | interrupts playback; the scene stays as it is, running animations are cancelled |
| `reset()` | `stop()` + removes all images from the scene |
| `speed` | positive number; `2` = twice as fast, `0.5` = half speed. Scales `duration` of `slide`, `pause`, `animate`. Takes effect from the next step. An invalid value throws `RangeError`. |
| `playing` | `true` while playback is running |
| `container`, `script`, `baseUrl` | the passed values |

## Events

`ImgCast` is an `EventTarget`.

| Event | `detail` | When |
|-------|----------|------|
| `step` | `{ index, step, path }` | before each step is executed, including steps nested in `sub-steps`; `index` is the position in its own list, `path` is the array of positions from the root (e.g. `[2, 0]`) |
| `end` | – | after the last step finishes (not after `stop()`) |

## Coordinates and units

- `x`, `y`: a number or a string without a unit = `px`; otherwise any CSS length (`"50%"`, `"10em"`). Percentages are relative to the container.
- `xa`, `ya`: `left|center|right`, resp. `top|center|bottom`, or `"*%"` – what `x`/`y` refers to (the image's anchor point).
- `move-to`: `id` of an existing image; takes over its current `left`/`top` (during a running `slide`, the current in-between position). Explicit `x`/`y` take precedence; alignment is not copied.

## Animations

`animations` defines named animations; the `*%` keys are keyframes (CSS properties in kebab-case or camelCase),
`duration` and `timing-function` are defaults that the `animate` step can override. Animations run via
`Element.animate()` on the inner `img`; when finished, the image returns to the state given by `styles`.

## Using with frameworks

The library knows no framework – it only needs an element. Example (React):

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

Similarly in Vue (`onMounted`/`onBeforeUnmount`) or Svelte (`onMount`).

## Limitations

- Requires a DOM (browser). Importing in Node.js (SSR) works, the constructor does not.
- The camera (`zoom-to`) is implemented as a CSS transform of an inner layer, animated with `requestAnimationFrame`; resizing the container during a zoomed scene is applied the next time the camera moves.
- `follow` uses each image's current computed position, so an image being moved by a slide is followed live.
- `awid` names are global per playback; they are cleared on every `play()`.
- Async steps are not cancelled individually – only `stop()`/`reset()` cancels them all.
- Changing `speed` does not affect a step that is already running.
- No pause/seek in the middle of a script, only `play`/`stop`/`reset`.

## Development and releasing

```sh
pnpm install
pnpm run check        # syntax check
pnpm pack --dry-run   # what ends up in the package
```

Releasing a new version:

1. Update `CHANGELOG.md` (and `CHANGELOG.cs.md`): move `Unreleased` under the new version with a date.
2. `pnpm version <patch|minor|major>` (updates `package.json`, may create a git tag).
3. `pnpm publish` (`prepublishOnly` runs the check; `publishConfig.access` is `public`).
