let context = require.context("./views", false, /.vue$/);
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

export default [
  ...defaultRouter
];
