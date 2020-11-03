import Vue from 'vue';
import App from './App';
import router from './router';
import store from './store';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import "@/utils";

Vue.use(ElementUI);

if (!process.env.IS_WEB) Vue.use(require('vue-electron'));
Vue.config.productionTip = false;

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'; // 关闭 electron 控制台警告

new Vue({
  components: {App},
  router,
  store,
  template: '<App/>'
}).$mount('#app');
