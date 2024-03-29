import type NodeCGTypes from '@nodecg/types';
import clone from 'clone';
import Vue from 'vue';
import type { Store } from 'vuex';
import { namespace } from 'vuex-class';
import { getModule, Module, Mutation, VuexModule } from 'vuex-module-decorators';
import type { Countdown, MediaBox, Prizes } from '../types/schemas';

// Declaring replicants.
export const reps: {
  assetsMediaBoxImages: NodeCGTypes.ClientReplicant<NodeCGTypes.AssetFile[]>;
  countdown: NodeCGTypes.ClientReplicant<Countdown>;
  mediaBox: NodeCGTypes.ClientReplicant<MediaBox>;
  prizes: NodeCGTypes.ClientReplicant<Prizes>;
  [k: string]: NodeCGTypes.ClientReplicant<unknown>;
} = {
  assetsMediaBoxImages: nodecg.Replicant('assets:media-box-images'),
  countdown: nodecg.Replicant('countdown'),
  mediaBox: nodecg.Replicant('mediaBox'),
  prizes: nodecg.Replicant('prizes'),
};

// All the replicant types.
export interface ReplicantTypes {
  assetsMediaBoxImages: NodeCGTypes.AssetFile[];
  countdown: Countdown;
  mediaBox: MediaBox;
  prizes: Prizes;
}

@Module({ name: 'ReplicantModule', namespaced: true })
export class ReplicantModule extends VuexModule {
  // Replicant values are stored here.
  reps: { [k: string]: unknown } = {};

  // This sets the state object above when a replicant sends an update.
  @Mutation
  setState({ name, val }: { name: string, val: unknown }): void {
    Vue.set(this.reps, name, clone(val));
  }

  // This is a generic mutation to update a named replicant.
  @Mutation
  setReplicant<K>({ name, val }: { name: string, val: K }): void {
    Vue.set(this.reps, name, clone(val)); // Also update local copy, although no schema validation!
    reps[name].value = clone(val);
  }
}

// eslint-disable-next-line import/no-mutable-exports
export let replicantModule!: ReplicantModule;
export const replicantNS = namespace('ReplicantModule');

export async function setUpReplicants(store: Store<unknown>): Promise<void> {
  // Listens for each declared replicants "change" event, and updates the state.
  Object.keys(reps).forEach((name) => {
    reps[name].on('change', (val) => {
      store.commit('ReplicantModule/setState', { name, val });
    });
  });
  // We should make sure the replicant are ready to be read, needs to be done in browser context.
  await NodeCG.waitForReplicants(...Object.keys(reps).map((key) => reps[key]));
  replicantModule = getModule(ReplicantModule, store);
}
