<template>
  <div id="editor-stave-container">
    <!-- 总编辑器 -->
    <div class="editor-container">
      <!-- 编辑器选项 -->
      <div class="editor-options">
        <!-- 控制总小节数 -->
        <div class="section-number">
          <span>总小节数：</span>
          <a-button-group>
            <a-button
              v-for="item in totalSectionNum"
              :key="item"
              @click="handleSectionNumChange(item)"
              :class="[
                sectionNum === item ? 'button-active' : '',
                'button-ani',
              ]"
            >
              {{ item }}小节
            </a-button>
          </a-button-group>
        </div>

        <!-- 控制拍号 -->
        <div class="time-signature">
          <span>拍号：</span>
          <a-button-group class="player">
            <a-button
              v-for="item in beatPerSec"
              :key="item"
              @click="timeSignature.beat_num = item + 1"
              :class="[
                item + 1 === timeSignature.beat_num ? 'button-active' : '',
              ]"
            >
              {{ item + 1 }}/4
            </a-button>
          </a-button-group>
        </div>

        <!-- 控制当前小节数 -->
        <div class="section-controller">
          <span>当前小节数：</span>
          <span
            class="section-minus"
            v-show="currSection > 1"
            @click="currSection--"
          >
            <a-icon type="minus" />
          </span>
          <a-select
            default-value="1"
            style="width: 100px"
            v-model="currSection"
            size="small"
            class="section-select"
          >
            <a-select-option
              v-for="item in sectionNum"
              :value="item"
              :key="item"
            >
              {{ item }}
            </a-select-option>
          </a-select>

          <span
            class="section-plus"
            v-show="currSection < sectionNum"
            @click="currSection++"
          >
            <a-icon type="plus"
          /></span>
        </div>

        <!-- 控制tick -->
        <div class="tick-controller">
          <span>节拍器：</span>
          <a-slider
            v-model="tempo"
            :min="40"
            :max="250"
            :defaultValue="120"
            style="width: 200px"
          ></a-slider>
          <a-input-number
            v-model="tempo"
            size="small"
            :min="40"
            :max="250"
            style="width: 100px"
            @change="handleInputNumberChange"
          ></a-input-number>
        </div>

        <!-- 新建小节 -->
        <div class="new-section">
          <a-button @click="reDrawStave">新建</a-button>
        </div>
      </div>

      <!-- 编辑器 -->
      <div class="editor">
        <span>当前所在小节数：{{ currSection }}</span>
        <div class="editor-panel">
          <div
            class="editor-row"
            v-for="item1 in confs"
            :key="item1.instrumentId"
          >
            <div class="instrument-name">{{ item1.name }}</div>
            <div
              :class="['editor-stave']"
              v-for="(item2, index2) in staveList"
              :key="item2.staveId"
              v-show="
                index2 < currSection * timeSignature.beat_num &&
                index2 >= (currSection - 1) * timeSignature.beat_num
                  ? true
                  : false
              "
            >
              <div
                :class="[
                  'editor-note',
                  item2.noteSymbolList[item1.instrumentId][item3]
                    ? 'dot-active'
                    : item3 % sub === 0
                    ? 'dot-divide'
                    : 'dot-inactive',
                  'button-ani',
                ]"
                v-for="item3 in noteInfoList"
                :key="item3"
                @click="handleNoteClick(item1, item2, item3)"
              ></div>
            </div>
          </div>
        </div>
        <!-- 播放器 -->
        <div class="player-wrap">
          <a-button-group class="player">
            <a-button
              @click="loadMidi"
              :loading="buttonLoading"
              :disabled="!isStop"
              >播放</a-button
            >
            <a-button @click="stopMidi" :disabled="isStop">停止</a-button>
            <a-button @click="saveMidi">保存</a-button>
          </a-button-group>
        </div>
      </div>
    </div>

    <!-- <div class="resPanel">
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
    </div> -->

    <ResPanel></ResPanel>

    <a-divider orientation="left" style="width: 80%">五线谱</a-divider>

    <!-- 展示五线谱 -->
    <div id="show-stave">
      <div ref="mountEl" class="mountEl-class"></div>
      <div
        class="line-ani"
        :style="[moveLine, addLineAni, changeLineStyle]"
        ref="line"
      ></div>
    </div>
  </div>
