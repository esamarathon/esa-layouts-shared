import clone from 'clone';
import { EventEmitter } from 'events';
import type { NodeCG } from 'nodecg/types/server';
import ObsWebsocketJs from '@duncte123/obs-websocket-js';
import { findBestMatch } from 'string-similarity';
import { OBS as OBSTypes } from '../../../types';
import { IObs } from './IObs';

class OBS extends EventEmitter implements IObs {
  private nodecg: NodeCG;
  private config: OBSTypes.Config;
  private conn = new ObsWebsocketJs();
  currentScene: string | undefined;
  sceneList: string [] = [];
  connected = false;
  streaming: boolean | undefined;

  constructor(nodecg: NodeCG, config: OBSTypes.Config) {
    super();
    this.nodecg = nodecg;
    this.config = config;

    if (config.enabled) {
      nodecg.log.info('[OBS] Setting up connection');
      this.connect();

      this.registerObsEvents();
    }
  }

  async connect(): Promise<void> {
    try {
      await this.conn.connect({
        address: this.config.address,
        password: this.config.password,
      });
      this.connected = true;
      const scenes = await this.conn.send('GetSceneList');

      // Get current scene on connection.
      const lastScene = this.currentScene;
      if (lastScene !== scenes['current-scene']) {
        this.currentScene = scenes['current-scene'];
      }

      // Get scene list on connection.
      const oldList = clone(this.sceneList);
      const newList = scenes.scenes.map((s) => s.name);
      if (JSON.stringify(newList) !== JSON.stringify(oldList)) {
        this.sceneList = newList;
      }

      // Get streaming status on connection.
      const streamingStatus = await this.conn.send('GetStreamingStatus');
      const lastStatus = this.streaming;
      if (streamingStatus.streaming !== lastStatus) {
        this.streaming = streamingStatus.streaming;
      }

      // Emit changes after everything start up related has finished.
      this.emit('connectionStatusChanged', this.connected);
      if (lastScene !== scenes['current-scene']) {
        this.emit('currentSceneChanged', this.currentScene, lastScene);
      }
      if (JSON.stringify(newList) !== JSON.stringify(oldList)) {
        this.emit('sceneListChanged', this.sceneList);
      }
      if (streamingStatus.streaming !== lastStatus) {
        this.emit('streamingStatusChanged', this.streaming, lastStatus);
      }

      this.nodecg.log.info('[OBS] Connection successful');
    } catch (err) {
      this.conn.disconnect();
      this.nodecg.log.warn('[OBS] Connection error');
      this.nodecg.log.debug('[OBS] Connection error:', err);
    }
  }

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

  isCurrentScene(name: string): boolean {
    return !!this.currentScene && this.currentScene === this.findScene(name);
  }

  async changeScene(name: string): Promise<void> {
    if (!this.config.enabled || !this.connected) {
      // OBS not enabled, don't even try to set.
      throw new Error('No OBS connection available');
    }
    try {
      const scene = this.findScene(name);
      if (scene) {
        await this.conn.send('SetCurrentScene', { 'scene-name': scene });
      } else {
        throw new Error('Scene could not be found');
      }
    } catch (err) {
      this.nodecg.log.warn(`[OBS] Cannot change scene [${name}]`);
      this.nodecg.log.debug(`[OBS] Cannot change scene [${name}]: ${err.error || err}`);
      throw err;
    }
  }
  async getSourceSettings(sourceName: string): Promise<{
    messageId: string;
    status: 'ok';
    sourceName: string;
    sourceType: string;
    sourceSettings: Record<string, unknown>;
  }> {
    if (!this.config.enabled || !this.connected) {
      // OBS not enabled, don't even try to set.
      throw new Error('No connection available');
    }
    try {
      const resp = await this.conn.send('GetSourceSettings', { sourceName });
      return resp;
    } catch (err) {
      this.nodecg.log.warn(`[OBS] Cannot get source settings [${sourceName}]`);
      this.nodecg.log.debug(`[OBS] Cannot get source settings [${sourceName}]: `
    + `${err.error || err}`);
      throw err;
    }
  }
  // eslint-disable-next-line max-len
  async setSourceSettings(sourceName: string, sourceType: string | undefined, sourceSettings: Record<string, unknown>): Promise<void> {
    if (!this.config.enabled || !this.connected) {
      // OBS not enabled, don't even try to set.
      throw new Error('No connection available');
    }
    try {
      await this.conn.send('SetSourceSettings', {
        sourceName,
        sourceType,
        sourceSettings,
      });
    } catch (err) {
      this.nodecg.log.warn(`[OBS] Cannot set source settings [${sourceName}]`);
      this.nodecg.log.debug(`[OBS] Cannot set source settings [${sourceName}]: `
    + `${err.error || err}`);
      throw err;
    }
  }
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
      await this.conn.send('SetSceneItemProperties', {
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

  async takeScreenshot(sourceName: string): Promise<string> {
    const screenshot = await this.conn.send('TakeSourceScreenshot', {
      sourceName,
      embedPictureFormat: 'png',
      height: 360,
    });

    return screenshot.img;
  }

  stopMedia(sourceName: string): Promise<void> {
    return this.conn.send('StopMedia', {
      sourceName,
    });
  }

  private registerObsEvents() {
    this.conn.on('ConnectionClosed', () => {
      this.connected = false;
      this.emit('connectionStatusChanged', this.connected);
      this.nodecg.log.warn('[OBS] Connection lost, retrying in 5 seconds');
      setTimeout(() => this.connect(), 5000);
    });

    this.conn.on('SwitchScenes', (data) => {
      const lastScene = this.currentScene;
      if (lastScene !== data['scene-name']) {
        this.currentScene = data['scene-name'];
        this.emit('currentSceneChanged', this.currentScene, lastScene);
      }
    });

    this.conn.on('ScenesChanged', async () => {
      const scenes = await this.conn.send('GetSceneList');
      this.sceneList = scenes.scenes.map((s) => s.name);
      this.emit('sceneListChanged', this.sceneList);
    });

    this.conn.on('StreamStarted', () => {
      this.streaming = true;
      this.emit('streamingStatusChanged', this.streaming, !this.streaming);
    });

    this.conn.on('StreamStopped', () => {
      this.streaming = false;
      this.emit('streamingStatusChanged', this.streaming, !this.streaming);
    });

    this.conn.on('error', (err) => {
      this.nodecg.log.warn('[OBS] Connection error');
      this.nodecg.log.debug('[OBS] Connection error:', err);
    });

    this.conn.on('TransitionBegin', (data) => {
      this.emit('TransitionBegin', data);
    });

    this.conn.on('TransitionEnd', () => {
      this.emit('TransitionEnd');
    });

    this.conn.on('MediaEnded', (data) => {
      this.emit('MediaEnded', data);
    });
  }
}

export default OBS;
