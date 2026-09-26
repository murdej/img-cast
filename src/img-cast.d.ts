export interface ImgCastOptions {
  /** Base for relative image `url`s. Defaults to `document.baseURI`. */
  baseUrl?: string;
  /** Playback speed (1 = normal). Defaults to 1. */
  speed?: number;
}

export interface ImageStyles {
  [cssProperty: string]: string | number;
}

export type Length = number | string;

export interface ImageParams {
  url?: string;
  xa?: 'left' | 'right' | 'center' | `${number}%`;
  ya?: 'top' | 'bottom' | 'center' | `${number}%`;
  x?: Length;
  y?: Length;
  visible?: boolean;
  /** id of an existing image whose position to move to */
  'move-to'?: string;
  styles?: ImageStyles;
  /** id of another image; this image moves whenever that one moves. `null` stops following. */
  follow?: string | null;
}

export interface ImageStep extends ImageParams {
  cmd: 'image';
  id: string;
}

export interface SetStep extends ImageParams {
  cmd: 'set';
  id: string;
}

export interface SlideStep {
  cmd: 'slide';
  id: string;
  x?: Length;
  y?: Length;
  'move-to'?: string;
  /** ms */
  duration?: number;
  'timing-function'?: string;
  /** Continue with the next steps while the slide is running. */
  async?: boolean;
  /** Name for `await` (used with `async`). */
  awid?: string;
}

export interface SubStepsStep {
  cmd: 'sub-steps';
  /** Nested list of steps; may contain further `sub-steps`. */
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
  'timing-function'?: string;
}

export interface ZoomToStep {
  cmd: 'zoom-to';
  /** Magnification; 1 = the whole scene. Omitted = unchanged. */
  zoom?: number;
  x?: Length;
  y?: Length;
  /** id of an image: one-off set of the centre to its position. */
  'zoom-to'?: string;
  /** id of an image the centre keeps following. */
  follow?: string;
  /** Size of the area around the view centre where the followed point can move without moving the camera (px or %). */
  nzax?: Length;
  nzay?: Length;
  /** ms */
  duration?: number;
  'timing-function'?: string;
  async?: boolean;
  awid?: string;
}

export type Step =
  | ImageStep
  | SetStep
  | SlideStep
  | PauseStep
  | AnimateStep
  | SubStepsStep
  | AwaitStep
  | ZoomToStep;

/** `(number)s|ms` = fixed time, `(number)pps|ppms` = pixels per second / millisecond. */
export type SpeedString = string;

export interface AnimationDefinition {
  'timing-function'?: string;
  duration?: number;
  [keyframe: `${number}%`]: Record<string, string | number>;
}

export interface Script {
  steps: Step[];
  animations?: Record<string, AnimationDefinition>;
  /** Default speed of `slide` steps without `duration`. */
  'slide-speed'?: SpeedString;
  /** Default speed of `zoom-to` steps without `duration`. */
  'zoom-speed'?: SpeedString;
}

export interface ImgCastEventMap {
  step: CustomEvent<{ index: number; step: Step; path: number[] }>;
  end: Event;
}

export class ImgCast extends EventTarget {
  constructor(container: HTMLElement, script: Script, options?: ImgCastOptions);

  /** Loads the script from a URL; relative image URLs are resolved against it. */
  static load(container: HTMLElement, url: string, options?: ImgCastOptions): Promise<ImgCast>;

  readonly container: HTMLElement;
  readonly script: Script;
  readonly baseUrl: string;
  readonly playing: boolean;
  /** Playback speed; a positive number, applies from the next step. */
  speed: number;

  /** Plays the script from the start; resolves when playback ends or after `stop()`. */
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
