<template>
  <div>
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
  </div>
</template>

<script>
import {mapState} from 'vuex'

export default {
  computed: {
    ...mapState([])
  },
  methods: {
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
  }

}
</script>

<style lang="less" scoped>

</style>