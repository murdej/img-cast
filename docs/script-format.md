# Script format

**English** · [Čeština](script-format.cs.md)

A script is a JSON file that describes a scene: which images appear, where they move and which animations play.

```json
{
  "steps": [ /* commands, executed one after another */ ],
  "animations": { /* named CSS animations, optional */ },
  "macros": { /* reusable groups of steps, optional */ },
  "cssClasses": { /* CSS classes for images, optional */ },
  "slideSpeed": "400pps",  /* optional, see Root keys */
  "zoomSpeed": "1s"        /* optional, see Root keys */
}
```

**Naming:** all keys are `camelCase` (`moveTo`, `timingFunction`, `slideSpeed`, `subSteps`, `cssClass`, ...).
Scripts in the older `kebab-case` (`move-to`, `timing-function`, `sub-steps`, `zoom-to`, ...) still load –
they are converted automatically when the script is loaded (see `normalizeScript` in the [API](api.md)).
Names you choose yourself (animations, macros, arguments, CSS classes, CSS properties) are never converted.

- [Root keys](#root-keys)
- [Overview of commands](#overview-of-commands)
- [Positioning: `x`, `y`, `xa`, `ya`](#positioning)
- [Commands](#commands): [`image`](#image) · [`label`](#label) · [`set`](#set) · [`slide`](#slide) · [`pause`](#pause) · [`animate`](#animate) · [`subSteps`](#substeps) · [`await`](#await) · [`zoomTo`](#zoomto)
- [Parallel steps: `async`, `awid`, `await`](#parallel-steps)
- [Following: `follow`](#following-images-follow)
- [Camera and zoom](#camera-and-zoom)
- [Fixed objects: `fixed`](#fixed-objects-fixed)
- [Macros: `macros`, `call`](#macros)
- [CSS classes: `cssClasses`, `cssClass`](#css-classes)
- [`animations`](#animations)
- [Complete example](#complete-example)

## Root keys

| Key | Meaning |
|-----|---------|
| `steps` | list of [commands](#commands) |
| `animations` | named [animations](#animations) for `animate` |
| `macros` | reusable groups of steps for [`call`](#call), see [Macros](#macros) |
| `cssClasses` | CSS classes for the `cssClass` parameter of images, see [CSS classes](#css-classes) |
| `slideSpeed` | default speed of every [`slide`](#slide) **without** `duration` (see below) |
| `zoomSpeed` | default speed of every [`zoomTo`](#zoomto) **without** `duration` (see below) |

`slideSpeed` and `zoomSpeed` have the same format – a number with a unit:

| Value | Meaning | Example |
|-------|---------|---------|
| `(number)s`, `(number)ms` | every movement takes this fixed time | `"1.5s"`, `"800ms"` |
| `(number)pps`, `(number)ppms` | constant speed in pixels per second / millisecond; the time is `distance / speed` | `"400pps"` |

The distance of a `slide` is the length of the move in pixels. The distance of a `zoomTo` is the distance the camera centre
travels; if only the zoom changes (the centre stays), it is the difference of the visible scene area (the diagonal of the change of the visible width and height).
An explicit `duration` in the step always wins. Without `duration` and without the matching root key the step is instant.
A wrong value (e.g. `"fast"`) is an error when `play()` starts.

## Overview of commands

Every item of `steps` is an object with the key `cmd` (the command name) and the command's parameters.
Steps run **in order**; the next one starts when the previous one is finished.

| `cmd` | What it does | Waits until |
|-------|--------------|-------------|
| [`image`](#image) | adds an image to the scene | immediately |
| [`label`](#label) | adds a text / HTML label to the scene | immediately |
| [`set`](#set) | changes an existing image or label instantly | immediately |
| [`slide`](#slide) | smoothly moves an image | the movement ends |
| [`pause`](#pause) | waits | the time elapses |
| [`animate`](#animate) | plays a named animation on an image | immediately, or the animation ends (`wait`) |
| [`subSteps`](#substeps) | runs a nested list of steps | all nested steps finish (unless `async`) |
| [`await`](#await) | waits for `async` steps | the given `awid`s finish |
| [`zoomTo`](#zoomto) | moves / zooms the "camera" | the movement ends (unless `async`) |
| [`call`](#call) | runs a [macro](#macros) with arguments | the macro finishes (unless `async`) |

## Positioning

> Everything below (`x`, `y`, `xa`, `ya`, `moveTo`, `follow`, `visible`, `styles`, `cssClass`, `fixed`) works the same for **images** and **labels** – together they are called *objects*. The `id` of an object is shared by both kinds.

Images are positioned inside the scene (the container element) by an **anchor point** `x`, `y`.
`xa`/`ya` say which point *of the image* is placed on it.

| Parameter | Meaning | Values | Default |
|-----------|---------|--------|---------|
| `x`, `y` | position of the anchor point in the scene | a number or a string: `"100"` and `100` = pixels, `"100px"`, `"50%"` (of the scene's width/height), any CSS length | `0` |
| `xa` | which horizontal point of the image sits on `x` | `left`, `center`, `right` or a percentage such as `"25%"` | `left` |
| `ya` | which vertical point of the image sits on `y` | `top`, `center`, `bottom` or a percentage such as `"25%"` | `top` |

Examples:

| `x`, `y` | `xa`, `ya` | Result |
|----------|------------|--------|
| `"0"`, `"0"` | `left`, `top` | image's top-left corner in the scene's top-left corner |
| `"50%"`, `"50%"` | `center`, `center` | image centered in the scene |
| `"100%"`, `"100%"` | `right`, `bottom` | image in the bottom-right corner |
| `"-100%"`, `"0"` | `center`, `center` | image just outside the scene (hidden) |

## Commands

### `image`

Adds a new image to the scene. The image is later referred to by its `id`.

| Key        | Required | Meaning                                                                                                         |
|------------|:--------:|-----------------------------------------------------------------------------------------------------------------|
| `id`       |   yes    |  identifier used by other commands                                                                              |
| `url`      |   yes    | image address; relative addresses are resolved against the script's location (see `baseUrl`)                    |
| `x`, `y`   |    no    | position, see [Positioning](#positioning)                                                                       |
| `xa`, `ya` |    no    | alignment, see [Positioning](#positioning)                                                                      |
| `visible`  |    no    | `true` (default) / `false` – hides the image without removing it                                                |
| `moveTo`   |    no    | takes `x` and `y` from another image, see [`moveTo`](#moveto)                                                   |
| `styles`   |    no    | object of CSS properties applied to the image, e.g. `{ "opacity": 0 }`                                          |
| `follow`   |    no    | `id` of another image: when that image moves, this one moves with it, see [Following](#following-images-follow) |
| `cssClass` |    no    | a class name or an array of names from [`cssClasses`](#css-classes)                                             |
| `fixed`    |    no    | `true` = not affected by the camera (`zoomTo`), see [Fixed objects](#fixed-objects-fixed) |

```json
{ "cmd": "image", "id": "cursor", "url": "./cursor.svg", "x": "50%", "y": "50%" }
```

Images are stacked in the order they were added – later ones are on top.

#### `moveTo`

Instead of writing coordinates you can refer to another image:

- the value is the `id` of an image that is **already defined**, otherwise it is an error;
- the image takes over the *current* position of that image (`x` and `y`);
- explicit `x` / `y` in the same step take precedence;
- alignment (`xa`, `ya`) is **not** taken over – the moved image keeps its own;
- the move is instant; use [`slide`](#slide) for a smooth one.

```json
{ "cmd": "set", "id": "click", "moveTo": "cursor" }
```

### `label`

Adds a text label to the scene. It works like [`image`](#image) – it is positioned, moved (`slide`), followed (`follow`), styled (`styles`, `cssClass`) and animated (`animate`) the same way – except that:

- it has **no `url`**,
- it has **`text`** or **`html`** (one of them, not both),
- its element is a `div`.

| Key | Required | Meaning |
|-----|:--------:|---------|
| `id` | yes | identifier used by other commands |
| `text` | one of | plain text; it is inserted as text, so `<` and `&` need no escaping. Line breaks (`\n`) are kept |
| `html` | one of | formatted content (`<b>`, `<span style="...">`, ...) inserted as HTML |
| `x`, `y`, `xa`, `ya`, `visible`, `moveTo`, `styles`, `follow`, `cssClass`, `fixed` | no | the same as in [`image`](#image) |

```json
{ "cmd": "label", "id": "title", "html": "<b>Step 1:</b> click <i>Save</i>", "x": "20px", "y": "20px",
  "cssClass": "hud", "fixed": true }
{ "cmd": "label", "id": "hint", "text": "Click here", "x": "50%", "y": "10%", "xa": "center" }
```

- The text does not wrap by default (`white-space: pre` for `text`, `nowrap` for `html`). Set `styles` (e.g. `{ "whiteSpace": "normal", "width": "200px" }`) for wrapping. The text inherits the font and colour of the page – define your look in [`cssClasses`](#css-classes) or `styles`.
- **`html` is inserted as HTML without any check.** Use it only with scripts you trust (a script from an untrusted source could inject scripts – use `text` there).
- Change the content later with [`set`](#set) and `text` / `html`; a `label` cannot be given `url`, an `image` cannot be given `text` / `html`.

### `set`

Instantly changes an existing object. Accepts the same parameters as [`image`](#image) / [`label`](#label) (except `id`, which selects the object):
`url` (images), `text` / `html` (labels; the new content replaces the old one), `x`, `y`, `xa`, `ya`, `visible`, `moveTo`, `styles`, `follow` (`null` stops following), `cssClass` (replaces the classes; `null` removes them), `fixed` (moves the object between the scene and the fixed layer, on top of other objects there). Only the given parameters change; `styles` are added to the existing ones.

```json
{ "cmd": "set", "id": "app", "url": "./ps-002.png" }
```

### `slide`

Smoothly moves an image to a new position.

| Key | Required | Meaning |
|-----|:--------:|---------|
| `id` | yes | which image moves |
| `x`, `y` | no | target position (the one you omit does not change) |
| `moveTo` | no | move to the position of another image (`x`/`y` take precedence) |
| `duration` | no | duration in ms; without it [`slideSpeed`](#root-keys) applies, otherwise `0` = instant |
| `timingFunction` | no | CSS timing function: `linear` (default), `ease`, `ease-in`, `ease-out`, `ease-in-out`, `cubic-bezier(...)` |
| `async` | no | `true` = the next steps continue **at the same time** as the movement, see [Parallel steps](#parallel-steps) |
| `awid` | no | name of the async step for [`await`](#await) (only meaningful with `async`) |

The next step starts after the movement ends (unless `async` is `true`).

```json
{ "cmd": "slide", "id": "cursor", "x": "100px", "y": "100px", "duration": 500, "timingFunction": "ease-in" }
```

### `pause`

Waits before the next step.

| Key | Meaning |
|-----|---------|
| `duration` | duration in ms |

```json
{ "cmd": "pause", "duration": 500 }
```

### `animate`

Plays an animation defined in [`animations`](#animations) on an image.

| Key | Required | Meaning |
|-----|:--------:|---------|
| `id` | yes | image the animation plays on |
| `animation` | yes | name of the animation from `animations` |
| `wait` | no | `true` = wait for the animation to end before the next step; `false` (default) = it plays in the background |
| `duration` | no | duration in ms; overrides the animation's default |
| `timingFunction` | no | CSS timing function; overrides the animation's default |

```json
{ "cmd": "animate", "id": "click", "animation": "click", "wait": true }
```

### `subSteps`

A group of steps. It contains its own list of steps, in which further `subSteps` can be nested to any depth.

| Key | Required | Meaning |
|-----|:--------:|---------|
| `steps` | yes | list of steps, the same format as `steps` in the script root |
| `async` | no | `true` = the steps that follow `subSteps` continue **at the same time** as the group, see [Parallel steps](#parallel-steps) |
| `awid` | no | name of the async group for [`await`](#await) (only meaningful with `async`) |

The steps inside run in order. Without `async` the next step after `subSteps` starts when the whole group is finished
(including its own async steps).

```json
{ "cmd": "subSteps", "async": true, "awid": "intro", "steps": [
  { "cmd": "slide", "id": "cursor", "x": "100px", "duration": 500 },
  { "cmd": "pause", "duration": 200 }
] }
```

### `await`

Waits until the given async steps are finished.

| Key | Required | Meaning |
|-----|:--------:|---------|
| `awid` | yes | a string, or an array of strings – the `awid`s to wait for (with an array, for all of them) |

```json
{ "cmd": "await", "awid": ["intro", "move"] }
```

If the awaited step is already finished, `await` continues immediately. An `awid` that has not been started yet is an error.

## Parallel steps

Normally the next step starts when the previous one is finished. The steps `slide`, `zoomTo`, `call` and `subSteps` accept `async: true`:
they start and the script **continues immediately** with the next step, while they run in the background.

- `awid` gives an async step a name. Names are shared by the whole script (also across nesting levels), so `await`
  can wait for a step defined in another group. Reusing a name replaces the earlier one.
- [`await`](#await) waits for the named steps.
- A list of steps (the root, or a `subSteps` group) never ends before all its async steps have ended – so `end`
  is fired (and a non-async `subSteps` finishes) only after everything has run.
- Two async `slide`s of the *same* image interfere – the later one wins. Move different images in parallel, or use `await`.
- An error in an async step (e.g. an unknown `id`) is reported at the nearest `await` for it, or at the end of its list.

```json
[
  { "cmd": "slide", "id": "cursor", "x": "300px", "y": "200px", "duration": 800, "async": true, "awid": "cursor" },
  { "cmd": "slide", "id": "panel", "x": "0", "duration": 400 },
  { "cmd": "await", "awid": "cursor" },
  { "cmd": "animate", "id": "click", "animation": "click", "wait": true }
]
```

The cursor and the panel move at the same time; the click starts when both have arrived.

### `zoomTo`

Moves and zooms the "camera" – the visible part of the scene. It affects **everything** in the scene (all images).
At the start the camera shows the whole scene (zoom `1`, centre in the middle).

| Key | Required | Meaning |
|-----|:--------:|---------|
| `zoom` | no | magnification: `1` = whole scene, `2` = twice as large (half of the scene is visible); omitted = keeps the current zoom |
| `x`, `y` | no | centre of the view in scene coordinates ([Positioning](#positioning) units); the omitted axis keeps its value |
| `zoomTo` | no | `id` of an image: one-off set of the centre to that image's current position (like [`moveTo`](#moveto)); `x`/`y` take precedence |
| `follow` | no | `id` of an image: the centre **keeps following** it on every movement – even after the command has finished |
| `nzax`, `nzay` | no | "no-zoom area": the size of the area around the centre of the view in which the followed point can move without moving the camera; `px` (screen pixels) or `%` of the scene width / height; default `0` |
| `duration` | no | time the camera needs to get there, in ms; without it [`zoomSpeed`](#root-keys) applies, otherwise instant |
| `timingFunction` | no | CSS timing function (`linear` default) |
| `async`, `awid` | no | run in parallel, see [Parallel steps](#parallel-steps) |

```json
{ "cmd": "zoomTo", "zoom": 2, "x": "300px", "y": "200px", "duration": 800, "timingFunction": "ease-in-out" }
```

The rules:

- The target of the centre is chosen in this order: `follow` → `zoomTo` → `x`/`y` (the first present wins; `follow` ignores the others). If none is present, the centre stays and only the zoom changes.
- `follow` stays active until another `zoomTo` sets a different target (`follow`, `zoomTo`, `x`, `y`) – then the camera stops following.
  A `zoomTo` that changes only `zoom` (or the `nza*` values) keeps following. Following ends with playback (the framing stays).
- The followed point is the image's position `x`, `y` (its anchor, see [`xa`, `ya`](#positioning)), not its centre.
- With `nzax`/`nzay` the camera **does not move** while the point is inside the area; when it leaves it, the camera moves just enough
  for the point to be on the edge of the area. Handy for a cursor that only gets a little bit off-centre.
- A new `zoomTo` interrupts the previous one that is still running.

```json
{ "cmd": "zoomTo", "follow": "cursor", "zoom": 2, "nzax": "30%", "nzay": "30%", "duration": 600 }
```

## Following images: `follow`

The `follow` parameter of `image` / `set` makes the image a **follower** of another one:

```json
{ "cmd": "image", "id": "badge", "url": "./badge.svg", "x": "20px", "y": "-30px", "follow": "cursor" }
```

- Whenever the followed image moves (`slide`, `set` with `x`/`y`/`moveTo`), every follower moves by **the same distance**.
  The position given for the follower is the starting offset; it keeps it afterwards.
- With a `slide` the followers move at the same time and with the same `duration` and `timingFunction`, so they stay in place relative to the leader.
- It works in chains (A follows B follows C) and any number of followers may follow one image. Cycles are safe.
- Moving the follower itself does not move the leader. `"follow": null` in `set` ends the following.

## Camera and zoom

Zooming enlarges the **whole scene** – the camera only decides which part of it is visible; the coordinates `x`, `y` of images do not change.
The container's size stays the same and what is outside the view is cut off. `%` in `x`/`y` always relate to the whole (non-zoomed) scene.
See [`zoomTo`](#zoomto). The camera is reset on every `play()` and `reset()`.
Objects with [`fixed`](#fixed-objects-fixed) are not affected by the camera.

## Fixed objects: `fixed`

`"fixed": true` (on an `image` or `label`, also in `set`) takes the object out of the zoomed scene:
**neither its size nor its position is changed by the camera** (`zoomTo`) – it stays where it is on the screen, like a caption or a logo.

```json
{ "cmd": "label", "id": "caption", "text": "Step 2", "x": "20px", "y": "20px", "fixed": true }
```

- `x`, `y` of a fixed object are **screen coordinates** (of the container); `%` relates to the container's size. They are not scene coordinates.
- Fixed objects are drawn **above** all normal ones, in the order they were added.
- The camera cannot follow a fixed object (`zoomTo` with `follow` or `zoomTo` of a fixed `id` is an error).
- `follow` and `moveTo` copy plain coordinate values, they do not convert between the scene and the screen – a fixed label that follows a normal image moves by the same number of pixels as the image, not by the zoomed distance.
- `slide`, `animate`, `visible`, `styles` and `cssClass` work as with any other object.

## Macros

A macro is a named list of steps that you can run repeatedly, with different arguments. Macros are defined in the root key `macros`:

```json
"macros": {
  "clickAt": {
    "name": "clickAt",
    "args": ["x", "y", { "name": "duration", "default": 500 }],
    "steps": [
      { "cmd": "slide", "id": "cursor", "x": "$(x)", "y": "$(y)", "duration": "$(duration)" },
      { "cmd": "set", "id": "click", "moveTo": "cursor" },
      { "cmd": "animate", "id": "click", "animation": "click", "wait": true }
    ]
  }
}
```

| Key | Meaning |
|-----|---------|
| *(key of the object)* | name of the macro, used by `call` |
| `name` | name of the macro (same as the key; `call` finds the macro by either) |
| `steps` | steps of the macro, the same format as `steps` in the root (they may contain `subSteps` and other `call`s) |
| `args` | list of arguments: a string (the name – required argument) or `{ "name": "...", "default": ... }` (optional, with a default value) |

**Arguments in steps.** In any string value of the macro's steps (also in nested `subSteps`) `$(argumentName)` is replaced by the value of the argument:

- if the whole string is `"$(x)"`, the value is inserted as it is, with its type (`"duration": "$(duration)"` receives the number `500`);
- if `$(x)` is only a part of the string (`"url": "./screen-$(n).png"`), the value is converted to text and inserted;
- an unknown argument in `$(...)` is an error.

Ids of images created in a macro are global – give them names from arguments (`"id": "item-$(n)"`) if you call the macro several times.

### `call`

Runs a macro.

| Key | Required | Meaning |
|-----|:--------:|---------|
| `name` | yes | name of the macro |
| `args` | no | object with the values of the arguments: `{ "x": "300px", "y": "200px" }` |
| `async` | no | `true` = the next steps continue at the same time, see [Parallel steps](#parallel-steps) |
| `awid` | no | name for [`await`](#await) (with `async`) |

```json
{ "cmd": "call", "name": "clickAt", "args": { "x": "300px", "y": "200px", "duration": 800 } }
```

- An argument without a default that is not passed is an error; so is an argument the macro does not have.
- A macro may call other macros. A macro that calls itself endlessly is stopped with an error (nesting limit).
- The macro's steps run as a group (like [`subSteps`](#substeps)): the next step starts when the macro has finished, including its own async steps.

## CSS classes

`cssClasses` in the root defines classes; the `cssClass` parameter of an image assigns them.

```json
{
  "cssClasses": {
    "shadow": { "filter": "drop-shadow(2px 4px 3px rgba(0,0,0,.4))" },
    "faded": { "opacity": 0.5, "mixBlendMode": "multiply" }
  },
  "steps": [
    { "cmd": "image", "id": "cursor", "url": "./cursor.svg", "cssClass": "shadow" },
    { "cmd": "image", "id": "mark", "url": "./mark.svg", "cssClass": ["shadow", "faded"] }
  ]
}
```

- The class is an object `{ CSS property: value }`. Properties may be written in `camelCase` or `kebab-case`; a value may end with `!important`.
- `cssClass` is a name or an array of names. `set` with `cssClass` **replaces** the classes of the image (`null` or `[]` removes them).
- The classes are applied to the image itself (the `img` element) – like `styles`. Inline `styles` win over a class.
- The names get a unique prefix in the page, so they never clash with your own CSS classes or with another `ImgCast` on the same page.

## `animations`

Defines reusable animations for [`animate`](#animate). It is an object: the key is the animation's name, the value is its definition.

| Key of the definition | Meaning |
|-----------------------|---------|
| `"0%"` … `"100%"` | keyframes – an object of CSS properties the image has at that moment |
| `duration` | default duration in ms (default `1000`) |
| `timingFunction` | default CSS timing function (default `linear`) |

```json
"animations": {
  "click": {
    "0%":   { "transform": "scale(20)", "opacity": 0 },
    "50%":  { "transform": "scale(20)", "opacity": 1 },
    "95%":  { "transform": "scale(1)",  "opacity": 1 },
    "100%": { "transform": "scale(1)",  "opacity": 0 },
    "timingFunction": "linear",
    "duration": 500
  }
}
```

When the animation ends, the image returns to the state given by its `styles`.

## Complete example

A mouse cursor moves to a point, a "click" mark flashes there and the screenshot is replaced.

```json
{
  "steps": [
    { "cmd": "image", "id": "app", "url": "./ps-001.png" },
    { "cmd": "image", "id": "cursor", "url": "./cursor.svg", "x": "50%", "y": "50%" },
    { "cmd": "image", "id": "click", "url": "./mark.svg", "x": "-100%", "y": "0",
      "xa": "center", "ya": "center", "styles": { "opacity": 0 } },

    { "cmd": "slide", "id": "cursor", "x": "910px", "y": "184px", "duration": 1500, "timingFunction": "ease-in" },
    { "cmd": "set", "id": "click", "moveTo": "cursor" },
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
      "timingFunction": "linear",
      "duration": 500
    }
  }
}
```

A working script with images is in [`examples/sample-1`](../examples/sample-1/script.json).
