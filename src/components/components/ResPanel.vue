<template>
  <div>
    <div class="resPanel">
      <div class="res-info-wrap">
        <div v-for="item in totalResInfo" :key="item.text" class="res-info">
          {{ item.text }}：{{ item.num }}
        </div>
      </div>
      <div class="res-item-wrap">
        <div
          class="res-item"
          v-for="(item, index) in resList"
          :key="index"
          :style="{ backgroundColor: item.color, color: 'white' }"
        >
          {{ item.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
 import {mapState} from 'vuex'
export default {
 computed: {
   ...mapState('editorStave/',['totalResInfo','resList'])
 },
}
</script>

<style lang="less" scoped>
.res-info-wrap {
  display: flex;
  justify-content: space-around;
  margin-bottom: 8px;
  .res-info {
    color: black;
    font-size: 30px;
  }
}
.res-item-wrap {
  display: flex;
  justify-content: center;
  .res-item {
    padding: 0 8px;
    display: inline-block;
    height: 30px;
    text-align: center;
    font: 12px/30px "微软雅黑";
    border-radius: 999px;
    margin-left: 8px;
  }
}
</style>