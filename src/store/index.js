import Vue from 'vue'
import Vuex from 'vuex'
Vue.use(Vuex)


const modules = {
  editorStave: {
    namespaced: true,
    state: {
      sectionNum: 1, //小节数
      totalSectionNum: 8, //总共能设置的总小节数
      beatPerSec: 3, //beat_num - 1
      staveWidth: document.documentElement.clientWidth * 0.08,
      // 拍号
      timeSignature: {
        beat_num: 2, // 一节多少拍
        beat_val: 4, // 以几分音符为一拍
      },
      clef: "percussion", //谱号
      sub: 4, // ？控制一拍
      noteInfoList: [0, 1, 2, 3], // 每个小圆点所拥有的信息
      staveId: 1,
      currSection: 1, //当前所在小节数
      allNotesSymbolList: [], //记录全部stave上的noteSymbolList
      allNotesListAsColumn: [], // 记录全部stave上的notesListAsColumn
      tempo: 60, // 节拍数

      buttonLoading: false, // button是否加载中
      isPause: false, //是否暂停
      isStop: true, //是否停止

      moveLine: {}, // 移动动画条
      addLineAni: {}, //给动画条添加动画
      changeLineStyle: {}, // 改变动画条样式
      addPercuResAnidDuration: {}, //给敲击结果添加动画持续时间
      changePercuResColor: {}, // 改变结果字体颜色

      aniInfo: {
        firstEndX: 0, //第一行终点
        firstStartX: 0, //第一行起点
        rightEndX: 0, //结束时x
        leftHeadX: 0, // 不是第一行，但是是除去第一行以外每行开头
        rightTailX: 0, // 不是结束，但是是每行最后一个
        topY: [], //改变后的高度
        restSecNum: 0, // 剩余需要播放的小节数
        currTime: 0, // 记录经过的时间
      },
      percussionInfo: {
        pitches: [],
        startTime: 0, // 开始时间
        deviation: 0.08, // 敲击误差时间
        timer: null,
        percNum: 0, // 需要敲击的次数
        resText: "", //结果text
        isNoteOn: false,
        perfectNum: 0,  // 记录每一列结果
        goodNum: 0,   // 同上
        isBadTiming: false,
        isBadPitch: false,
        index: 0, // notesColumn索引
      }, // 用来判断的敲击信息

      totalResInfo: [
        {
          text: "Perfect",
          num: 0,
        },
        {
          text: "Good",
          num: 0,
        },
        {
          text: "Bad Timing",
          num: 0,
        },
        {
          text: "Bad Pitch",
          num: 0,
        },
        {
          text: "Miss",
          num: 0,
        },
      ], // 总结果统计
      resList: [], // 每次结果列表
    }
  }
}

const store = new Vuex.Store({
  modules,
})

export default store