import type { NodeCG } from 'nodecg/types/server';
import { cwd } from 'process';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Asset, OBS as OBSTypes } from '../../../types';
import OBS from '../../obs';

// Should be moved to types file!
interface PlaylistItem {
  id: string;
  video?: Asset;
  commercial?: number;
}

interface VideoPlayerEvents {
  'playCommercial': (playlistItem: PlaylistItem) => void;
  'videoStarted': (playlistItem: PlaylistItem) => void;
  'videoEnded': (playlistItem: PlaylistItem) => void;
  'playlistEnded': () => void;
}

/**
 * TODO:
 * - add try/catches
 * - stop if no connection to OBS or OBS config disabled
 */

class VideoPlayer extends TypedEmitter<VideoPlayerEvents> {
  private nodecg: NodeCG;
  private obsCofig: OBSTypes.Config;
  private obs: OBS;
  private videoSourceName = 'Video Player Source';
  playlist: PlaylistItem[] = [];
  playing = false;
  index = -1;

  constructor(nodecg: NodeCG, obsCofig: OBSTypes.Config, obs: OBS) {
    super();
    this.nodecg = nodecg;
    this.obsCofig = obsCofig;
    this.obs = obs;

    // Listens for when videos finish playing in OBS.
    obs.conn.on('MediaEnded', (data) => {
      if (data.sourceName === this.videoSourceName) {
        this.emit('videoEnded', this.playlist[this.index]);
      }
    });
  }

  /**
   * Validate and load in a supplied playlist.
   */
  loadPlaylist(playlist: PlaylistItem[]): void {
    if (this.playing) throw new Error('another playlist currently playing');
    if (!playlist.length) throw new Error('playlist must have at least 1 video');
    const invalidItems = playlist.filter((i) => !i.commercial && !i.video);
    if (invalidItems.length) {
      throw new Error('all playlist items must have either video orcommercial');
    }
    this.playlist = playlist;
  }

  /**
   * Attempt to play the next playlist item.
   */
  async playNext(): Promise<void> {
    if (this.playlist.length - 1 > this.index) {
      this.playing = true;
      this.index += 1;
      const item = this.playlist[this.index];
      if (item.commercial) this.emit('playCommercial', item);
      if (item.video) {
        await this.playVideo(item.video);
        this.emit('videoStarted', item);
      } else {
        this.emit('videoEnded', item); // "Pretend" video ended in this case.
      }
    } else {
      this.playing = false;
      this.index = -1;
      this.playlist.length = 0;
      this.emit('playlistEnded');
    }
  }

  /**
   * Play the supplied asset via the OBS source.
   * @param video NodeCG asset of the video.
   */
  async playVideo(video: Asset): Promise<void> {
    const source = await this.obs.conn.send('GetSourceSettings', {
      sourceName: this.videoSourceName,
    });
    const location = `${cwd()}/assets/${video.namespace}/${video.category}/${video.base}`;
    if (source.sourceType === 'ffmpeg_source') {
      await this.obs.conn.send('SetSourceSettings', {
        sourceName: this.videoSourceName,
        sourceSettings: {
          is_local_file: true,
          local_file: location,
          looping: false,
          restart_on_activate: false,
        },
      });
    } else if (source.sourceType === 'vlc_source') {
      await this.obs.conn.send('SetSourceSettings', {
        sourceName: this.videoSourceName,
        sourceSettings: {
          loop: false,
          shuffle: false,
          playback_behavior: 'always_play',
          playlist: [
            {
              hidden: false,
              selected: false,
              value: location,
            },
          ],
        },
      });
    } else {
      this.nodecg.log.error('[Video Player] No video player source found in OBS to trigger!');
    }
  }
}

export = VideoPlayer;
