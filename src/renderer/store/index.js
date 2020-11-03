import Vue from 'vue'
import Vuex from 'vuex'

import { createPersistedState, createSharedMutations } from 'vuex-electron'

import modules from './modules'

Vue.use(Vuex);

export default new Vuex.Store({
  modules,
  plugins: [
    createPersistedState(),
    // createSharedMutations() // 多进程间共享 Vuex Store 的状态的插件（启用会导致 dispatch 无法调用）
  ],
  strict: process.env.NODE_ENV !== 'production'
})
