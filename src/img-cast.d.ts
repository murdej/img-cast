export interface ImgCastOptions {
  /** Base for relative image `url`s. Defaults to `document.baseURI`. */
  baseUrl?: string;
  /** Playback speed (1 = normal). Defaults to 1. */
  speed?: number;
  /** Loop: `true` = forever, a number = total number of plays, `false` = play once (default). */
  loop?: boolean | number;
}

export interface ImageStyles {
  [cssProperty: string]: string | number;
}

/** A number or a string: no unit = px, otherwise a CSS length (`"50%"`, `"10em"`). */
export type Length = number | string;

/** `(number)s|ms` = fixed time, `(number)pps|ppms` = pixels per second / millisecond. */
export type SpeedString = string;

/** Parameters shared by all scene objects (`image`, `label`). */
export interface ObjectParams {
  xa?: 'left' | 'right' | 'center' | `${number}%`;
  ya?: 'top' | 'bottom' | 'center' | `${number}%`;
  x?: Length;
  y?: Length;
  visible?: boolean;
  /** id of an existing image whose position to move to */
  moveTo?: string;
  styles?: ImageStyles;
  /** id of another image; this image moves whenever that one moves. `null` stops following. */
  follow?: string | null;
  /** Class(es) from the root `cssClasses`. In `set` it replaces the classes; `null` removes them. */
  cssClass?: string | string[] | null;
  /** `true` = not affected by the camera (`zoomTo`): keeps its size and screen position. */
  fixed?: boolean;
}

export interface ImageParams extends ObjectParams {
  url?: string;
}

export interface LabelParams extends ObjectParams {
  /** Plain text (`text` or `html`, not both). */
  text?: string;
  /** HTML content – inserted as-is, use only trusted scripts. */
  html?: string;
}

export interface ImageStep extends ImageParams {
  cmd: 'image';
  id: string;
}

export interface LabelStep extends LabelParams {
  cmd: 'label';
  id: string;
}

/** Changes an existing object; `url` is for images, `text`/`html` for labels. */
export interface SetStep extends ObjectParams {
  cmd: 'set';
  id: string;
  url?: string;
  text?: string;
  html?: string;
}

export interface SlideStep {
  cmd: 'slide';
  id: string;
  x?: Length;
  y?: Length;
  moveTo?: string;
  /** ms */
  duration?: number;
  timingFunction?: string;
  /** Continue with the next steps while the slide is running. */
  async?: boolean;
  /** Name for `await` (used with `async`). */
  awid?: string;
}

export interface SubStepsStep {
  cmd: 'subSteps';
  /** Nested list of steps; may contain further `subSteps`. */
  steps: Step[];
  /** Continue with the next steps while this group is running. */
  async?: boolean;
  /** Name for `await` (used with `async`). */
  awid?: string;
}

export interface AwaitStep {
  cmd: 'await';
  /** `awid`(s) of async steps to wait for. */
  awid: string | string[];
}

export interface PauseStep {
  cmd: 'pause';
  /** ms */
  duration?: number;
}

export interface AnimateStep {
  cmd: 'animate';
  id: string;
  animation: string;
  wait?: boolean;
  duration?: number;
  timingFunction?: string;
}

export interface ZoomToStep {
  cmd: 'zoomTo';
  /** Magnification; 1 = the whole scene. Omitted = unchanged. */
  zoom?: number;
  x?: Length;
  y?: Length;
  /** id of an image: one-off set of the centre to its position. */
  zoomTo?: string;
  /** id of an image the centre keeps following. */
  follow?: string;
  /** Size of the area around the view centre where the followed point can move without moving the camera (px or %). */
  nzax?: Length;
  nzay?: Length;
  /** ms */
  duration?: number;
  timingFunction?: string;
  async?: boolean;
  awid?: string;
}

/** Runs a macro from the root `macros`. */
export interface CallStep {
  cmd: 'call';
  /** Key (or `name`) of the macro. */
  name: string;
  /** Values of the macro's arguments. */
  args?: Record<string, unknown>;
  async?: boolean;
  awid?: string;
}

export type Step =
  | ImageStep
  | LabelStep
  | SetStep
  | SlideStep
  | PauseStep
  | AnimateStep
  | SubStepsStep
  | AwaitStep
  | ZoomToStep
  | CallStep;

export interface Macro {
  name: string;
  /** Steps; string values may use `$(argumentName)`. */
  steps: Step[];
  /** Arguments: a name, or a name with a default value. */
  args?: (string | { name: string; default?: unknown })[];
}

export type Macros = Record<string, Macro>;

/** CSS class name → { CSS property → value }. */
export type CssClasses = Record<string, Record<string, string | number>>;

export interface AnimationDefinition {
  timingFunction?: string;
  duration?: number;
  [keyframe: `${number}%`]: Record<string, string | number>;
}

export interface Script {
  steps: Step[];
  animations?: Record<string, AnimationDefinition>;
  macros?: Macros;
  cssClasses?: CssClasses;
  /** Default speed of `slide` steps without `duration`. */
  slideSpeed?: SpeedString;
  /** Default speed of `zoomTo` steps without `duration`. */
  zoomSpeed?: SpeedString;
}

/** Helper for writing a script in TypeScript: returns its argument, checks it against `Script` (typos in keys are reported). */
export function defineScript(script: Script): Script;

/**
 * Converts a script in the legacy `kebab-case` format (`move-to`, `timing-function`, `sub-steps`, ...)
 * to the primary `camelCase`. Names of animations, macros, arguments, classes and CSS properties are kept.
 * Returns a new object. Called automatically by the constructor and `ImgCast.load`.
 */
export function normalizeScript(script: unknown): Script;

export interface ImgCastEventMap {
  step: CustomEvent<{ index: number; step: Step; path: number[] }>;
  /** Fired when the script is about to start over because of `loop`. `iteration` = completed plays. */
  loop: CustomEvent<{ iteration: number }>;
  end: Event;
}

export class ImgCast extends EventTarget {
  /** `script` may also be a parsed JSON in the legacy kebab-case format – it is converted. */
  constructor(container: HTMLElement, script: Script, options?: ImgCastOptions);

  /** Loads the script from a URL; relative image URLs are resolved against it. */
  static load(container: HTMLElement, url: string, options?: ImgCastOptions): Promise<ImgCast>;

  readonly container: HTMLElement;
  /** The script in camelCase (after `normalizeScript`). */
  readonly script: Script;
  readonly baseUrl: string;
  readonly playing: boolean;
  /** Playback speed; a positive number, applies from the next step. */
  speed: number;
  /** `false` = once, `true` = forever, a number = total number of plays. */
  loop: boolean | number;

  /** Preloads all images of the script (including nested steps and macros called via `call`). */
  preload(): Promise<void>;
  /** Plays the script from the start (repeatedly with `loop`); resolves when playback ends or after `stop()`. */
  play(): Promise<void>;
  /** Stops playback, the scene stays. */
  stop(): void;
  /** Stops playback and clears the scene. */
  reset(): void;

  addEventListener<K extends keyof ImgCastEventMap>(
    type: K,
    listener: (ev: ImgCastEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
}
