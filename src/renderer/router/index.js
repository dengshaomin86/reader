import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router);

let context = require.context("../views", false, /.vue$/);
let defaultRouter = context.keys().map(key => {
  let name = key.substring(key.indexOf("/") + 1, key.lastIndexOf(".vue"));
  return {
    path: key.substring(key.indexOf("/"), key.lastIndexOf(".vue")),
    name,
    component: context(key).default,
    meta: {
      title: name
    }
  }
});

let modulesContext = require.context("../modules", true, /router.js$/);
let modulesRouter = [];
modulesContext.keys().forEach(key => {
  modulesRouter.push(...modulesContext(key).default);
});

export default new Router({
  routes: [
    ...defaultRouter,
    ...modulesRouter,
    {
      path: '/',
      redirect: '/reader'
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