</template>

<script>
import * as core from "@magenta/music/es6/core";
import Vex from "vexflow";
import parseToNote from "./js/parseToNote.js";
import "../../../libs/protobuf-library.min.js";
import { midi } from "../../../libs/editor";
import { WebMidi } from "../../../node_modules/webmidi/dist/webmidi.esm.js";


// 子组件引入
import ResPanel from '../components/ResPanel'

let editor = null;
let player = null;

let aniLineTime = 0;

const VF = Vex.Flow;
const Beam = VF.Beam;

let mountEl = null; //将要被挂载的元素
let noteTimer = null; // note播放监视计时器
let aniLineTimer = null; // 动画条计时器

export default {
  components: {
    ResPanel,
  },
  props: {
    staveList: { // 记录有多少拍
      type: Array,
      default() {
        return []
      }
    }
  },
  data() {
    return {
      context: null, // 记录画布
      contextWidth: document.body.clientWidth, //画布宽度
      y: 20,

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
      confs: midi.Utils.confs, //记录乐器及其声音等配置
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
    };
  },
  computed: {
    // 计算画布高度
    contextHeight() {
      return 180 * Math.floor((this.sectionNum + 1) / 2);
    },

    // 计算stave x偏移量
    x() {
      return this.sectionNum === 1
        ? this.contextWidth / 2 -
            (this.staveWidth * this.timeSignature.beat_num) / 2
        : this.contextWidth / 2 - this.staveWidth * this.timeSignature.beat_num;
    },
    totalTime() {
      return this.sectionNum * this.movePerBarTime;
    },
    movePerBarTime() {
      // 解决除不尽问题
      return (
        Math.round(((this.timeSignature.beat_num * 60) / this.tempo) * 100) /
        100
      );
    },

    deltaTime() {
      return (
        Math.round((60 / (this.tempo * this.timeSignature.beat_val)) * 1000) /
        1000
      );
    },
  },

  watch: {
    sub: {
      handler(val) {
        switch (val) {
          case 3:
            this.noteInfoList = [0, 1, 2];
            break;
          case 4:
            this.noteInfoList = [0, 1, 2, 3];
            break;
          default:
            this.noteInfoList = [0, 1, 2, 3];
            break;
        }
      },
      immediate: true,
    },
    "timeSignature.beat_num": {
      handler() {
        this.reDrawStave();
      },
      deep: true,
    },
    sectionNum() {
      this.reDrawStave();
    },
    tempo() {
      this.stopMidi();
    },
  },

  created() {
    this.handleMidiInput();
  },

  mounted() {
    editor = new midi.Editor(core);
    player = new midi.Player(core, {
      run: this.handlePlayerRun,
      stop: this.handlePlayerStop,
    });
    mountEl = this.$refs.mountEl;
    this.drawStave();
    this.$nextTick(() => {
      window.addEventListener("resize", () => {
        this.contextWidth = document.body.clientWidth;
        this.reDrawStave();
      });
    });
  },

  methods: {
    // 创建画布
    useContext({ width = 500, height = 500, renderWay = "SVG" }) {
      if (!mountEl) throw new Error("Invaild Element!");
      renderWay = VF.Renderer.Backends[renderWay]; //渲染方式
      const renderer = new VF.Renderer(mountEl, renderWay);
      renderer.resize(width, height);
      const context = renderer.getContext();
      context.scale(1, 1); //scale等比缩放svg大小 .fillText("hhh", 40, 40);
      return context;
    },

    // 创建一拍stave
    useStave(
      context = null,
      {
        x = 10,
        y = 40,
        width = 400,
        beat_num,
        beat_val,
        clef,
        isEndBar = false,
        right_bar = false,
        left_bar = false,
      }
    ) {
      if (!context) throw new Error("Invaild Context!");

      const stave = new VF.Stave(x, y, width, { right_bar, left_bar });
      if (clef && beat_num && beat_val) {
        stave
          .addClef(clef)
          .addTimeSignature(`${beat_num}/${beat_val}`)
          .setContext(context)
          .draw();
      } else if (clef && !beat_num) {
        stave.addClef(clef).setContext(context).draw();
      } else if (isEndBar) {
        stave.setEndBarType(VF.Barline.type.END).setContext(context).draw();
      } else {
        stave.setContext(context).draw();
      }

      this.staveList.push({
        staveId: this.staveId,
        stave,
        noteSymbolList: [],
        notesList: [],
        voices: [],
        notesListAsColumn: [],
      });
      this.staveId++;
      return stave;
    },

    // 处理noteSymbolList
    handleNoteSymbolList(n, nc) {
      let notes1 = [];
      let notes2 = [];
      let notesStr1 = "";
      let notesStr2 = "";
      let names1 = [];
      let names2 = [];
      for (let i = 0; i < this.sub; i++) {
        notes1.push({ state: 0, names: [] });
        notes2.push({ state: 0, names: [] });
      }

      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (n[j][i]) {
            notes1[i].state = 1;
            notes1[i].names.push(this.confs[j].name);
          }
        }
      }
      for (let i = 0; i < 4; i++) {
        for (let j = 4; j < 9; j++) {
          if (n[j][i]) {
            notes2[i].state = 1;
            notes2[i].names.push(this.confs[j].name);
          }
        }
      }
      for (let item of notes1) {
        notesStr1 += item.state;
        names1 = [...names1, item.names];
      }
      for (let item of notes2) {
        notesStr2 += item.state;
        names2 = [...names2, item.names];
      }

      // true 代表前4个乐器，false代表后5个乐器
      const staveNotes1 = parseToNote(this.sub, notesStr1, names1, true);
      const staveNotes2 = parseToNote(this.sub, notesStr2, names2, false);

      this.arrangeNotesAsColumn(notes1, notes2, staveNotes1, staveNotes2, nc);

      return [staveNotes1, staveNotes2];
    },

    // 处理noteSymbolList后处理notes
    arrangeNotesAsColumn(
      notes1,
      notes2,
      staveNotes1,
      staveNotes2,
      notesListAsColumn
    ) {
      notesListAsColumn.length = 0;
      let staveNotesList = notesListAsColumn;
      let staveNotesIdx1 = 0;
      let staveNotesIdx2 = 0;
      if (!notes1[0].state && !notes2[0].state) {
        staveNotesIdx1++;
        staveNotesIdx2++;
      } else if (!notes1[0].state && notes2[0].state) staveNotesIdx1++;
      else if (!notes2[0].state && notes1[0].state) staveNotesIdx2++;
      for (let i = 0; i < this.sub; i++) {
        if (notes1[i].state && notes2[i].state) {
          // 都为1
          staveNotesList.push([
            staveNotes1[staveNotesIdx1],
            staveNotes2[staveNotesIdx2],
          ]);
          staveNotesIdx1++;
          staveNotesIdx2++;
        } else if (notes1[i].state && !notes2[i].state) {
          // 上部分为1
          staveNotesList.push([staveNotes1[staveNotesIdx1]]);
          staveNotesIdx1++;
          // if(staveNotes2[staveNotesIdx2].noteType === "r") staveNotesIdx2++
        } else if (notes2[i].state && !notes1[i].state) {
          // 下部分为1
          staveNotesList.push([staveNotes2[staveNotesIdx2]]);
          staveNotesIdx2++;
          // if(staveNotes1[staveNotesIdx1].noteType === "r") staveNotesIdx1++
        } else continue;
      }
    },

    // 画出stave,并初始化并记录动画条位置信息
    drawStave(isRecordLinePos = true) {
      const beat_num = this.timeSignature.beat_num;
      const sectionNum = this.sectionNum;
      const drawNum = beat_num * sectionNum;

      let x = this.x; // 记录x
      let y = this.y;

      // 重新创建画布
      this.context = this.useContext({
        width: this.contextWidth,
        height: this.contextHeight,
        renderWay: "SVG",
      });

      // 循环画出每一拍stave
      for (let i = 0; i < drawNum; i++) {
        // 是否是第一个(因为一节最少有两拍所以无逻辑错误)
        if (i === 0) {
          const stave = this.useStave(this.context, {
            x,
            y,
            width: this.staveWidth + 56.5,
            beat_num: this.timeSignature.beat_num,
            beat_val: this.timeSignature.beat_val,
            clef: this.clef,
            left_bar: true,
          });
          if (isRecordLinePos) this.initLinePos(stave, "start");
        } else {
          // 不是第一个的情况下是否是每行开头第一个
          if ((i / 2) % beat_num === 0) {
            y = this.staveList[0].stave.height * (i / (2 * beat_num)) * 2;
            x = this.x;
            const stave = this.useStave(this.context, {
              x,
              y,
              width: this.staveWidth + 26,
              left_bar: true,
              clef: "percussion",
            });
            if (isRecordLinePos) this.initLinePos(stave, "head");
          } else {
            x =
              this.staveList[i - 1].stave.width + this.staveList[i - 1].stave.x;

            if (i === drawNum - 1) {
              // 是最后一个
              this.useStave(this.context, {
                x,
                y,
                width: this.staveWidth + 6,
                isEndBar: true,
                right_bar: true,
              });
              if (isRecordLinePos) this.aniInfo.rightEndX = x + this.staveWidth;
            } else if ((i + 1) % beat_num === 0) {
              // 不是最后一个的情况下，是否是每小节最后一个
              this.useStave(this.context, {
                x,
                y,
                width: this.staveWidth,
                right_bar: true,
              });
              if (isRecordLinePos) {
                if (i + 1 === beat_num * 2)
                  this.aniInfo.firstEndX = x + this.staveWidth;
                else this.aniInfo.rightTailX = x + this.staveWidth;
              }
            } else {
              // 其余
              this.useStave(this.context, {
                x,
                y,
                width: this.staveWidth,
              });
            }
          }
        }
      }
      this.setStaveParams();
    },

    // 画出note
    drawNote() {
      let beams = [];
      for (let item of this.staveList) {
        item.voices = [];
      }
      for (let item of this.staveList) {
        for (let notes of item.notesList) {
          if (notes.length !== 0) {
            beams = [
              ...beams,
              ...Beam.generateBeams(notes, {
                maintain_stem_directions: true,
              }),
            ];

            const voice = new VF.Voice({
              num_beats: this.timeSignature.beat_num,
              beat_value: this.timeSignature.beat_val,
            });
            voice.mode = 2;
            voice.addTickables(notes);
            item.voices.push(voice);
            notes.forEach((n) => {
              n.setStave(item.stave);
            });

            // 隔离tickContext,传参必须是数组 [voice]
            new VF.Formatter()
              .joinVoices([voice])
              .format([voice], this.staveWidth);
          }
        }
        if (item.voices.length !== 0) {
          item.voices.forEach((v) => {
            v.draw(this.context);
          });

          // 执行顺序不能随意更改
          beams.forEach((b) => {
            b.setContext(this.context).draw();
          });
        }
      }
    },

    // 小圆点点击事件
    handleNoteClick(
      { instrumentId },
      { noteSymbolList, notesList, notesListAsColumn },
      noteId
    ) {
      const lastStaveList = this.staveList;
      this.reDrawStave();
      this.staveList = lastStaveList;
      this.allNotesListAsColumn.forEach((notes) => {
        notes.forEach((note) => {
          note.setStyle({});
        });
      });
      // 改变小圆点状态同时改变noteSymbolList
      if (noteSymbolList[instrumentId][noteId] === 0) {
        noteSymbolList[instrumentId][noteId] = 1;
      } else {
        noteSymbolList[instrumentId][noteId] = 0;
      }
      const staveNotes = this.handleNoteSymbolList(
        noteSymbolList,
        notesListAsColumn
      );
      notesList[0] = staveNotes[0];
      notesList[1] = staveNotes[1];
      this.initAllNotesListAsColumn();
      this.drawNote();
    },

    // 重画每拍stave
    reDrawStave(isRecordLinePos = true) {
      mountEl.innerHTML = "";
      this.staveList = [];
      this.staveId = 1;
      this.allNotesSymbolList = [];
      if (isRecordLinePos) {
        this.initialLineState();
        this.resetLineAni();
      }

      this.drawStave(isRecordLinePos);
    },

    reDrawNotes(isReset = false, { color = "", notes = [] } = {}) {
      if (isReset) {
        this.allNotesListAsColumn.forEach((notes) => {
          notes.forEach((note) => {
            note.setStyle({});
          });
        });
      } else {
        notes.forEach((note) => {
          note.setStyle({ shadowColor: color, shadowBlur: 30 });
        });
      }
      const lastStaveList = this.staveList;
      this.reDrawStave(false);
      this.staveList = lastStaveList;
      this.drawNote();
    },

    // 重置note颜色
    resetNotesColor() {
      this.reDrawNotes(true);
    },

    // 根据confs设置stave中参数
    setStaveParams() {
      const sub = this.sub;
      for (let item1 of this.staveList) {
        for (let item2 of this.confs) {
          switch (sub) {
            case 3:
              item1.noteSymbolList.push([0, 0, 0]);
              break;
            case 4:
              item1.noteSymbolList.push([0, 0, 0, 0]);
              break;
            default:
              item1.noteSymbolList.push([0, 0, 0, 0]);
          }
        }
        for (let i = 0; i < 2; i++) {
          item1.notesList.push([]);
        }
      }
    },

    //初始化allNotesSymbolList
    initAllNotesSymbolList() {
      this.allNotesSymbolList.length = 0;
      for (let i = 0; i < this.confs.length; i++) {
        let cols = [];
        for (let j = 0; j < this.staveList.length; j++) {
          cols = [...cols, ...this.staveList[j].noteSymbolList[i]];
        }
        this.allNotesSymbolList.push({
          conf: this.confs[i],
          cols,
        });
      }
    },

    // 初始化allNotesListAsColumn
    initAllNotesListAsColumn() {
      this.allNotesListAsColumn.length = 0;
      for (let stave of this.staveList) {
        for (let notes of stave.notesListAsColumn) {
          this.allNotesListAsColumn.push(notes);
        }
      }
    },

    // 改变小节数
    handleSectionNumChange(num) {
      this.sectionNum = num;
      // 当总小节数小于当前所在小节数
      if (num < this.currSection) {
        this.currSection = num;
      }
    },

    // 限制输入框输入内容
    handleInputNumberChange() {
      if (this.tempo < 40) {
        this.tempo = 40;
      } else if (this.tempo > 250) {
        this.tempo = 250;
      }
    },

    // 下载文件
    download(filename, content) {
      var blob = new Blob([content], { type: "text/plain" });
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement("a");

      a.style = "display: none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 5);
    },

    // 保存为midi文件
    saveMidi() {
      this.initAllNotesSymbolList();
      const midiData = editor.save(this.allNotesSymbolList, this.deltaTime);
      this.download("music.mid", midiData);
    },

    stopMidi() {
      if (!this.isStop) {
        player.stop();
        this.isStop = true;
      }
      this.resList.length = 0;
      this.resetNotesColor();
      this.initialLineState();
    },

    // 监视动画条动画
    watchLineAni() {
      // 解决js浮点运算问题
      const movePerBarTime = this.movePerBarTime;
      const currTime = this.aniInfo.currTime;
      const isLineTail = (currTime * 100) % (movePerBarTime * 100 * 2) === 0;
      const topYIndex = Math.floor(
        (currTime * 100) / (movePerBarTime * 100 * 2)
      );

      if (currTime >= this.totalTime) {
        this.initialLineState();
      } else {
        if (isLineTail) {
          this.useRemoveLineAni();
          //移到首部
          this.useMoveLine(
            this.aniInfo.leftHeadX,
            this.aniInfo.topY[topYIndex]
          );
          setTimeout(() => {
            if (this.aniInfo.restSecNum <= 2) {
              this.useAddLineAni(
                this.aniInfo.restSecNum,
                this.timeSignature.beat_num,
                this.tempo
              ); //重新添加动画
              this.useMoveLine(
                this.aniInfo.rightEndX,
                this.aniInfo.topY[topYIndex]
              );
            } else {
              this.useAddLineAni(2, this.timeSignature.beat_num, this.tempo); //重新添加动画
              if (this.aniInfo.restSecNum % 2 === 0) {
                this.useMoveLine(
                  this.aniInfo.rightEndX,
                  this.aniInfo.topY[topYIndex]
                );
              } else {
                this.useMoveLine(
                  this.aniInfo.rightTailX,
                  this.aniInfo.topY[topYIndex]
                );
              }
              this.aniInfo.restSecNum -= 2;
            }
          }, 20);
        } else return;
      }
    },

    beforeLoadMidi() {
      this.resetNotesColor();
      this.buttonLoading = true;
      this.stopMidi();
      this.percussionInfo.index = 0;
      this.initAllNotesSymbolList();
    },

    // 播放
    loadMidi() {
      this.beforeLoadMidi();
      const midiData = editor.save(this.allNotesSymbolList, this.deltaTime);
      for (let item of this.totalResInfo) {
        item.num = 0;
      }
      this.resList.length = 0;

      // 播放加载
      player.load(midiData, () => {
        this.buttonLoading = false;
        this.isStop = false;
        if (this.aniInfo.restSecNum <= 2) {
          this.useAddLineAni(
            this.sectionNum,
            this.timeSignature.beat_num,
            this.tempo
          );
          this.useMoveLine(this.aniInfo.rightEndX, this.aniInfo.topY[0]);
        } else {
          this.useAddLineAni(2, this.timeSignature.beat_num, this.tempo);
          this.useMoveLine(this.aniInfo.firstEndX, this.aniInfo.topY[0]);
          this.aniInfo.restSecNum -= 2;
        }

        // 每走完一小节轮询一次
        noteTimer = setInterval(() => {
          this.aniInfo.currTime =
            (this.aniInfo.currTime * 100 + this.movePerBarTime * 100) / 100; // 解决js浮点数相加bug

          this.watchLineAni();
        }, this.movePerBarTime * 1000);
      });
      player.play();
      aniLineTimer = setInterval(() => {
        aniLineTime += 10;
      }, 10);
    },

    // 动画条初始状态
    initialLineState() {
      this.useRemoveLineAni();
      this.useMoveLine(this.aniInfo.firstStartX, this.aniInfo.topY[0]);
      this.aniInfo.restSecNum = this.sectionNum;
      this.resetNoteTimer();
    },

    // 添加动画条动画
    useAddLineAni(sectionNum, beat_num, tempo) {
      const duration = (sectionNum * beat_num * 60) / tempo;
      this.addLineAni = {
        transition: `transform ${duration}s linear`,
      };
    },
    // 添加敲击结果动画
    useAddPercuResAni(res, index) {
      let notes = this.allNotesListAsColumn[index];
      let color = "";
      switch (res) {
        case 0:
          this.resList.push({
            text: "Perfect",
            color: "green",
          });
          color = "green";
          break;
        case 1:
          this.resList.push({
            text: "Good",
            color: "red",
          });
          color = "red";
          break;
        case 2:
          this.resList.push({
            text: "Bad Timing",
            color: "black",
          });
          color = "black";
          break;
        case 3:
          this.resList.push({
            text: "Bad Pitch",
            color: "blue",
          });
          color = "blue";
          break;
        case 4:
          this.resList.push({
            text: "Miss",
            color: "purple",
          });
          color = "purple";
          break;
      }
      this.reDrawNotes(false, { color, notes });
    },

    // 除去动画条动画
    useRemoveLineAni() {
      this.addLineAni = {
        transition: `transform 0s linear`,
      };
    },
    // 移动动画条
    useMoveLine(x = 0, y = 0) {
      this.moveLine = {
        transform: `translate(${x}px,${y}px) translateZ(0)`,
      };
    },

    // 初始化动画条部分信息
    initLinePos(stave, to) {
      this.aniInfo.restSecNum = this.sectionNum;
      if (to === "start") {
        const timeSignatureModifier = stave.getModifiers()[3];
        const x =
          timeSignatureModifier.x +
          timeSignatureModifier.width +
          timeSignatureModifier.padding;
        this.aniInfo.firstStartX = x - 3;
        this.aniInfo.topY.push(this.y);
        this.useMoveLine(this.aniInfo.firstStartX, this.aniInfo.topY[0]);
      } else if (to === "head") {
        const clefModifier = stave.getModifiers()[2];
        const x = clefModifier.x + clefModifier.width + clefModifier.padding;
        this.aniInfo.leftHeadX = x - 2;
        this.aniInfo.topY.push(stave.y);
      }
    },

    // 重置动画条信息
    resetLineAni() {
      this.aniInfo = {
        firstEndX: 0,
        firstStartX: 0, //第一拍开始
        rightEndX: 0, //结束时x
        leftHeadX: 0, // 不是第一行，但是是除去第一行以外每行开头
        rightTailX: 0, // 不是结束，但是是每行最后一个
        topY: [], //改变后的高度
        restSecNum: 0, // 剩余需要播放的小节数
      };
      if (!this.isStop) {
        player.stop();
        this.isStop = true;
      }
      this.resetNoteTimer();
      this.aniInfo.restSecNum = this.sectionNum;
    },

    // 重置note定时器
    resetNoteTimer() {
      this.aniInfo.currTime = 0;
      clearInterval(noteTimer);
      noteTimer = null;
    },

    // 处理播放结束时事件
    handlePlayerStop() {
      this.isStop = true;
      clearInterval(aniLineTimer);
      aniLineTimer = null;
      aniLineTime = 0;
    },

    // 处理播放事件
    handlePlayerRun(note) {
      this.percussionInfo.percNum++;
      this.percussionInfo.pitches.push(note.pitch);
      this.percussionInfo.startTime = note.startTime;

      // 改变颜色
      this.changeLineStyle = {
        backgroundColor: "red",
      };
      this.percussionInfo.isNoteOn = false;
      setTimeout(() => {
        this.changeLineStyle = {};
      }, 100);

      // 敲击判断信息记录
      if (this.percussionInfo.timer !== null)
        clearTimeout(this.percussionInfo.timer);
      this.percussionInfo.timer = setTimeout(() => {
        if (this.percussionInfo.percNum > 0) {
          // console.log("Miss!");
          this.totalResInfo[4].num++;
          this.useAddPercuResAni(4, this.percussionInfo.index);
        } else {
          if (this.percussionInfo.isBadTiming) {
            // console.log("Bad Timing!");
            this.totalResInfo[2].num++;
            this.useAddPercuResAni(2, this.percussionInfo.index);
          } else if (this.percussionInfo.isBadPitch) {
            // console.log("Bad Pitch!")
            this.totalResInfo[3].num++
            this.useAddPercuResAni(3, this.percussionInfo.index);
          } else {
            if (this.percussionInfo.perfectNum >= this.percussionInfo.goodNum) {
              // console.log("Perfect!");
              this.totalResInfo[0].num++;
              this.useAddPercuResAni(0, this.percussionInfo.index);
            } else {
              // console.log("Good!");
              this.totalResInfo[1].num++;
              this.useAddPercuResAni(1, this.percussionInfo.index);
            }
          }
        }

        this.percussionInfo.percNum = 0;
        this.percussionInfo.pitches.length = 0;
        this.percussionInfo.isBadTiming = false
        this.percussionInfo.isBadPitch = false
        this.percussionInfo.perfectNum = 0;
        this.percussionInfo.goodNum = 0;
        this.percussionInfo.index++;
      }, this.percussionInfo.deviation * 1000);
    },

    // 处理midi敲击
    handleMidiInput() {
      WebMidi.enable()
        .then(() => {
          // let output = WebMidi.getOutputByName('USB2.0-MIDI');
          let input = WebMidi.inputs[0];
          input.addListener("noteon", "all", (e) => {
            this.percussionInfo.percNum--;
            const delta =
              Math.abs(
                this.percussionInfo.startTime * 1000 - aniLineTime + 140
              ) / 1000;
            if (delta <= this.percussionInfo.deviation && this.percussionInfo.pitches.length !== 0) {
              const noteonPitch = e.data[1]
              if (this.percussionInfo.pitches.includes(noteonPitch)) {
                if (delta <= this.percussionInfo.deviation / 2) {
                  this.percussionInfo.perfectNum++;
                  // console.log('1111');
                } else {
                  this.percussionInfo.goodNum++;
                }
              } else {
                this.percussionInfo.isBadPitch = true;
              }
            } else {
              this.percussionInfo.isBadTiming = true;
            }
          });
        })
        .catch((err) => alert(err));
    },
  },
};
</script>

