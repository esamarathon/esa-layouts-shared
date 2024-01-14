import type NodeCGTypes from '@nodecg/types';
import clone from 'clone';
import { EventEmitter } from 'events';
import OBSWebSocket from 'obs-websocket-js';
import { findBestMatch } from 'string-similarity';
import { OBS as OBSTypes } from '../../../types';

interface OBS {
  on(event: 'streamingStatusChanged', listener: (streaming: boolean, old?: boolean) => void): this;
  on(event: 'connectionStatusChanged', listener: (connected: boolean) => void): this;
  on(event: 'currentSceneChanged', listener: (current?: string, last?: string) => void): this;
  on(event: 'sceneListChanged', listener: (list: string[]) => void): this;
}

class OBS extends EventEmitter {
  private nodecg: NodeCGTypes.ServerAPI;
  private config: OBSTypes.Config;
  conn = new OBSWebSocket();
  currentScene: string | undefined;
  sceneList: string [] = [];
  connected = false;
  streaming: boolean | undefined;

  constructor(nodecg: NodeCGTypes.ServerAPI, config: OBSTypes.Config) {
    super();
    this.nodecg = nodecg;
    this.config = config;

    if (config.enabled) {
      nodecg.log.info('[OBS] Setting up connection');
      this.connect();

      this.conn.on('ConnectionClosed', () => {
        this.connected = false;
        this.emit('connectionStatusChanged', this.connected);
        nodecg.log.warn('[OBS] Connection lost, retrying in 5 seconds');
        setTimeout(() => this.connect(), 5000);
      });

      this.conn.on('CurrentProgramSceneChanged', (data) => {
        const lastScene = this.currentScene;
        if (lastScene !== data.sceneName) {
          this.currentScene = data.sceneName;
          this.emit('currentSceneChanged', this.currentScene, lastScene);
        }
      });

      this.conn.on('SceneListChanged', async ({ scenes }) => {
        this.sceneList = scenes.map((s) => s.name as string);
        this.emit('sceneListChanged', this.sceneList);
      });

      this.conn.on('StreamStateChanged', ({ outputActive }) => {
        this.streaming = outputActive;
        this.emit('streamingStatusChanged', this.streaming, !this.streaming);
      });

      // @ts-expect-error TS2345 error is being fired I think
      this.conn.on('error', (err) => {
        nodecg.log.warn('[OBS] Connection error');
        nodecg.log.debug('[OBS] Connection error:', err);
      });
    }
  }

  async connect(): Promise<void> {
    try {
      await this.conn.connect(this.config.address, this.config.password);
      this.connected = true;
      const scenes = await this.conn.call('GetSceneList');

      // Get current scene on connection.
      const lastScene = this.currentScene;
      if (lastScene !== scenes.currentProgramSceneName) {
        this.currentScene = scenes.currentProgramSceneName;
      }

      // Get scene list on connection.
      const oldList = clone(this.sceneList);
      const newList = scenes.scenes.map((s) => s.name as string);
      if (JSON.stringify(newList) !== JSON.stringify(oldList)) {
        this.sceneList = newList;
      }

      // Get streaming status on connection.
      const streamingStatus = await this.conn.call('GetStreamStatus');
      const lastStatus = this.streaming;
      if (streamingStatus.outputActive !== lastStatus) {
        this.streaming = streamingStatus.outputActive;
      }

      // Emit changes after everything start up related has finished.
      this.emit('connectionStatusChanged', this.connected);
      if (lastScene !== scenes.currentProgramSceneName) {
        this.emit('currentSceneChanged', this.currentScene, lastScene);
      }
      if (JSON.stringify(newList) !== JSON.stringify(oldList)) {
        this.emit('sceneListChanged', this.sceneList);
      }
      if (streamingStatus.outputActive !== lastStatus) {
        this.emit('streamingStatusChanged', this.streaming, lastStatus);
      }

      this.nodecg.log.info('[OBS] Connection successful');
    } catch (err) {
      this.conn.disconnect();
      this.nodecg.log.warn('[OBS] Connection error');
      this.nodecg.log.debug('[OBS] Connection error:', err);
    }
  }

  /**
   * Find scene based on string; at least the start of the name should be supplied.
   * @param name Name of scene, at least starting of name.
   */
  findScene(name: string): string | undefined {
    let match: string | undefined;
    const matches = this.sceneList.filter((s) => s.startsWith(name));
    if (matches.length > 1) {
      const bestMatches = findBestMatch(name, matches);
      match = bestMatches.bestMatch.target;
    } else if (matches.length === 1) {
      [match] = matches;
    }
    return match;
  }

