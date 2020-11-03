import types from "./mutation-types.js";

const state = {
  theme: "dark",
  booksInfo: {},
  fontSize: 30,
  fontColor: "",
  book: {},
};

const getters = {};

const mutations = {
  [types.SET_BOOKS_INFO](state, bookInfo) {
    if (!bookInfo.url) return;
    state.booksInfo[bookInfo.url] = bookInfo.info;
  },
  [types.SET_THEME](state, theme) {
    state.theme = theme;
  },
  [types.SET_FONT_SIZE](state, e) {
    if (e === "+") {
      state.fontSize += 2;
    } else if (e === "-") {
      if (state.fontSize > 12) state.fontSize -= 2;
    } else if (!isNaN(e)) {
      let size = Number(e);
      size = size < 12 ? 12 : size;
      state.fontSize = size;
    }
  },
  [types.SET_FONT_COLOR](state, color) {
    state.fontColor = color;
  },
  [types.SET_BOOK](state, book) {
    state.book = book;
  },
};

const actions = {};

export default {
  state,
  getters,
  mutations,
  actions
}
