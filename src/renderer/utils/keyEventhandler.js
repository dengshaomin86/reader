/**
 * 注册全局键盘事件
 */
import store from '@/store';
import router from '@/router'
import {ipcRenderer} from 'electron';
import {Message} from 'element-ui';

ipcRenderer.on("keyEvent", (event, key) => {
  // Message.success(`keyEvent: ${key}`);
  key === "F5" && reload();
  key === "CommandOrControl+F12" && openDevtools();
  key === "CommandOrControl+Shift+F" && search();
  key === "CommandOrControl+Backspace" && back();
  key === "CommandOrControl+Shift+Alt+H" && toNav();
  if (key === "Shift+Esc" && !document.getElementsByClassName("preview").length) {
    ipcRenderer.send("Shift+Esc");
  }
});

function openDevtools() {
  ipcRenderer.send('openDevtools');
}

function reload() {
  if (process.env.NODE_ENV === "production") location.reload();
}

function search() {
  store.commit("setPromptVisible", true);
}

function back() {
  if (router.currentRoute.path !== "/login") router.back();
}

function toNav() {
  router.push("/navigation");
}
