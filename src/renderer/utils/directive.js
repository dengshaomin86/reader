import Vue from "vue"
import store from '../store/index'
import _ from "lodash";

// 注意：除了 el 之外，其它参数都应该是只读的，切勿进行修改。如果需要在钩子之间共享数据，建议通过元素的 dataset 来进行
Vue.directive("key", {
  /**
   * 只调用一次，指令第一次绑定到元素时调用。在这里可以进行一次性的初始化设置
   * @param el 指令所绑定的元素，可以用来直接操作 DOM
   * @param binding 一个对象，包含以下属性：name、value、oldValue、expression
   * @param vnode Vue 编译生成的虚拟节点。移步 VNode API 来了解更多详情
   * @param oldVnode 上一个虚拟节点，仅在 update 和 componentUpdated 钩子中可用
   */
  bind(el, binding, vnode, oldVnode) {
    let keyGroup = [];
    el.addEventListener("keydown", (e) => {
      if (!keyGroup.find(it => it.keyCode === e.keyCode)) keyGroup.push(e);
      if (binding.modifiers.space && e.code === "Space") {
        e.preventDefault();
      }
    });
    el.addEventListener("keyup", (e) => {
      binding.value(keyGroup);
      keyGroup = [];
    });
  },
  // 被绑定元素插入父节点时调用 (仅保证父节点存在，但不一定已被插入文档中)。
  inserted() {
  },
  // 所在组件的 VNode 更新时调用，但是可能发生在其子 VNode 更新之前。指令的值可能发生了改变，也可能没有。但是你可以通过比较更新前后的值来忽略不必要的模板更新 (详细的钩子函数参数见下)。
  update() {
  },
  // 指令所在组件的 VNode 及其子 VNode 全部更新后调用
  componentUpdated() {
  },
  // 只调用一次，指令与元素解绑时调用。
  unbind() {
  },
});

Vue.directive("keypress", {
  bind(el, binding) {
    el.addEventListener("keypress", (e) => {
      console.log("keypress");
    });
  }
});

// 自由拖拽
Vue.directive("drag", {
  bind(el) {
    const dom = el;
    dom.style.cursor = "move";
    dom.style.position = "absolute";
    dom.addEventListener("mousedown", (e) => {
      const disX = e.clientX - dom.offsetLeft;
      const disY = e.clientY - dom.offsetTop;
      document.onmousemove = function (ev) {
        dom.style.left = ev.clientX - disX + "px";
        dom.style.top = ev.clientY - disY + "px";
      };
      document.onmouseup = function () {
        document.onmousemove = null;
        document.onmouseup = null;
      };
      e.preventDefault(); // 阻止冒泡事件，禁止选择文字，禁止网页原生图片拖动效果
    });
  }
});

// 自动隐藏鼠标
Vue.directive("autoHideCursor", {
  bind(el, binding) {
    const dom = el;
    let {cursor} = dom.style;
    let timeOut = null;
    let time = binding.arg && !isNaN(binding.arg) && binding.arg;
    dom.addEventListener("mousemove", (e) => {
      dom.style.cursor = cursor;
      clearTimeout(timeOut);
      timeOut = null;
      timeOut = setTimeout(() => {
        dom.style.cursor = "none";
      }, time || 2000);
    });
  }
});

// 鼠标滚动放大缩小
Vue.directive("wheel", {
  bind(el, binding) {
    const dom = el;
    const step = binding.arg && !isNaN(binding.arg) && Number(binding.arg) || 300;
    if (dom.nodeName !== "IMG") return;
    dom.addEventListener("mousewheel", (e) => {
      // 相对源点移动距离
      dom.style.left = `${dom.offsetLeft}px`;
      dom.style.top = `${dom.offsetTop}px`;
      let moveLenLeft = step * (e.clientX - dom.offsetLeft) / dom.width;
      let moveLenTop = (step * dom.height / dom.width) * (e.clientY - dom.offsetTop) / dom.height;

      // 鼠标向上滚动
      if (e.wheelDelta > 0) {
        dom.width += step;
        dom.style.left = `${dom.offsetLeft - moveLenLeft}px`;
        dom.style.top = `${dom.offsetTop - moveLenTop}px`;
      } else {
        dom.width -= step;
        dom.style.left = `${dom.offsetLeft + moveLenLeft}px`;
        dom.style.top = `${dom.offsetTop + moveLenTop}px`;
      }
    });
  }
});

// 监听 dom 属性变化
Vue.directive("observer", {
  bind(el, binding) {
    const dom = el;
    let observer = new MutationObserver(_.debounce(() => {
      binding.value();
    }, 300));
    observer.observe(dom, {
      // attributes: true,
      childList: true,
      // characterData: true,
      // subtree: true,
      // attributeFilter: ["class", "height", "style"]
    });
    // observer.disconnect(); // 停止监听
  }
});
