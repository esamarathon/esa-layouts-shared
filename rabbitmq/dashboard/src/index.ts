import Vue from 'vue';
import vuetify from '../../../vuetify';
import App from './main.vue';

export default (enable: boolean, useTestData: boolean): Vue => new Vue({
  vuetify,
  el: '#App',
  render: (h) => h(App, { props: { enable, useTestData } }),
});
