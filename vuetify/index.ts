import '@mdi/font/css/materialdesignicons.css';
import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import '../fonts/roboto.css';
import './style.css';

Vue.use(Vuetify);

export default new Vuetify({
  theme: {
    dark: true,
  },
});
