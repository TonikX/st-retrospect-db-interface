import Vue from 'vue';
import Vuex from 'vuex';

import auth from './modules/auth';
import persons from './modules/persons';

import createPersistedState from 'vuex-persistedstate';

Vue.use(Vuex);

const debug = process.env.NODE_ENV !== 'production';

export default new Vuex.Store({
  modules: {
    auth,
    persons
  },
  plugins: [ createPersistedState() ],
  strict: debug
});
