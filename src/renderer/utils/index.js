import fs from 'fs';
import path from 'path';
import {clipboard} from 'electron';
import "./directive";
import "./axios";
import "./message";
import "./mixins";
import "./keyEventhandler";

// 传入文本并下载 txt 文件 (支持 Chrome、Firefox)
export function downloadTxt(filename, text) {
  let pom = document.createElement('a');
  pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  pom.setAttribute('download', filename);
  if (document.createEvent) {
    let event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);
    pom.dispatchEvent(event);
  } else {
    pom.click();
  }
}

// 传入文本并下载 txt 文件 (支持 Chrome)
function downloadTxt4Chrome(filename, content, contentType) {
  if (!contentType) contentType = 'application/octet-stream';
  let a = document.createElement('a');
  let blob = new Blob([content], {'type': contentType});
  a.href = window.URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// a 链接下载 base64 数据
export function aDownloadBase64(data, filename) {
  let a = document.createElement('a');
  a.href = data;
  a.download = filename;
  let event = document.createEvent('MouseEvents');
  event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
  a.dispatchEvent(event);
}

// a 链接下载 blob 数据
export function aDownloadBlob(blob, filename) {
  let a = document.createElement('a');
  a.href = window.URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// fs 下载 blob 数据
export function fsDownloadBlob(blob, filePath, cb) {
  let reader = new FileReader();
  reader.onload = () => {
    let buffer = new Buffer(reader.result);
    fs.writeFile(filePath, buffer, {}, (err, res) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log('file saved');
      cb && cb(filePath);
    });
  };
  reader.readAsArrayBuffer(blob);
}

// 创建目录
export function mkdir(url) {
  let arr = url.split("\\");
  let dirPath = "";
  arr.forEach(item => {
    if (item.charAt(item.length - 1) === ":") {
      dirPath = `${item}\\`;
    } else {
      dirPath = path.join(dirPath, item);
    }
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
  });
}

// 复制到剪贴板
export function copy(text) {
  clipboard.writeText(text);
}

// 处理文件夹名称
export function handlerDirName(text) {
  text = String(text);
  // 去掉非法字符，取最后一个 . 后面的文本，去掉前后空格
  return text.replace(/%|\/|\\|:|\*|\?|"|<|>|\|/g, "").split(".").pop().replace(/^\s*(.*?)\s*$/, "$1");
}

// 解决百度贴吧图片防盗
export function resolveTieBaImgSrc(src) {
  return src.replace("tiebapic", "imgsrc");
}

// 应用程序根路径
const rootPath = process.cwd();

export {
  rootPath,
}
