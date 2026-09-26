# Script format

**English** · [Čeština](script-format.cs.md)

A script is a JSON file that describes a scene: which images appear, where they move and which animations play.

```json
{
  "steps": [ /* commands, executed one after another */ ],
  "animations": { /* named CSS animations, optional */ },
  "slide-speed": "400pps",  /* optional, see Root keys */
  "zoom-speed": "1s"        /* optional, see Root keys */
}
```

- [Root keys](#root-keys)
- [Overview of commands](#overview-of-commands)
- [Positioning: `x`, `y`, `xa`, `ya`](#positioning)
- [Commands](#commands): [`image`](#image) · [`set`](#set) · [`slide`](#slide) · [`pause`](#pause) · [`animate`](#animate) · [`sub-steps`](#sub-steps) · [`await`](#await) · [`zoom-to`](#zoom-to)
- [Parallel steps: `async`, `awid`, `await`](#parallel-steps)
- [Following: `follow`](#following-images-follow)
- [Camera and zoom](#camera-and-zoom)
- [`animations`](#animations)
- [Complete example](#complete-example)

## Root keys

| Key | Meaning |
|-----|---------|
| `steps` | list of [commands](#commands) |
| `animations` | named [animations](#animations) for `animate` |
| `slide-speed` | default speed of every [`slide`](#slide) **without** `duration` (see below) |
| `zoom-speed` | default speed of every [`zoom-to`](#zoom-to) **without** `duration` (see below) |

`slide-speed` and `zoom-speed` have the same format – a number with a unit:

| Value | Meaning | Example |
|-------|---------|---------|
| `(number)s`, `(number)ms` | every movement takes this fixed time | `"1.5s"`, `"800ms"` |
| `(number)pps`, `(number)ppms` | constant speed in pixels per second / millisecond; the time is `distance / speed` | `"400pps"` |

The distance of a `slide` is the length of the move in pixels. The distance of a `zoom-to` is the distance the camera centre
travels; if only the zoom changes (the centre stays), it is the difference of the visible scene area (the diagonal of the change of the visible width and height).
An explicit `duration` in the step always wins. Without `duration` and without the matching root key the step is instant.
A wrong value (e.g. `"fast"`) is an error when `play()` starts.

## Overview of commands

Every item of `steps` is an object with the key `cmd` (the command name) and the command's parameters.
Steps run **in order**; the next one starts when the previous one is finished.

| `cmd` | What it does | Waits until |
|-------|--------------|-------------|
| [`image`](#image) | adds an image to the scene | immediately |
| [`set`](#set) | changes an existing image instantly | immediately |
| [`slide`](#slide) | smoothly moves an image | the movement ends |
| [`pause`](#pause) | waits | the time elapses |
| [`animate`](#animate) | plays a named animation on an image | immediately, or the animation ends (`wait`) |
| [`sub-steps`](#sub-steps) | runs a nested list of steps | all nested steps finish (unless `async`) |
| [`await`](#await) | waits for `async` steps | the given `awid`s finish |
| [`zoom-to`](#zoom-to) | moves / zooms the "camera" | the movement ends (unless `async`) |

## Positioning

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

| Key | Required | Meaning |
|-----|:--------:|---------|
| `id` | yes | identifier used by other commands |
| `url` | yes | image address; relative addresses are resolved against the script's location (see `baseUrl`) |
| `x`, `y` | no | position, see [Positioning](#positioning) |
| `xa`, `ya` | no | alignment, see [Positioning](#positioning) |
| `visible` | no | `true` (default) / `false` – hides the image without removing it |
| `move-to` | no | takes `x` and `y` from another image, see [`move-to`](#move-to) |
| `styles` | no | object of CSS properties applied to the image, e.g. `{ "opacity": 0 }` |
| `follow` | no | `id` of another image: when that image moves, this one moves with it, see [Following](#following-images-follow) |

```json
{ "cmd": "image", "id": "cursor", "url": "./cursor.svg", "x": "50%", "y": "50%" }
```

Images are stacked in the order they were added – later ones are on top.

#### `move-to`

Instead of writing coordinates you can refer to another image:

- the value is the `id` of an image that is **already defined**, otherwise it is an error;
- the image takes over the *current* position of that image (`x` and `y`);
- explicit `x` / `y` in the same step take precedence;
- alignment (`xa`, `ya`) is **not** taken over – the moved image keeps its own;
- the move is instant; use [`slide`](#slide) for a smooth one.

```json
{ "cmd": "set", "id": "click", "move-to": "cursor" }
```

### `set`

Instantly changes an existing image. Accepts the same parameters as [`image`](#image) (except `id`, which selects the image):
`url`, `x`, `y`, `xa`, `ya`, `visible`, `move-to`, `styles`, `follow` (`null` stops following). Only the given parameters change; `styles` are added to the existing ones.

```json
{ "cmd": "set", "id": "app", "url": "./ps-002.png" }
```

### `slide`

Smoothly moves an image to a new position.

| Key | Required | Meaning |
|-----|:--------:|---------|
| `id` | yes | which image moves |
| `x`, `y` | no | target position (the one you omit does not change) |
| `move-to` | no | move to the position of another image (`x`/`y` take precedence) |
| `duration` | no | duration in ms; without it [`slide-speed`](#root-keys) applies, otherwise `0` = instant |
| `timing-function` | no | CSS timing function: `linear` (default), `ease`, `ease-in`, `ease-out`, `ease-in-out`, `cubic-bezier(...)` |
| `async` | no | `true` = the next steps continue **at the same time** as the movement, see [Parallel steps](#parallel-steps) |
| `awid` | no | name of the async step for [`await`](#await) (only meaningful with `async`) |

The next step starts after the movement ends (unless `async` is `true`).

```json
{ "cmd": "slide", "id": "cursor", "x": "100px", "y": "100px", "duration": 500, "timing-function": "ease-in" }
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
| `timing-function` | no | CSS timing function; overrides the animation's default |

```json
{ "cmd": "animate", "id": "click", "animation": "click", "wait": true }
```

### `sub-steps`

A group of steps. It contains its own list of steps, in which further `sub-steps` can be nested to any depth.

| Key | Required | Meaning |
|-----|:--------:|---------|
| `steps` | yes | list of steps, the same format as `steps` in the script root |
| `async` | no | `true` = the steps that follow `sub-steps` continue **at the same time** as the group, see [Parallel steps](#parallel-steps) |
| `awid` | no | name of the async group for [`await`](#await) (only meaningful with `async`) |

The steps inside run in order. Without `async` the next step after `sub-steps` starts when the whole group is finished
(including its own async steps).

```json
{ "cmd": "sub-steps", "async": true, "awid": "intro", "steps": [
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

Normally the next step starts when the previous one is finished. The steps `slide`, `zoom-to` and `sub-steps` accept `async: true`:
they start and the script **continues immediately** with the next step, while they run in the background.

- `awid` gives an async step a name. Names are shared by the whole script (also across nesting levels), so `await`
  can wait for a step defined in another group. Reusing a name replaces the earlier one.
- [`await`](#await) waits for the named steps.
- A list of steps (the root, or a `sub-steps` group) never ends before all its async steps have ended – so `end`
  is fired (and a non-async `sub-steps` finishes) only after everything has run.
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

### `zoom-to`

Moves and zooms the "camera" – the visible part of the scene. It affects **everything** in the scene (all images).
At the start the camera shows the whole scene (zoom `1`, centre in the middle).

| Key | Required | Meaning |
|-----|:--------:|---------|
| `zoom` | no | magnification: `1` = whole scene, `2` = twice as large (half of the scene is visible); omitted = keeps the current zoom |
| `x`, `y` | no | centre of the view in scene coordinates ([Positioning](#positioning) units); the omitted axis keeps its value |
| `zoom-to` | no | `id` of an image: one-off set of the centre to that image's current position (like [`move-to`](#move-to)); `x`/`y` take precedence |
| `follow` | no | `id` of an image: the centre **keeps following** it on every movement – even after the command has finished |
| `nzax`, `nzay` | no | "no-zoom area": the size of the area around the centre of the view in which the followed point can move without moving the camera; `px` (screen pixels) or `%` of the scene width / height; default `0` |
| `duration` | no | time the camera needs to get there, in ms; without it [`zoom-speed`](#root-keys) applies, otherwise instant |
| `timing-function` | no | CSS timing function (`linear` default) |
| `async`, `awid` | no | run in parallel, see [Parallel steps](#parallel-steps) |

```json
{ "cmd": "zoom-to", "zoom": 2, "x": "300px", "y": "200px", "duration": 800, "timing-function": "ease-in-out" }
```

The rules:

- The target of the centre is chosen in this order: `follow` → `zoom-to` → `x`/`y` (the first present wins; `follow` ignores the others). If none is present, the centre stays and only the zoom changes.
- `follow` stays active until another `zoom-to` sets a different target (`follow`, `zoom-to`, `x`, `y`) – then the camera stops following.
  A `zoom-to` that changes only `zoom` (or the `nza*` values) keeps following. Following ends with playback (the framing stays).
- The followed point is the image's position `x`, `y` (its anchor, see [`xa`, `ya`](#positioning)), not its centre.
- With `nzax`/`nzay` the camera **does not move** while the point is inside the area; when it leaves it, the camera moves just enough
  for the point to be on the edge of the area. Handy for a cursor that only gets a little bit off-centre.
- A new `zoom-to` interrupts the previous one that is still running.

```json
{ "cmd": "zoom-to", "follow": "cursor", "zoom": 2, "nzax": "30%", "nzay": "30%", "duration": 600 }
```

## Following images: `follow`

The `follow` parameter of `image` / `set` makes the image a **follower** of another one:

```json
{ "cmd": "image", "id": "badge", "url": "./badge.svg", "x": "20px", "y": "-30px", "follow": "cursor" }
```

- Whenever the followed image moves (`slide`, `set` with `x`/`y`/`move-to`), every follower moves by **the same distance**.
  The position given for the follower is the starting offset; it keeps it afterwards.
- With a `slide` the followers move at the same time and with the same `duration` and `timing-function`, so they stay in place relative to the leader.
- It works in chains (A follows B follows C) and any number of followers may follow one image. Cycles are safe.
- Moving the follower itself does not move the leader. `"follow": null` in `set` ends the following.

## Camera and zoom

Zooming enlarges the **whole scene** – the camera only decides which part of it is visible; the coordinates `x`, `y` of images do not change.
The container's size stays the same and what is outside the view is cut off. `%` in `x`/`y` always relate to the whole (non-zoomed) scene.
See [`zoom-to`](#zoom-to). The camera is reset on every `play()` and `reset()`.

## `animations`

Defines reusable animations for [`animate`](#animate). It is an object: the key is the animation's name, the value is its definition.

| Key of the definition | Meaning |
|-----------------------|---------|
| `"0%"` … `"100%"` | keyframes – an object of CSS properties the image has at that moment |
| `duration` | default duration in ms (default `1000`) |
| `timing-function` | default CSS timing function (default `linear`) |

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

A working script with images is in [`examples/sample-1`](../examples/sample-1/script.json).
