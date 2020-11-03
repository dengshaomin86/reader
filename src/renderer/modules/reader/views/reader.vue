<template>
  <div class="reader"
       :class="theme"
       ref="container"
       @scroll="scroll"
       tabindex="1"
       v-key.space="keyCB"
       v-loading="loading"
       element-loading-text="加载中"
       element-loading-spinner="el-icon-loading"
       element-loading-background="rgba(0, 0, 0, 0.8)">
    <header>{{book.name||'READER'}}</header>
    <main :style="mainStyle">
      <div v-for="(item, idx) in chapterContent" :key="idx" class="content" v-html="item.txt"></div>
    </main>
    <footer>
      <el-button @click="prevChapter">上一章</el-button>
      <el-button @click="nextChapter">下一章</el-button>
    </footer>
    <section :style="sectionStyle">
      <ul>
        <li @click="libraryVisible=true">书库</li>
        <li @click="catalogVisible=true">目录</li>
        <li @click="themeVisible=true">主题</li>
        <li @click="explanationVisible=true">说明</li>
        <li>
          <el-color-picker :value="fontColor" show-alpha :predefine="predefineColors" @active-change="fontColorChange"></el-color-picker>
        </li>
      </ul>
    </section>

    <el-dialog title="书库" :visible.sync="libraryVisible" width="40%">
      <ul class="libraryList">
        <li v-for="(item, idx) in libraryList" :key="idx">
          <a :class="{'active':item.url===book.url}" @click="changeBook(item)">{{item.name}}</a>
          <div class="icon-wrapper">
            <i class="el-icon-folder-opened" @click="openFileDir(item)"></i>
            <i class="el-icon-close" @click="delBook(item)"></i>
          </div>
        </li>
      </ul>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="el-icon-plus" @click="addFile">添加</el-button>
      </div>
    </el-dialog>

    <el-dialog title="目录" :visible.sync="catalogVisible" width="40%" height="80%">
      <ul class="libraryList" ref="catalog">
        <li v-for="(item, idx) in catalog" :key="idx">
          <a :class="{'active':idx===currentChapter}" @click="changeChapter(idx)">{{item}}</a>
        </li>
      </ul>
    </el-dialog>

    <el-dialog title="主题" :visible.sync="themeVisible" width="40%">
      <ul class="themeList">
        <li v-for="(item, idx) in themeList" :key="idx" :class="'theme-'+item" @click="setTheme(item)"></li>
      </ul>
    </el-dialog>

    <el-dialog title="说明" :visible.sync="explanationVisible" width="40%">
      <div class="explanation-wrapper">
        <div class="explanation-item">
          <p class="explanation-title">当前字号：{{fontSize}}</p>
        </div>
        <div class="explanation-item">
          <p class="explanation-title">快捷键：</p>
          <ul>
            <li>字号加：+</li>
            <li>字号减：-</li>
            <li>上一章：←</li>
            <li>下一章：→</li>
            <li>翻页：空格键</li>
            <li>书库：数字键1</li>
            <li>目录：数字键2</li>
            <li>主题：数字键3</li>
            <li>说明：数字键4</li>
          </ul>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
  import fs from "fs";
  import path from "path";
  import iconv from "iconv-lite";
  import jschardet from "jschardet";
  import {exec} from 'child_process';
  import {remote, ipcRenderer} from "electron";
  import {mapState, mapMutations} from 'vuex';
  import {debounce} from 'lodash';
  import WebWorker from 'simple-web-worker';

  export default {
    name: "reader",
    data() {
      return {
        scrollTop: 0,
        content: [], // 书籍内容
        libraryList: [], // 书库
        libraryVisible: false,
        catalog: [], // 目录
        catalogVisible: false,
        themeVisible: false,
        explanationVisible: false,
        themeList: ["yellow", "dark"],
        predefineColors: [], // 预设字体颜色
        chapterContent: [], // 当前章节内容
        loading: false,
        bookChangeFlag: false, // 用于处理切换书籍时获取两次章节内容，导致内容错误
      }
    },
    computed: {
      mainStyle() {
        let color = this.fontColor ? `color: ${this.fontColor};` : "";
        return `font-size:${this.fontSize}px;line-height:${this.fontSize * 2}px;${color}`;
      },
      sectionStyle() {
        let top = 60 - this.scrollTop;
        return `top:${top > 0 ? top : 0}px`;
      },
      // 配置文件
      optionsFile() {
        return path.join(__static, "reader.json");
      },
      ...mapState({
        currentChapter(state) {
          if (!this.book) return 0;
          let info = state.Reader.booksInfo[this.book.url];
          if (!info) return 0;
          return info.chapterID || 0;
        },
        theme: (state) => state.Reader.theme,
        fontSize: (state) => state.Reader.fontSize,
        fontColor: (state) => state.Reader.fontColor,
        book: (state) => state.Reader.book,
      }),
    },
    watch: {
      currentChapter() {
        if (!this.bookChangeFlag) this.getCurrentChapterContent();
      },
      catalogVisible(n) {
        if (n && this.catalog.length) {
          setTimeout(() => {
            this.$refs.catalog.children[this.currentChapter].scrollIntoView()
          }, 300);
        }
      },
      optionsFile: {
        immediate: true,
        handler(n) {
          this.getLibraryList();
        }
      },
      theme: {
        immediate: true,
        handler(n) {
          this.saveThemeData(n);
        }
      },
    },
    methods: {
      init() {
        this.getBookContent(this.book);
        this.$nextTick(() => {
          this.$refs.container.focus();
        });
      },

      // 获取书库
      getLibraryList() {
        let data = fs.readFileSync(this.optionsFile, {encoding: 'utf-8'});
        if (!data) return;
        data = JSON.parse(data);
        let {books} = data;
        this.libraryList = books.map(url => {
          let name = path.basename(url).split(".txt")[0];
          return {
            name,
            url
          }
        });
      },

      // 获取书籍内容
      getBookContent(book) {
        if (!book || !book.url) return;
        this.setBook(book);
        this.bookChangeFlag = true;
        this.loading = true;
        this.getEncoding(book).then(encoding => {
          fs.readFile(book.url, encoding, (err, data) => {
            if (err) {
              this.loading = false;
              console.log(err);
              return;
            }
            if (!data) return;
            this.handlerBook(data);
          });
        }).catch(e => {
          console.log(e);
          this.getBookContentByIconv(book);
        });
      },

      // 获取文件编码格式
      getEncoding(book) {
        return new Promise((resolve, reject) => {
          fs.readFile(book.url, (err, data) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(jschardet.detect(data).encoding);
          });
        });
      },

      // 转码方式获取文件内容
      getBookContentByIconv(book) {
        fs.readFile(book.url, {encoding: 'binary'}, (err, data) => {
          if (err) {
            this.loading = false;
            console.log(err);
            return;
          }
          if (!data) return;
          let buf = new Buffer(data, 'binary');
          let encodingType = this.encodingType(buf);
          if (encodingType === "unicode") {
            // this.$message.error("sorry，暂时无法解析 unicode 编码，请转换编码格式为ANSI或UTF8后再试");
            this.getBookContentByXHR(book);
            return;
          }
          let str = iconv.decode(buf, encodingType);
          this.handlerBook(str);
        });
      },

      // 根据 buffer 判断编码格式
      encodingType(buf) {
        if (buf[0] === 0xff && buf[1] === 0xfe) {
          return "unicode";
        } else if (buf[0] === 0xfe && buf[1] === 0xff) {
          return "unicode";
        } else if (buf[0] === 0xef && buf[1] === 0xbb) {
          return "utf8";
        }
        return "GBK";
      },

      // xhr 获取书籍内容
      getBookContentByXHR(book) {
        let xhr = new XMLHttpRequest();
        // 使用open方法初始化
        // 第一个参数为请求方法 可以为GET、POST或其他
        // 第二个参数为请求的地址
        // 第三个参数为true 则为异步执行，为false 则为同步执行
        xhr.open('GET', `file:/${book.url}`, true);
        xhr.send(null);
        xhr.onreadystatechange = () => {
          switch (xhr.readyState) {
            case 0:
              // 此时对象尚未初始化，也没有调用open方法
              break;
            case 1:
              // 此时对象已经调用了open方法，当没有调用send方法
              break;
            case 2:
              // 此时调用了send方法，但服务器还没有给出响应
              break;
            case 3:
              // 此时正在接收服务器的请求，当还没有结束，一般这里不做处理
              break;
            case 4:
              // 此时已经得到了服务器放回的数据，可以开始处理
              this.handlerBook(xhr.responseText);
              break;
          }
        };
      },

      // 处理书籍内容
      handlerBook(data) {
        WebWorker.run(data => {
          let content = [];
          let catalog = [];
          let chapterID = 0;
          data.split("\n").forEach((item, idx) => {
            // 去掉首尾空格
            item = item.replace(/^\s*(.*?)\s*$/, "$1");

            let reg = /^(第)(([\d零一二两三四五六七八九十百千万 ])+)([章卷])/;
            if (reg.test(item)) {
              chapterID++;
              catalog.push(item);
            } else if (idx === 0) {
              catalog.push(item);
            }

            content.push({
              txt: item,
              chapterID
            });
          });
          return {
            content,
            catalog,
          };
        }, [data]).then(r => {
          this.loading = false;
          this.content = r.content;
          this.catalog = r.catalog;
          this.getCurrentChapterContent();
        }).catch(e => {
          console.log(e);
        });
      },

      // 获取当前章节内容
      getCurrentChapterContent() {
        if (isNaN(this.currentChapter)) return;
        WebWorker.run((list, id) => {
          return list.filter(item => item.chapterID === id);
        }, [this.content, this.currentChapter]).then(r => {
          this.chapterContent = r;
          this.$refs.container.scrollTop = 0;
          this.setDocTitle();
          this.bookChangeFlag = false;
        }).catch(e => {
          console.log(e);
        });
      },

      // 上一章
      prevChapter() {
        if (this.currentChapter > 0) {
          this.changeChapter(this.currentChapter - 1);
        }
      },

      // 下一章
      nextChapter() {
        if (this.currentChapter < this.catalog.length) {
          this.changeChapter(this.currentChapter + 1);
        }
      },

      // 选择书籍
      changeBook(item) {
        this.getBookContent(item);
        this.libraryVisible = false;
      },

      // 选择章节
      changeChapter(chapterID) {
        let {name, url} = this.book;
        this.setBooksInfo({
          name,
          url,
          info: {
            chapterID: chapterID
          }
        });
        this.catalogVisible = false;
      },

      // 字体颜色修改
      fontColorChange(val) {
        this.setFontColor(val);
      },

      // 页面滚动事件
      scroll() {
        this.scrollTop = this.$refs.container.scrollTop;
      },

      // 键盘事件
      keyCB(e) {
        // console.log(e);
        let keyGroup = e.map(item => item.key).join("+");
        // console.log(keyGroup);
        if (keyGroup === "1") this.libraryVisible = !this.libraryVisible;
        if (keyGroup === "2") this.catalogVisible = !this.catalogVisible;
        if (keyGroup === "3") this.themeVisible = !this.themeVisible;
        if (keyGroup === "4") this.explanationVisible = !this.explanationVisible;
        if (keyGroup === "ArrowLeft") this.prevChapter();
        if (keyGroup === "ArrowRight") this.nextChapter();
        if (keyGroup === "-") this.setFontSize("-");
        if (keyGroup === "+") this.setFontSize("+");
        if (keyGroup === " ") this.turnPage();
      },

      // 翻页
      turnPage: debounce(function () {
        this.$refs.container.scrollTop += (document.body.clientHeight - 60);
      }, 200),

      // 添加文件
      addFile() {
        this.remoteDialog().then(r => {
          if (!r) {
            return;
          }
          let data = fs.readFileSync(this.optionsFile, {encoding: 'utf-8'});
          data = JSON.parse(data);
          let {books} = data;
          books.push(...r);
          this.saveConfig(data);
        }).catch(e => {
          console.log(e);
        });
      },

      // 选择文件
      remoteDialog(defaultPath) {
        return new Promise((resolve, reject) => {
          let {dialog} = remote;
          let result = dialog.showOpenDialog({
            title: "选择文件",
            defaultPath,
            filters: [
              {name: 'All Files', extensions: ["txt"]},
            ],
            properties: ["openFile", "showHiddenFiles", "multiSelections"],
          });
          resolve(result);
        });
      },

      // 保存配置
      saveConfig(data) {
        // console.log(data);
        fs.writeFileSync(this.optionsFile, JSON.stringify(data, null, '\t'), "utf-8",);
        this.getLibraryList();
      },

      // 删除书籍
      delBook(item) {
        const h = this.$createElement;
        this.$msgbox({
          title: '提示',
          message: h('p', null, [
            h('span', null, "确认删除"),
            h('span', {style: 'color: red'}, `《${item.name}》?`),
          ]),
          showCancelButton: true,
          confirmButtonText: '确定',
          cancelButtonText: '取消'
        }).then(() => {
          this.handleDelBook(item);
        }).catch(e => {
          console.log(e);
        });
      },

      // 操作删除书籍
      handleDelBook(book) {
        let data = fs.readFileSync(this.optionsFile, {encoding: 'utf-8'});
        data = JSON.parse(data);
        let {books} = data;
        books.splice(books.findIndex(item => item === book.url), 1);
        this.saveConfig(data);
        this.$message.success("删除成功");
      },

      // 打开文件夹
      openFileDir(item) {
        exec(`explorer.exe /select,"${item.url.replace(/\//g, "\\")}"`);
      },

      // 设置标题
      setDocTitle() {
        document.title = `${this.book.name} - ${this.chapterContent[0].txt}`;
      },

      // 保存主题到配置文件
      saveThemeData(themeActive) {
        let data = fs.readFileSync(this.optionsFile, {encoding: 'utf-8'});
        data = JSON.parse(data);
        let {theme} = data;
        theme.active = themeActive || "dark";
        this.saveConfig(data);
        ipcRenderer.send("setBackgroundColor", theme.opts[theme.active]);
      },

      ...mapMutations([
        "setBooksInfo",
        "setTheme",
        "setFontSize",
        "setFontColor",
        "setBook",
      ]),
    },
    activated() {
      this.init();
    },
  }
