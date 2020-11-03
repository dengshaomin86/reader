import Vue from "vue";

Vue.mixin({
  methods: {
    toNavigation() {
      this.$router.push("/navigation");
    },
    clear() {
      Object.assign(this.$data, this.$options.data());
    },
  }
});
