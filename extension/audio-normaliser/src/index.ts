import { exec as execCb } from 'child_process';
import { ensureDir, unlink } from 'fs-extra';
import { differenceBy } from 'lodash';
import type { NodeCG, Replicant } from 'nodecg/types/server';
import { dirname, join } from 'path';
import { cwd } from 'process';
import { Asset } from 'types';
import { promisify } from 'util';
import findExecutable from './find-exe';

const exec = promisify(execCb);

class AudioNormaliser {
  nodecg!: NodeCG;
  assets!: Replicant<Asset[]>;
  assetsNormalised!: Replicant<Asset[]>;

  constructor(nodecg: NodeCG, assetName = 'videos') {
    this.nodecg = nodecg;
    this.assets = nodecg.Replicant(`assets:${assetName}`);
    this.assetsNormalised = nodecg
      .Replicant(`assets:${assetName}-normalised`, { defaultValue: [] });
    this.setup();
  }

  private async setup(): Promise<void> {
    // Stop running and print an error if any executables aren't available in PATH.
    const exeMissing: string[] = [];
    if (!await findExecutable('python')) exeMissing.push('python');
    if (!await findExecutable('ffmpeg')) exeMissing.push('ffmpeg');
    if (!await findExecutable('ffmpeg-normalize')) exeMissing.push('ffmpeg-normalize');
    if (exeMissing.length) {
      this.nodecg.log.warn(
        '[Audio Normaliser] %s must be installed and available in PATH, will not run!',
        exeMissing.join(', '),
      );
      return;
    }

    const processing: string[] = [];
    this.assets.on('change', async (newVal, oldVal) => {
      if (!oldVal && !newVal.length) return; // Happens on start up, completely empty
      if (!differenceBy(newVal, oldVal || [], 'sum').length
      && !differenceBy(oldVal, newVal, 'sum').length) {
        return; // Sometimes this listener is triggered with no actual changes
      }
      const added = differenceBy(newVal, this.assetsNormalised.value, 'sum');
      const removed = differenceBy(this.assetsNormalised.value, newVal, 'sum');

      // Process and copy over newly added assets.
      for (const asset of added) {
        if (!this.assetsNormalised.value.find((a) => a.sum === asset.sum)
        && !processing.includes(asset.sum)) {
          processing.push(asset.sum);
          const originalLocation = this.getAssetLocation(asset);
          try {
            const copyLocation = this.getAssetLocation(asset, true);
            await ensureDir(dirname(copyLocation));

            // Executes the ffmpeg-normalize command.
            const cmd = [
              'ffmpeg-normalize',
              `"${originalLocation}"`,
              '-c:a aac',
              `-o "${copyLocation}"`,
            ].join(' ');
            await exec(cmd);

            const newBase = `${asset.name}${asset.ext.toLowerCase()}`;
            const newCategory = `${asset.category}-normalised`;
            this.assetsNormalised.value.push({
              ...asset,
              base: newBase,
              category: newCategory,
              ext: asset.ext.toLowerCase(),
              url: `/assets/${asset.namespace}/${newCategory}/${newBase}`,
            });
          } catch (err) {
            this.nodecg.log.warn('[Audio Normaliser] Error processing %s', originalLocation);
            this.nodecg.log.warn('[Audio Normaliser] Error processing %s:', originalLocation, err);
          }
          processing.splice(processing.indexOf(asset.sum), 1);
        }
      }

      // Removed assets need deleting.
      for (const asset of removed) {
        const path = this.getAssetLocation(asset, true);
        try {
          await unlink(path);
          const index = this.assetsNormalised.value.findIndex((a) => a.sum === asset.sum);
          if (index >= 0) this.assetsNormalised.value.splice(index, 1);
        } catch (err) {
          this.nodecg.log.warn('[Audio Normaliser] Error deleting %s', path);
          this.nodecg.log.warn('[Audio Normaliser] Error deleting %s:', path, err);
        }
      }
    });
  }

  private getAssetLocation(asset: Asset, normalised = false) {
    const category = normalised && !asset.category.endsWith('-normalised')
      ? `${asset.category}-normalised`
      : asset.category;
    const ext = normalised ? asset.ext.toLowerCase() : asset.ext;
    return join(cwd(), `assets/${asset.namespace}/${category}/${asset.name}${ext}`);
  }
}

export = AudioNormaliser;
