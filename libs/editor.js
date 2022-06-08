var midi;
(function (midi) {
  class Editor {
    constructor(core) {
      this.core = core
    }
    create(div, cnt) {
      div.innerHTML = "";
      this._rows = new Array();
      var confs = midi.Utils.confs;
      for (let i = 0, l = confs.length; i < l; i++) {
        var cols = this.createCols(div, confs[i], cnt);
        this._rows.push({
          conf: confs[i],
          cols: cols
        });
      }
    }
    load(div, data) {
      var ns = this.core.midiToSequenceProto(data);
      var qpm = ns.tempos[0].qpm;
      var delta = Editor._deltaTime;
      var cnt = ns.totalTime / delta;
      this.create(div, cnt);
      var confs = midi.Utils.confs;
      for (var i = 0, l = ns.notes.length; i < l; i++) {
        var n = ns.notes[i];
        var idx = this.idx(n.pitch);
        var b = n.startTime / delta;
        var e = n.endTime / delta;
        for (; b < e; b++) {
          this._rows[idx].cols[b].value = 1;
          this.show(this._rows[idx].cols[b]);
        }
      }
    }
    idx(value) {
      for (var i = 0, l = midi.Utils.confs.length; i < l; i++) {
        var c = midi.Utils.confs[i];
        if (c.value == value) {
          return i;
        }
      }
      return -1;
    }
    clear() {
      for (let i = 0, l = this._rows.length; i < l; i++) {
        let r = this._rows[i];
        for (let j = 0, s = r.cols.length; j < s; j++) {
          r.cols[j].value = 0;
          r.cols[j].src = 'images/button_off.png';
        }
      }
    }
    createCols(pad, conf, cnt) {
      var div = document.createElement('div');
      div.className = 'buttons_row';
      pad.appendChild(div);
      var span = document.createElement('span');
      span.className = 'label';
      span.innerHTML = conf.name;
      div.appendChild(span);
      var self = this;
      var func = function (e) {
        self.onMouseDown(e);
      };
      var arr = new Array();
      for (let i = 0; i < cnt; i++) {
        var img = document.createElement('img');
        img.className = 'btn';
        img['conf'] = conf;
        img['value'] = 0;
        img.setAttribute("src", 'images/button_off.png');
        img.addEventListener("mousedown", func, true);
        div.appendChild(img);
        arr.push(img);
      }
      return arr;
    }
    onMouseDown(event) {
      var btn = event.target;
      //btn.value = (btn.value + 1) % 3;
      btn.value = (btn.value + 1) % 2;
      this.show(btn);
    }
    show(btn) {
      switch (btn.value) {
        case 0:
          btn.src = 'images/button_off.png';
          break;
        case 1:
          btn.src = 'images/button_half.png';
          break;
        case 2:
          btn.src = 'images/button_on.png';
          break;
      }
    }
    save(rows, deltaTime) {
      var ns = this.core.sequences.createQuantizedNoteSequence(4, 120);
      ns.quantizationInfo = null //必须有
      ns.timeSignatures = [{
        time: 0,
        numerator: 4,
        denominator: 4
      }];
      ns.tempos = [{
        time: 0,
        qpm: 120
      }];
      ns.notes = [];
      ns.sourceInfo = {
        encodingType: 'MIDI',
        parser: 'TONEJS_MIDI_CONVERT'
      };
      this._deltaTime = deltaTime ? deltaTime : 0.125
      this.fill(ns, rows);
      var data = this.core.sequenceProtoToMidi(ns);
      return data;
    }
    fill(ns, rows) {
      // var rows = this._rows;
      var l = rows[0].cols.length;
      var delta = this._deltaTime,
        startTime = 0,
        endTime = 0;
      for (var i = 0; i < l; i++) {
        endTime = startTime + delta;
        for (var j = 0, r = rows.length; j < r; j++) {
          // var value = rows[j].cols[i].value;
          const value = rows[j].cols[i]
          if (value == 0) {
            continue;
          }
          var n = {
            pitch: rows[j].conf.value,
            velocity: 80,
            startTime: startTime,
            endTime: endTime,
            instrument: 0,
            program: 0,
            isDrum: true
          };
          ns.notes.push(n);
        }
        startTime = endTime;
      }
      ns.totalTime = endTime;
    }
  }
  midi.Editor = Editor;
})(midi || (midi = {}));
(function (midi) {
  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
      var info = gen[key](arg);
      var value = info.value;
    } catch (error) {
      reject(error);
      return;
    }
    if (info.done) {
      resolve(value);
    } else {
      Promise.resolve(value).then(_next, _throw);
    }
  }

  function _asyncToGenerator(fn) {
    return function () {
      var self = this,
        args = arguments;
      return new Promise(function (resolve, reject) {
        var gen = fn.apply(self, args);

        function _next(value) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
        }

        function _throw(err) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
        }
        _next(undefined);
      });
    };
  }

  class Player {
    constructor(core, noteCallback) {
      this._player = null;
      this._soundFont = "";
      this._noteSequence = null;
      this._noteCallback = null;
      this._config = {};
      this._note = {};
      this._noteCallback = noteCallback;
      this.core = core
    }
    load(data, load) {
      this._noteSequence = this.core.midiToSequenceProto(data);
      // quantize noteSequence 使之使用click
      // this._noteSequence = this.core.sequences.quantizeNoteSequence(this._noteSequence, tempo / 30)
      var self = this;
      return _asyncToGenerator(function* () {
        var soundFont = self._soundFont;
        var callbackObject = {
          // Call callbacks only if we are still playing the same note sequence.
          run: n => self.onNote(n),
          stop: () => self.stop()
        };
        if (soundFont === null) {
          self._player = new self.core.Player(true, callbackObject);
        } else {
          if (soundFont === "") {
            soundFont = Player.DEFAULT_SOUNDFONT;
          }
          self._player = new self.core.SoundFontPlayer(soundFont, undefined, undefined, undefined, callbackObject);
          yield self._player.loadSamples(self._noteSequence);
        }
        if (load) load()
        self.onLoad();
      })();
    }
    onLoad() {}
    onNote(note) {
      if (this._noteCallback) {
        const {
          run
        } = this._noteCallback
       run(note)
      }
    }
    get tempo() {
      return this._noteSequence.tempos[0].qpm;
    }
    set tempo(v) {
      this._player.setTempo(v);
    }
    play() {
      this._player.start(this._noteSequence)
    }
    stop() {
      if (this._noteCallback) {
        const {
          stop
        } = this._noteCallback
        stop()
      }
      this._player.stop();
    }
    pause() {
      this._player.pause();
    }
    resume() {
      this._player.resume();
    }
  }
  Player.DEFAULT_SOUNDFONT = 'http://101.201.196.248:8063/soundfonts';
  // Player.DEFAULT_SOUNDFONT = 'https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus'
  midi.Player = Player;
})(midi || (midi = {}));

