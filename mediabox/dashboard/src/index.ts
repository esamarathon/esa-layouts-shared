import Vue from 'vue';
import vuetify from '../../../vuetify';
import App from './main.vue';
import waitForReplicants from './store';

export default async (): Promise<Vue> => {
  const store = await waitForReplicants();
  return new Vue({
    vuetify,
    store,
    el: '#App',
    render: (h) => h(App),
  });
};