  /**
   * Check if we are on a specified scene; at least the start of the name should be supplied.
   * @param name Name of scene to check we are on, at least starting of name.
   */
  isCurrentScene(name: string): boolean {
    return !!this.currentScene && this.currentScene === this.findScene(name);
  }

  /**
   * Change to the OBS scene with the closest matched name.
   * @param name Name of the scene.
   */
  async changeScene(name: string): Promise<void> {
    if (!this.config.enabled || !this.connected) {
      // OBS not enabled, don't even try to set.
      throw new Error('No OBS connection available');
    }
    try {
      const scene = this.findScene(name);
      if (scene) {
        await this.conn.call('SetCurrentProgramScene', {
          sceneName: scene,
        });
      } else {
        throw new Error('Scene could not be found');
      }
    } catch (err) {
      this.nodecg.log.warn(`[OBS] Cannot change scene [${name}]`);
      this.nodecg.log.debug(`[OBS] Cannot change scene [${name}]: ${err.error || err}`);
      throw err;
    }
  }

  /**
   * Get named source's current settings.
   * @param sourceName Name of the source.
   */
  async getSourceSettings(sourceName: string): Promise<{
    inputKind: string;
    sourceSettings: Record<string, unknown>;
  }> {
    if (!this.config.enabled || !this.connected) {
      // OBS not enabled, don't even try to set.
      throw new Error('No connection available');
    }
    try {
      const resp = await this.conn.call('GetInputSettings', {
        inputName: sourceName,
      });
      return {
        inputKind: resp.inputKind,
        sourceSettings: resp.inputSettings,
      };
    } catch (err) {
      this.nodecg.log.warn(`[OBS] Cannot get source settings [${sourceName}]`);
      this.nodecg.log.debug(`[OBS] Cannot get source settings [${sourceName}]: `
        + `${err.error || err}`);
      throw err;
    }
  }

  /**
   * Modify a sources settings.
   * @param sourceName Name of the source.
   * @param sourceType Source type (has the be the internal name, not the display name).
   * @param sourceSettings Settings you wish to pass to OBS to change.
   */
  // eslint-disable-next-line max-len
  async setSourceSettings(sourceName: string, sourceType: string, sourceSettings: Record<string, unknown>): Promise<void> {
    if (!this.config.enabled || !this.connected) {
      // OBS not enabled, don't even try to set.
      throw new Error('No connection available');
    }
    try {
      await this.conn.call('SetInputSettings', {
        inputName: sourceName,
        inputSettings: sourceSettings as never,
        overlay: true,
      });
    } catch (err) {
      this.nodecg.log.warn(`[OBS] Cannot set source settings [${sourceName}]`);
      this.nodecg.log.debug(`[OBS] Cannot set source settings [${sourceName}]: `
        + `${err.error || err}`);
      throw err;
    }
  }

  /**
   * Resets the scene item, then sets some properties if possible.
   * @param scene Name of scene that item is in
   * @param item Name of item
   * @param area Area object (as used in capturePositions): x, y, width, height
   * @param crop Crop object: top, bottom, left, right
   * @param visible If the source should be visible or not
   */
  async configureSceneItem(
    scene: string,
    item: string,
    area?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    },
    crop?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    },
    visible?: boolean,
  ): Promise<void> {
    try {
      if (!this.config.enabled || !this.connected) {
        // OBS not enabled, don't even try to set.
        throw new Error('No connection available');
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: Typings say we need to specify more than we actually do.
      await this.conn.call('SetSceneItemProperties', {
        'scene-name': scene,
        item: { name: item },
        visible: visible ?? true,
        position: {
          x: area?.x ?? 0,
          y: area?.y ?? 0,
        },
        bounds: {
          type: 'OBS_BOUNDS_STRETCH',
          x: area?.width ?? 1920,
          y: area?.height ?? 1080,
        },
        crop: {
          top: crop?.top ?? 0,
          bottom: crop?.bottom ?? 0,
          left: crop?.left ?? 0,
          right: crop?.right ?? 0,
        },
      });
    } catch (err) {
      this.nodecg.log.warn(`[OBS] Cannot configure scene item [${scene}: ${item}]`);
      this.nodecg.log.debug(`[OBS] Cannot configure scene item [${scene}: ${item}]: `
        + `${err.error || err}`);
      throw err;
    }
  }
}

export default OBS;
