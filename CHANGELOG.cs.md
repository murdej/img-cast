# Changelog

[English](CHANGELOG.md) · **Čeština**

Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verzování podle [SemVer](https://semver.org/lang/cs/).

## [Unreleased]

### Added
- Parametr `follow` u obrázků (`image`, `set`): následovníci se pohybují spolu se sledovaným obrázkem.
- Příkaz `zoom-to` – zoom a posun kamery s parametry `zoom`, `x`/`y`, `zoom-to`, `follow`, `nzax`/`nzay`, `duration`, `timing-function`, `async`.
- Klíče v kořeni `slide-speed` a `zoom-speed` (`s`, `ms`, `pps`, `ppms`).
- Ukázka `examples/sample-3` (follow, zoom-to, rychlosti).
- Parametr `async` u `slide`: další kroky pokračují zároveň s pohybem.
- Příkaz `sub-steps` – vnořené (rekurzivní) seznamy kroků, volitelně `async`.
- Parametr `awid` u async kroků a příkaz `await` (řetězec nebo pole `awid`).
- Ukázka `examples/sample-2` (async slide, `sub-steps`, `await`) a výběr ukázky na ukázkové stránce.
- Událost `step` se nově vyvolává i pro vnořené kroky a obsahuje `detail.path`.

## [1.0.0] - 2026-09-26

### Added
- Třída `ImgCast` – přehrávač scriptu v JSON, bez závislostí a nezávislý na frameworku.
- Příkazy `image`, `set`, `slide`, `pause`, `animate` a předdefinované CSS animace (`animations`).
- Parametr `move-to` pro `image`, `set` a `slide` (přesun na pozici jiného image).
- Parametr `styles` u `image` a `set` (CSS styly obrázku).
- Volba `speed` / vlastnost `cast.speed` pro zrychlení a zpomalení přehrávání.
- Metody `play()`, `stop()`, `reset()`, statická `ImgCast.load()`, události `step` a `end`.
- TypeScript deklarace (`src/img-cast.d.ts`).
- Ukázková stránka `examples/index.html`.
