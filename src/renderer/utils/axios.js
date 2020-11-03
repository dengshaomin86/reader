import axios from "axios";
import {Message} from "element-ui";
import router from "@/router";

const CancelToken = axios.CancelToken;
const source = CancelToken.source();

const $axios = axios.create({
  // baseURL: process.env.NODE_ENV === "production" ? "http://139.9.50.13:3002" : "http://127.0.0.1:3002",
  // baseURL: "http://127.0.0.1:3002",
  baseURL: "http://139.9.50.13:3002",
  withCredentials: false,
  timeout: 10000,
  headers: {
    'Cache-Control': 'no-cache' // 禁止请求缓存
  }
});

$axios.interceptors.request.use(config => {
  // 设置 content-type 防止 post 请求前发送 options 请求
  // if ((config.method).toLowerCase() === "post") config.headers["Content-Type"] = "application/x-www-form-urlencoded";
  config.cancelToken = source.token; // 全局添加cancelToken
  return config;
}, err => {
  return Promise.reject(err);
});

// 添加响应拦截器
$axios.interceptors.response.use((response) => {
  // 对响应数据做点什么
  if (response.data.flag === false && response.data.auth === false) {
    // source.cancel(); // 取消其他正在进行的请求
    Message.error(response.data.message);
    router.push("/login");
    return Promise.reject(response);
  }
  return response;
}, (error) => {
  console.dir(error);
  if (error.message) Message.error(error.message);
  // if (axios.isCancel(error)) return new Promise(() => {}); // 取消请求的情况下，终端Promise调用链
  // 对响应错误做点什么
  return Promise.reject(error);
});

window.axios = $axios;
export default $axios;
