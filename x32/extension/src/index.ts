/* eslint-disable no-restricted-syntax */

import type { NodeCG } from 'nodecg/types/server';
import osc from 'osc';

class X32 {
  private nodecg: NodeCG;
  private conn: osc.UDPPort;
  private port = 10023;
  private ip: string;
  private subscriptions: string[] = [];
  private faders: { [k: string]: number } = {};
  private fadersExpected: { [k: string]: {
    value: number, increase: boolean, seenOnce: boolean,
  } } = {};
  private fadersInterval: { [k: string]: NodeJS.Timeout } = {};

  constructor(nodecg: NodeCG, ip: string, subscriptions: string[]) {
    this.nodecg = nodecg;
    this.ip = ip;
    this.subscriptions = subscriptions;

    nodecg.log.info('[X32] Setting up connection');

    this.conn = new osc.UDPPort({
      localAddress: '0.0.0.0',
      localPort: 52361,
      remoteAddress: this.ip,
      remotePort: this.port,
      metadata: true,
    });

    this.conn.on('error', (err) => {
      nodecg.log.warn('[X32] Error on connection');
      nodecg.log.debug('[X32] Error on connection:', err);
    });

    this.conn.on('message', (message) => {
      // I don't trust myself with all posibilities, so wrapping this up.
      try {
        if (message.address.endsWith('/fader')) {
          const args = (message.args as { type: 'f', value: number }[])[0];
          this.faders[message.address] = args.value;

          // Check if we're done fading and clear intervals if needed.
          if (this.fadersExpected[message.address]) {
            const exp = this.fadersExpected[message.address];

            // Sometimes we receive a delayed message, so we wait until
            // we've at least seen 1 value in the correct range.
            if ((exp.increase && exp.value > args.value)
            || (!exp.increase && exp.value < args.value)) {
              exp.seenOnce = true;
            }
            if (exp.seenOnce && ((exp.increase && exp.value <= args.value)
            || (!exp.increase && exp.value >= args.value))) {
              this.conn.send({
                address: message.address,
                args: [{ type: 'f', value: exp.value }],
              });
              clearInterval(this.fadersInterval[message.address]);
              delete this.fadersExpected[message.address];
            }
          }
        }
      } catch (err) {
        nodecg.log.warn('[X32] Error parsing message');
        nodecg.log.debug('[X32] Error parsing message:', err);
      }
    });

    this.conn.on('close', () => {
      nodecg.log.info('[X32] Connection closed');
    });

    this.conn.on('open', () => {
      nodecg.log.info('[X32] Connection opened');
    });

    this.conn.on('ready', () => {
      nodecg.log.info('[X32] Connection ready');

      // Subscribe/renew to updates (must be done every <10 seconds).
      // this.conn.send({ address: '/xremote', args: [] });
      for (const topic of this.subscriptions) {
        this.conn.send({
          address: '/subscribe',
          args: [{ type: 's', value: topic }, { type: 'i', value: 0 }],
        });
      }
      setInterval(() => {
        // this.conn.send({ address: '/xremote', args: [] });
        for (const topic of this.subscriptions) {
          this.conn.send({
            address: '/renew',
            args: [{ type: 's', value: topic }],
          });
        }
      }, 9 * 1000);
    });

    this.conn.open();
  }

  /**
   * Fades up/down the supplied fader using the specified settings.
   * @param name Full name of fader (example: /dca/1/fader).
   * @param startValue Value to start at (0.0 - 1.0).
   * @param endValue Value to end at (0.0 - 1.0).
   * @param length Milliseconds to spend doing fade.
   */
  fade(name: string, startValue: number, endValue: number, length: number): void {
    this.nodecg.log.debug(`[X32] Attempting to fade ${name} `
      + `(${startValue} => ${endValue}) for ${length}ms`);
    let currentValue = startValue;
    const increase = startValue < endValue;
    const stepCount = length / 100;
    const stepSize = (endValue - startValue) / stepCount;
    this.fadersExpected[name] = { value: endValue, increase, seenOnce: false };
    this.fadersInterval[name] = setInterval(() => {
      if ((increase && currentValue >= endValue) || (!increase && currentValue <= endValue)) {
        clearInterval(this.fadersInterval[name]);
        delete this.fadersExpected[name];
      }
      this.conn.send({ address: name, args: [{ type: 'f', value: currentValue }] });
      currentValue += stepSize;
      if ((increase && currentValue > endValue) || (!increase && currentValue < endValue)) {
        currentValue = endValue;
      }
    }, 100);
  }
}

export = X32;