<style lang="less" scoped>
@instrument-height: 2.5vw;
.option-flex-layout(@ration) {
  flex: 0 0 @ration;
  display: flex;
  align-items: center;
  justify-content: center;
}
.active-style() {
  background-color: #161616;
  color: #eb6e26;
  border-color: #404040;
}

.ant-btn:hover {
  background-color: #161616;
  color: #eb6e26;
  border-color: #404040;
}
.ant-btn:focus {
  background-color: #ffffff;
  color: #595959;
  border-color: #d9d9d9;
}

.dot-inactive {
  background-color: #161616;
}
.dot-active {
  background-color: #eb6e26;
}
.dot-divide {
  background-color: #282c34;
}

.button-active {
  &:focus {
    .active-style;
  }
  .active-style;
}
.button-ani {
  transition: all 0.25s ease-in-out;
}

// .res-info-wrap{
//   display: flex;
//   justify-content: space-around;
//   margin-bottom: 8px;
//   .res-info {
//   color: black;
//   font-size: 30px;
// }
// }
// .res-item-wrap{
//   display: flex;
//   justify-content: center;
//   .res-item {
//   padding: 0 8px;
//   display: inline-block;
//   height: 30px;
//   text-align: center;
//   font: 12px/30px "微软雅黑";
//   border-radius: 999px;
//   margin-left: 8px;
// }
// }

