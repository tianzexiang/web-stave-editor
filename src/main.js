import Vue from 'vue'
import App from './App.vue'
import {Slider,InputNumber,Divider,Select,Button,Icon} from 'ant-design-vue'
import store from './store/index'

Vue.use(Slider)
Vue.use(InputNumber)
Vue.use(Divider)
Vue.use(Select)
Vue.use(Button)
Vue.use(Icon)


Vue.component('remote-script', {

  render: function (createElement) {
    var self = this;
    return createElement('script', {
      attrs: {
        type: 'text/javascript',
        src: this.src
      },
      on: {
        load: function (event) {
          self.$emit('load', event);
        },
        error: function (event) {
          self.$emit('error', event);
        },
        readystatechange: function (event) {
          if (this.readyState == 'complete') {
            self.$emit('load', event);
          }
        }
      }
    });
  },

  props: {
    src: {
      type: String,
      required: true
    }
  }
})





// const mm = require("@magenta/music/node/music_vae");
// const core = require("@magenta/music/node/core");
// const globalAny = global;
// globalAny.performance = Date;
// globalAny.fetch = require("node-fetch");

// const model = new mm.MusicVAE(
//   "https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small"
// );
// const player = new core.Player();



// import {
//   Drawer,
//   Button
// } from 'element-ui';
// Vue.use(Drawer)
// Vue.use(Button)


Vue.config.productionTip = false





new Vue({
  store,
  render: h => h(App),
}).$mount('#app')