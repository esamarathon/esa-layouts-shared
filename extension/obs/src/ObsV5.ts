import { EventEmitter } from 'events';
import type { NodeCG } from 'nodecg/types/server';
import ObsWebsocketJs from 'obs-websocket-js';
import { OBS as OBSTypes } from '../../../types';
import { IObs, IObsArea, IObsCrop } from './IObs';

export default class ObsV5 extends EventEmitter implements IObs {
  // TODO: implement
  conn = new ObsWebsocketJs();

  constructor(nodecg: NodeCG, config: OBSTypes.Config) {
    super();
  }

  changeScene(name: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  configureSceneItem(scene: string, item: string, area?: IObsArea, crop?: IObsCrop, visible?: boolean): Promise<void> {
    return Promise.resolve(undefined);
  }

  connect(): Promise<void> {
    return Promise.resolve(undefined);
  }

  findScene(name: string): string | undefined {
    return undefined;
  }

  getSourceSettings(name: string): Promise<object> {
    return Promise.resolve({});
  }

  isCurrentScene(name: string): boolean {
    return false;
  }

  setSourceSettings(name: string, type: string, settings: Record<string, unknown>): Promise<void> {
    return Promise.resolve(undefined);
  }
}
