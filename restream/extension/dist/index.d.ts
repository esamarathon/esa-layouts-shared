/// <reference types="node" />
import { EventEmitter } from 'events';
import type { NodeCG, Replicant } from 'nodecg/types/server';
import { RestreamData } from '../../../schemas';
import { Restream as RestreamTypes } from '../../../types';
interface RestreamInstance {
    on(event: 'connected', listener: () => void): this;
    on(event: 'disconnected', listener: () => void): this;
    on(event: 'update', listener: (data: RestreamTypes.UpdateMsg) => void): this;
    on(event: 'channelChange', listener: (channel?: string) => void): this;
}
declare class RestreamInstance extends EventEmitter {
    private ws;
    private nodecg;
    private address;
    private key;
    channel: string | undefined;
    constructor(nodecg: NodeCG, address: string, key: string);
    sendMsg(msg: RestreamTypes.AllSentMsg): Promise<RestreamTypes.ResponseMsg>;
    connect(): void;
    startStream(channel: string, lowLatency?: boolean): Promise<RestreamTypes.ResponseMsg>;
    stopStream(): Promise<RestreamTypes.ResponseMsg>;
    restartStream(): Promise<RestreamTypes.ResponseMsg>;
}
declare class Restream {
    private nodecg;
    instances: RestreamInstance[];
    restreamData: Replicant<RestreamData>;
    constructor(nodecg: NodeCG, sc: boolean, config: RestreamTypes.Config);
    /**
     * Takes a list of channels and will set them on that instance index if different,
     * or stop if needed.
     * @param channels List of channels.
     */
    updateMultipleInstances(channels: (string | undefined)[]): void;
    private updateData;
}
export default Restream;