</script>

<style scoped lang="scss">
  .reader {
    background: #e0ce9e url("../images/bg/body_theme1_bg.png") repeat;

    .el-color-picker {
      /deep/ .el-color-picker__trigger {
        border: none;
      }
    }

    header {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
    }

    main {
      width: 100%;
      max-width: 800px;
      min-height: 300px;
      background: #f3e9c6 url("../images/bg/theme_1_bg.png") repeat;
      border: 1px solid #d8d8d8;
      margin: auto;
      padding: 30px 80px 800px;
      font-size: 18px;
      line-height: 36px;

      .content {
        margin-bottom: 15px;
        letter-spacing: 2px;
        text-indent: 2em;
        word-break: break-all;

        &:first-child {
          margin: 20px 0;
          text-indent: 0;
        }
      }
    }

    footer {
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    section {
      position: fixed;
      top: 60px;
      left: calc(50% - 480px);
      width: 60px;
      border: 1px solid #d8d8d8;
      background: #f3e9c6 url("../images/bg/theme_1_bg.png") repeat;
      ul {
        li {
          width: 100%;
          height: 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-bottom: 1px solid #d8d8d8;
          &:last-of-type {
            border: none;
          }
        }
      }
    }

    .libraryList {
      li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        a {
          font-size: 16px;
          line-height: 36px;
          text-decoration: underline;
          cursor: pointer;
          &.active {
            color: blue;
          }
        }
        .icon-wrapper {
          i {
            font-size: 18px;
            margin-left: 10px;
            &:hover {
              cursor: pointer;
              color: red;
            }
          }
        }
      }
    }

    .themeList {
      li {
        width: 30px;
        height: 30px;
        border: 1px solid #666;
        display: inline-block;
        margin-right: 15px;
        cursor: pointer;
        &.theme-yellow {
          background: url("../images/bg/theme_1_bg.png");
        }
        &.theme-dark {
          background: url("../images/bg/theme_6_bg.png");
        }
      }
    }

    .explanation-wrapper {
      .explanation-item {
        margin-bottom: 20px;
        font-size: 18px;
        .explanation-title {
          margin-bottom: 8px;
          font-weight: bold;
        }
        ul {
          li {
            text-indent: 2em;
            font-size: 16px;
          }
        }
      }
    }

    &.dark {
      color: #666;
      background: #e0ce9e url("../images/bg/body_theme6_bg.png") repeat;
      main, section {
        background: #f3e9c6 url("../images/bg/theme_6_bg.png") repeat;
        border-color: #666;
        li {
          border-color: #666;
        }
      }
    }
  }
</style>