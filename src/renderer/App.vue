<template>
  <div id="app">
    <keep-alive>
      <router-view></router-view>
    </keep-alive>
  </div>
</template>

<script>
  export default {
    name: 'READER',
  }
</script>

<style lang="scss">
  @import "assets/scss/global.scss";
</style>
