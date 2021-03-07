export namespace Restream {
  interface UpdateMsg {
    type: 'Update',
    channel?: string;
    lowLatency?: boolean;
    uuid: string;
  }
  interface ResponseMsg {
    type: 'Response',
    // err?: string; // Should only appear on ResponseErr!
    msgID: string;
    channel?: string;
    lowLatency?: boolean;
    uuid: string;
  }
  interface ResponseErr extends ResponseMsg {
    err: string;
  }
  type IncomingMsg = UpdateMsg | ResponseMsg | ResponseErr;

  interface Start {
    type: 'Start';
    channel?: string;
    lowLatency?: boolean;
  }
  interface Stop {
    type: 'Stop';
  }
  interface Restart {
    type: 'Restart';
  }
  type AllSentMsg = Start | Stop | Restart;
}