@keyframes resInOut {
  from {
    transform: translateY(0);
    opacity: 0;
  }
  to {
    transform: translateY(-30px);
    opacity: 1;
  }
}

#editor-stave-container {
  overflow-x: hidden;
  .editor-container {
    display: flex;
    justify-content: space-evenly;
    flex-direction: column;

    .editor-options {
      display: flex;
      flex-wrap: wrap;
      margin-top: 20px;

      .section-number {
        .option-flex-layout(100%);
      }
      .time-signature {
        .option-flex-layout(25%);
      }
      .section-controller {
        user-select: none;
        .option-flex-layout(25%);
        .section-select {
          margin: 0 10px;
        }
        .section-plus,
        .section-minus {
          &:hover {
            cursor: pointer;
            .active-style;
          }
          height: 20px;
          width: 20px;
          display: inline-block;
          border: 1px solid black;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      }

      .tick-controller {
        user-select: none;
        .option-flex-layout(35%);
        display: flex;
        align-items: center;
      }
      .new-section {
        .option-flex-layout(10%);
      }
    }

    .editor {
      white-space: nowrap;
      display: flex;
      flex-direction: column;
      align-items: center;
      span:nth-of-type(1) {
        font: bold 15px "微软雅黑";
        color: #ec6d25;
      }
      .editor-panel {
        border-radius: 10px;
        overflow: hidden;
        .editor-row {
          display: flex;
          align-items: center;
          .instrument-name {
            height: @instrument-height;
            line-height: @instrument-height;
            display: inline-block;
            width: 120px;
            background-color: #161616;
            text-align: center;
            color: #ec6d25;
            border: 1px solid #404040;
          }
          .editor-stave {
            display: inline-flex;
            justify-content: space-around;
            align-items: center;
            height: @instrument-height;
            .editor-note {
              border: 1px solid #404040;
              width: @instrument-height * 1.25;
              height: @instrument-height;
            }
          }
        }
      }
      .player-wrap {
        margin: 5px 0 10px 0;
      }
    }
  }

  #show-stave {
    width: 100%;
    position: relative;
    .line-ani {
      height: 120px;
      background-color: #eb6e26;
      border-radius: 999px;
      opacity: 0.6;
      position: absolute;
      width: 8px;
      left: 0;
      top: 0;
    }
  }
}
</style>