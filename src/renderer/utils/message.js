import { Message } from "element-ui";

// 根据返回数据动态提示
Message.auto = (data) => {
  if (!data || !data.message) return;
  Message[data.flag ? "success" : "error"](data.message);
};