import { EventEmitter } from 'events';

export interface IObsArea {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface IObsCrop {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

// TODO: EventEmitter3? Allows for better typing
// TODO: Unify v4 events emitted by class
export interface IObs {
  on(event: 'streamingStatusChanged', listener: (streaming: boolean, old?: boolean) => void): this;
  on(event: 'connectionStatusChanged', listener: (connected: boolean) => void): this;
  on(event: 'currentSceneChanged', listener: (current?: string, last?: string) => void): this;
  on(event: 'sceneListChanged', listener: (list: string[]) => void): this;

  // Adapted obs events
  on(event: 'TransitionBegin', listener: (data: object) => void): this;
  on(event: 'TransitionEnd', listener: () => void): this;
  on(event: 'MediaEnded', listener: (data: { sourceName: string }) => void): this;

  connect(): Promise<void>;

  /**
   * Find scene based on string; at least the start of the name should be supplied.
   * @param name Name of scene, at least starting of name.
   */
  findScene(name: string): string | undefined;

  /**
   * Check if we are on a specified scene; at least the start of the name should be supplied.
   * @param name Name of scene to check we are on, at least starting of name.
   */
  isCurrentScene(name: string): boolean;

  /**
   * Change to the OBS scene with the closest matched name.
   * @param name Name of the scene.
   */
  changeScene(name: string): Promise<void>;

  // TODO: keep? Where are these two this used?
  /**
   * Get named source's current settings.
   * @param name Name of the source.
   */
  getSourceSettings(name: string): Promise<object>;

  /**
   * Modify a sources settings.
   * @param name Name of the source.
   * @param type Source type (has the be the internal name, not the display name).
   * @param settings Settings you wish to pass to OBS to change.
   */
  setSourceSettings(name: string, type: string | undefined, settings: Record<string, unknown>): Promise<void>;

  /**
   * Resets the scene item, then sets some properties if possible.
   * @param scene Name of scene that item is in
   * @param item Name of item
   * @param area Area object (as used in capturePositions): x, y, width, height
   * @param crop Crop object: top, bottom, left, right
   * @param visible If the source should be visible or not
   */
  // eslint-disable-next-line max-len
  configureSceneItem(scene: string, item: string, area?: IObsArea, crop?: IObsCrop, visible?: boolean): Promise<void>;

  takeScreenshot(sourceName: string): Promise<string>;

  stopMedia(sourceName: string): Promise<void>;
}
