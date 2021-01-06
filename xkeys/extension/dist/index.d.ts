/// <reference types="node" />
import { EventEmitter } from 'events';
import type { NodeCG } from 'nodecg/types/server';
import XKeysLib from 'xkeys';
import type { XKeysLib as XKeysLibTypes } from '../../../types';
interface XKeysClass {
    on(event: 'down', listener: (keyIndex: string) => void): this;
    on(event: 'up', listener: (keyIndex: string) => void): this;
    on(event: 'jog', listener: (position: number) => void): this;
    on(event: 'shuttle', listener: (position: number) => void): this;
}
declare class XKeysClass extends EventEmitter {
    private nodecg;
    private config;
    panel: XKeysLib | undefined;
    constructor(nodecg: NodeCG, config: XKeysLibTypes.Config);
    connect(): void;
    setBacklight(keyIndex: number | string, on?: boolean, redLight?: boolean, flashing?: boolean): void;
}
export default XKeysClass;
