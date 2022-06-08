class Midier {
  constructor(adapter) {
      this._adapter = adapter;
  }
  init() {
      let navigator = window.navigator;
      if (!navigator.requestMIDIAccess) {
          alert("unsupport midi device");
          return;
      }
      let self = this;
      console.log('Browser supports MIDI!');
      navigator.requestMIDIAccess()
          .then(function (midi) {
          self.onSuccess(midi);
      }, function () {
          self.onFailure();
      });
  }
  onSuccess(midi) {
      console.log('got midi!', midi);
      let inputs = midi.inputs.values();
      let self = this;
      let func = function (message) {
          self.onInput(message);
      };
      for (let input = inputs.next(); input && !input.done; input = inputs.next()) { // each time there is a midi message call the onMIDIMessage function
          input.value.onmidimessage = func;
      }
  }
  onInput(message) {
      console.log(message.data);
      this._adapter.service.sendMidi(message.data);
  }
  onFailure() {
      console.error('no access to your midi devices.');
  }
}
export default Midier