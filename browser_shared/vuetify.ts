/* eslint-disable import/no-self-import */
/**
 * This file may have a TypeScript error below (in VS Code at least) because it
 * believes it to be importing itself, when it's actually not, so builds fine.
 */

import Vue from 'vue';
import Vuetify from 'vuetify';
import 'vuetify/dist/vuetify.min.css';

Vue.use(Vuetify);

// Dark theme set here just in case.
export default new Vuetify({
  theme: {
    dark: true,
  },
});
