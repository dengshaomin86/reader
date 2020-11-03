import {app, BrowserWindow, ipcMain, Tray, globalShortcut, Menu} from 'electron';
import path from "path";
import keyEvent from "../renderer/utils/keyEventConfig";

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow;
const winURL = process.env.NODE_ENV === 'development' ? `http://localhost:9080` : `file://${__dirname}/index.html`;

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    show: false,
    // width: 1000,
    // height: 563,
    useContentSize: true, // width 和 height 将设置为 web 页面的尺寸(译注: 不包含边框)
    fullscreen: false,
    icon: `${__static}/icons/logo.png`,
    // frame: false,
    // transparent: true,
    backgroundColor: "#4e82ff",
    webPreferences: {
      webSecurity: false // 禁用窗口同源策略
    }
  });

  mainWindow.loadURL(winURL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize(); // 最大化显示
    mainWindow.show();
  });

  mainWindow.on('show', (event) => {
    mainWindow.setSkipTaskbar(false);
  });

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
    mainWindow.setSkipTaskbar(true); // 使窗口不显示在任务栏中
  });

  mainWindow.on('closed', () => {
    // mainWindow = null;
  });

  // 监听并阻止 webview 跳转
  mainWindow.webContents.on('did-attach-webview', (res) => {
    res.sender.on('will-navigate', (e) => {
      e.preventDefault();
    });
  });

  // 新增的：安装vue-devtools
  BrowserWindow.addDevToolsExtension(path.resolve(__dirname, `${__static}/devTools/vue-devtools`));

  // 注册全局键盘事件
  keyEvent(mainWindow);

  createTray();
  createMenu();
}

// 设置系统托盘图标
let tray = null;

function createTray() {
  tray = new Tray(`${__static}/icons/logo.png`);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'reload',
      click: () => {
        mainWindow.reload();
      },
    },
    {
      label: 'exit',
      click: () => {
        app.exit();
      },
    },
  ]);
  let toolTip = process.env.NODE_ENV === "development" ? "READER-DEV" : "READER";
  tray.setToolTip(toolTip);
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (mainWindow.isMinimized()) {
      mainWindow.restore(); // 将窗口从最小化状态恢复到以前的状态
      return;
    }
    mainWindow.show();
  });
  tray.on("right-click", () => {
  });
  tray.on("double-click", () => {
  });
}

// 设置菜单栏
function createMenu() {
  if (process.platform === 'win32') {
    const menuTemplate = [{
      label: 'Edit App',
      submenu: [{
        label: 'Undo'
      },
        {
          label: 'Redo'
        }
      ]
    },
      {
        label: 'View App',
        submenu: [{
          label: 'Reload'
        },
          {
            label: 'Toggle Full Screen'
          }
        ]
      }
    ];
    let menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(null);
  } else {
    Menu.setApplicationMenu(null);
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
});

app.on('browser-window-focus', () => {
  // 注册全局键盘事件
  keyEvent(mainWindow);
});

app.on('browser-window-blur', () => {
  // 注销全局键盘事件
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // 注销全局键盘事件
  globalShortcut.unregisterAll();
});

// 自定义任务栏
app.setUserTasks([
  {
    program: process.execPath,
    arguments: '--new-window',
    iconPath: process.execPath,
    iconIndex: 0,
    title: 'New Window',
    description: 'Create a new window'
  }
]);

let downloadItemList = [];

ipcMain.on('asynchronous-message', (event, arg) => {
  console.log(arg);
  event.sender.send('download-reply', 'pong');
  mainWindow.webContents.downloadURL(arg.src);
  mainWindow.webContents.session.on('will-download', function (e, item, webContents) {
    downloadItemList.push(item);
    console.log("will-download", downloadItemList);
    event.sender.send('download-reply', {
      url: item.getURL(),
      state: item.getState(),
      progress: item.getReceivedBytes(),
      total: item.getTotalBytes()
    });
    // 设置保存路径,使Electron不提示保存对话框。
    // item.setSavePath('/tmp/save.pdf')

    item.on('updated', (e, state) => {
      if (state === 'interrupted') {
        console.log('Download is interrupted but can be resumed')
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          console.log('Download is paused')
        } else {
          console.log(`Received bytes: ${item.getReceivedBytes()}`)
        }
      }
      event.sender.send('download-reply', {
        url: item.getURL(),
        state: item.getState(),
        progress: item.getReceivedBytes(),
        total: item.getTotalBytes()
      });
    });
    item.once('done', (e, state) => {
      if (state === 'completed') {
        console.log('Download successfully')
      } else {
        console.log(`Download failed: ${state}`)
      }
      event.sender.send('download-reply', {
        url: item.getURL(),
        state: item.getState(),
        progress: item.getReceivedBytes(),
        total: item.getTotalBytes()
      });
    });
  });
});
ipcMain.on('download-pause', (event, arg) => {
  console.log('download-pause', arg);
  event.sender.send('download-pause', 'pong');
  console.log('downloadItemList', downloadItemList);
  downloadItemList.forEach(item => {
    console.log('getURL-------', item.getURL());
  });
  let item = downloadItemList.find(item => item.getURL() === arg);
  console.log('download-pause-item', item);
  if (item) {
    item.pause();
    event.sender.send('download-reply', {
      url: item.getURL(),
      state: item.getState(),
      progress: item.getReceivedBytes(),
      total: item.getTotalBytes()
    });
  }
});
ipcMain.on('download-resume', (event, arg) => {
  console.log('download-resume', arg);
  let item = downloadItemList.find(item => item.getURL() === arg);
  console.log('download-resume-item', item);
  if (item) {
    item.resume();
    event.sender.send('download-reply', {
      url: item.getURL(),
      state: item.getState(),
      progress: item.getReceivedBytes(),
      total: item.getTotalBytes()
    });
  }
});
ipcMain.on('openDevtools', (event, arg) => {
  if (process.env.NODE_ENV !== "production") return;
  if (mainWindow.webContents.isDevToolsOpened()) {
    mainWindow.webContents.closeDevTools();
    return;
  }
  mainWindow.webContents.openDevTools();
});
ipcMain.on('fullScreenChang', (event, arg) => {
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
  event.returnValue = ""; // 同步动作需要响应才能结束
});
ipcMain.on('isFullScreen', (event, arg) => {
  event.returnValue = mainWindow.isFullScreen(); // 同步动作需要响应才能结束
});
ipcMain.on('Shift+Esc', (event, arg) => {
  mainWindow.hide();
});

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