(function (midi) {
  class Utils {}
  Utils.KICK = 36;
  Utils.SNARE = 38;
  Utils.SNARE_RIM = 40;
  Utils.TOM_1 = 48;  
  Utils.TOM_1_RIM = 50;
  Utils.TOM_2 = 43;
  Utils.TOM_2_RIM = 58;
  Utils.TOM_3 = 41;
  Utils.TOM_3_RIM = 39;
  Utils.CLOSE_HI_HAT = 42;
  Utils.OPEN_HI_HAT = 46;
  Utils.CRASH_LEFT = 55;
  Utils.CRASH_LEFT_BELL = 49;
  Utils.CRASH_RIGHT = 52;
  Utils.CRASH_RIGHT_BELL = 57;
  Utils.RIDE_EDGE = 59;
  Utils.RIDE = 51;
  Utils.RIDE_BELL = 53;
  Utils.confs = [{
      instrumentId: 0,
      name: "Crash-Left",
      value: Utils.CRASH_LEFT
    },
    {
      instrumentId: 1,
      name: "Open-Hi-Hat",
      value: Utils.OPEN_HI_HAT
    },
    {
      instrumentId: 2,
      name: "Close-Hi-Hat",
      value: Utils.CLOSE_HI_HAT
    },
    {
      instrumentId: 3,
      name: "Ride",
      value: Utils.RIDE
    },
    {
      instrumentId: 4,
      name: "Tom 1",
      value: Utils.TOM_1
    },
    {
      instrumentId: 5,
      name: "Tom 2",
      value: Utils.TOM_2
    },
    {
      instrumentId: 6,
      name: "Snare",
      value: Utils.SNARE
    },
    {
      instrumentId: 7,
      name: "Tom 3",
      value: Utils.TOM_3
    },

    {
      instrumentId: 8,
      name: "Kick",
      value: Utils.KICK
    },
  ];
  midi.Utils = Utils;
})(midi || (midi = {}));

export {
  midi
}