# Changelog

**English** · [Čeština](CHANGELOG.cs.md)

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer](https://semver.org/).

## [1.1.0] - 2026-09-26

### Added
- `follow` parameter of images (`image`, `set`): followers move together with the followed image.
- `zoom-to` command – camera zoom and pan with `zoom`, `x`/`y`, `zoom-to`, `follow`, `nzax`/`nzay`, `duration`, `timing-function`, `async`.
- Root keys `slide-speed` and `zoom-speed` (`s`, `ms`, `pps`, `ppms`).
- Example `examples/sample-3` (follow, zoom-to, speeds).
- `async` parameter for `slide`: following steps continue while the slide runs.
- `sub-steps` command – nested (recursive) lists of steps, optionally `async`.
- `awid` parameter for async steps and the `await` command (string or array of `awid`s).
- Example `examples/sample-2` (async slides, `sub-steps`, `await`) and a sample selector on the example page.
- `step` event now also fires for nested steps and carries `detail.path`.

## [1.0.0] - 2026-09-26

### Added
- `ImgCast` class – a JSON script player with no dependencies, independent of any framework.
- Commands `image`, `set`, `slide`, `pause`, `animate` and predefined CSS animations (`animations`).
- `move-to` parameter for `image`, `set` and `slide` (move to the position of another image).
- `styles` parameter for `image` and `set` (CSS styles of the image).
- `speed` option / `cast.speed` property for speeding up and slowing down playback.
- Methods `play()`, `stop()`, `reset()`, static `ImgCast.load()`, events `step` and `end`.
- TypeScript declarations (`src/img-cast.d.ts`).
- Example page `examples/index.html`.
