export namespace OBS {
  interface Config {
    enabled: boolean;
    address: string;
    password: string;
    names: {
      scenes?: {
        commercials?: string;
        intermission?: string;
      };
      sources: {
        videoPlayer: string;
      };
    };
  }

  interface SexyTransitionData {
    fromScene: string;
    toScene: string;
    transitionName: string;
    transitionUuid: string;
  }

  interface Transform {
    alignment: number;
    boundsAlignment: number;
    boundsHeight: number;
    boundsType: string;
    boundsWidth: number;
    cropBottom: number;
    cropLeft: number;
    cropRight: number;
    cropTop: number;
    positionX: number;
    positionY: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    sourceHeight: number;
    sourceWidth: number;
    width: number;
  }

  type SceneList = [{
    sceneIndex: number;
    sceneName: string;
  }];
}
