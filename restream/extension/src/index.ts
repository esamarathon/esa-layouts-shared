/* eslint-disable max-classes-per-file */

import { EventEmitter } from 'events';
import type { NodeCG, Replicant } from 'nodecg/types/server';
import path from 'path';
import SpeedcontrolUtil from 'speedcontrol-util';
import { v4 as uuid } from 'uuid';
import WebSocket from 'ws';
import { RestreamData } from '../../../schemas';
import { Restream as RestreamTypes } from '../../../types';

/**
 * Calculates the absolute file path to one of our local replicant schemas.
 * @param schemaName the replicant/schema filename.
 */
function buildSchemaPath(schemaName: string) {
  return path.resolve(__dirname, '../../../schemas', `${encodeURIComponent(schemaName)}.json`);
}

class RestreamInstance extends EventEmitter {
  private ws: WebSocket | undefined;
  private nodecg: NodeCG;
  private address: string;
  private key: string;

  constructor(nodecg: NodeCG, address: string, key: string) {
    super();
    this.nodecg = nodecg;
    this.address = address;
    this.key = key;
    this.connect();
  }

  async sendMsg(msg: RestreamTypes.AllSentMsg): Promise<RestreamTypes.ResponseMsg> {
    return new Promise((res) => {
      if (!this.ws || this.ws.readyState !== 1) {
        throw new Error('WebSocket not connected');
      }
      const msgID = uuid();
      this.ws.send(JSON.stringify({ ...msg, ...{ msgID } }));
      const msgEvt = (data: WebSocket.Data): void => {
        const resp: RestreamTypes.IncomingMsg = JSON.parse(data.toString());
        if (this.ws && resp.type === 'Response' && resp.msgID === msgID) {
          this.ws.removeListener('message', msgEvt);
          res(resp);
        }
      };
      if (this.ws) {
        this.ws.on('message', msgEvt);
      }
    });
  }

  connect(): void {
    this.ws = new WebSocket(`ws://${this.address}/?key=${this.key}`);

    this.ws.once('open', () => {
      // log open
    });

    this.ws.on('error', (err) => {
      // log error
    });

    this.ws.once('close', () => {
      if (this.ws) {
        this.ws.removeAllListeners();
      }
      setTimeout(() => this.connect(), 5 * 1000);
    });

    this.ws.on('message', (data) => {
      const msg: RestreamTypes.IncomingMsg = JSON.parse(data.toString());
      if (msg.type === 'Update') {
        // store update msg
      }
    });
  }

  async startStream(channel: string, lowLatency?: boolean): Promise<RestreamTypes.ResponseMsg> {
    const msg: RestreamTypes.Start = {
      type: 'Start',
      channel,
      lowLatency,
    };
    return this.sendMsg(msg);
  }

  async stopStream(): Promise<RestreamTypes.ResponseMsg> {
    const msg: RestreamTypes.Stop = {
      type: 'Stop',
    };
    return this.sendMsg(msg);
  }

  async restartStream(): Promise<RestreamTypes.ResponseMsg> {
    const msg: RestreamTypes.Restart = {
      type: 'Restart',
    };
    return this.sendMsg(msg);
  }
}

class Restream {
  private nodecg: NodeCG;
  private config: RestreamTypes.Config;
  private sc: SpeedcontrolUtil | undefined;
  private restreamData: Replicant<RestreamData>
  private instances: RestreamInstance[] = [];

  constructor(nodecg: NodeCG, sc: boolean, config: RestreamTypes.Config) {
    this.nodecg = nodecg;
    this.config = config;
    if (sc) {
      this.sc = new SpeedcontrolUtil(nodecg);
    }
    this.restreamData = nodecg.Replicant('restreamData', {
      schemaPath: buildSchemaPath('restreamData'),
    });
    for (let i = 0; i < this.restreamData.value.length; i += 1) {
      this.restreamData.value[i].connected = false;
    }

    if (config.enable) {
      const cfgArr = (Array.isArray(config.instances)) ? config.instances : [config.instances];

      this.instances = cfgArr.map((cfg) => {
        const restream = new RestreamInstance(nodecg, cfg.address, cfg.key);
        // may need to add listeners here
        return restream;
      });

      if (this.sc) {
        // Start new stream when run changes but not on server (re)start.
        let init = false;
        this.sc.runDataActiveRun.on('change', async (newVal, oldVal) => {
          if (init && newVal?.id !== oldVal?.id
            && newVal && newVal.teams.length && newVal.teams[0].players.length
            && newVal.teams[0].players[0].social.twitch) {
            // start/change needed streams
          }
          init = true;
        });
      }

      // eslint-disable-next-line max-len
      this.nodecg.listenFor('rvtOverride', async (data: { index?: number; channel?: string; lowLatency?: boolean } = {}, cb) => {
        const instance = this.instances[data.index || 0];
        const channel = data.channel || this.restreamData.value[data.index || 0]?.channel;
        if (instance && channel) {
          await instance.startStream(
            channel,
            data.lowLatency ?? this.restreamData.value[data.index || 0]?.lowLatency ?? true,
          );
        }
        if (cb && !cb.handled) {
          cb();
        }
      });

      this.nodecg.listenFor('rvtRestart', async (data: { index?: number } = {}, cb) => {
        const instance = this.instances[data.index || 0];
        if (instance) {
          await instance.restartStream();
        }
        if (cb && !cb.handled) {
          cb();
        }
      });

      this.nodecg.listenFor('rvtStop', async (data: { index?: number } = {}, cb) => {
        const instance = this.instances[data.index || 0];
        if (instance) {
          await instance.stopStream();
        }
        if (cb && !cb.handled) {
          cb();
        }
      });
    }
  }
}

export default Restream;
