/**
 * 注册全局键盘事件
 */
import {globalShortcut} from 'electron';

let keyG = [
  "CommandOrControl+Shift+F", // 搜索、跳转
  "CommandOrControl+Backspace", // 返回
  "Shift+Esc", // 隐藏主界面
  "CommandOrControl+Shift+Alt+H", // 跳转导航页
];

process.env.NODE_ENV !== 'development' && keyG.push(...[
  "F5", // 刷新
  "CommandOrControl+F12", // 开发者工具
]);

export default function (mainWindow) {
  keyG.forEach(key => {
    globalShortcut.register(key, () => {
      mainWindow.webContents.send('keyEvent', key);
    });
  });
};
