import Vex from "vexflow";
const VF = Vex.Flow

let FLAG = false
// note位置
function noteKeys(instrumentNames) {
  let keys = []
  for (let item of instrumentNames) {
    keys.push([])
  }
  for (let i = 0; i < instrumentNames.length; i++) {
    for (let j = 0; j < instrumentNames[i].length; j++) {
      const key = instrumentNameToKey(instrumentNames[i][j])
      keys[i].push({
        instrumentName: instrumentNames[i][j],
        key
      })
    }
  }
  return keys
}

// instrumentName to key
function instrumentNameToKey(instrumentName) {
  let key = ''
  switch (instrumentName) {
    case 'Kick':
      key = 'f/4'
      break
    case 'Snare':
      key = 'a/4'
      break
    case 'Tom 1':
      key = 'e/5'
      break
    case 'Tom 2':
      key = 'd/5'
      break
    case 'Tom 3':
      key = 'c/5'
      break
    case 'Open-Hi-Hat':
      key = 'g/5'
      break
    case 'Crash-Left':
      key = 'a/5'
      break
    case 'Ride':
      key = 'f/5'
      break
    case 'Close-Hi-Hat':
      key = 'g/5'
      break
    default:
      throw new Error('No Match Instruments!')
  }
  return key
}



// note 形状
function noteDuration() {
  if (FLAG) {
    return 'm'
  } else {
    return ''
  }
}



// note stem
function stemDirection() {
  if (FLAG) {
    return 0
  } else {
    return -1
  }
}


// StaveNote
function sn(keys, duration, stem_direction,
  clef = "percussion",

) {
  let index = -1
  let keyArr = []

  // 找到open_hi_hat索引
  keys.forEach((val, idx) => {
    if (val.instrumentName === 'Open-Hi-Hat') {
      index = idx
    }
    keyArr.push(val.key)
  });

  // 不是hi-hat或是休止符
  if (index === -1 || duration.indexOf('r') !== -1) {
    if (duration.indexOf('r') !== -1 && FLAG) {
      return new VF.StaveNote({
        keys: ['b/5'],
        duration,
        stem_direction,
        clef,
      })
    } else if (duration.indexOf('r') !== -1 && !FLAG) {
      return new VF.StaveNote({
        keys: ['e/4'],
        duration,
        stem_direction,
        clef,
      })
    } else {
      return new VF.StaveNote({
        keys: keyArr,
        duration,
        stem_direction,
        clef,
      })
    }
  } else {
    return new VF.StaveNote({
      keys: keyArr,
      duration,
      stem_direction,
      clef,
    }).addAnnotation(index, new VF.Annotation('๐').setJustification(4)
      .setVerticalJustification(1))
  }

}

function useRuleWithSub4(noteSymbolStr, instrumentNames, flag, clef) {
  let notes = []
  FLAG = flag
  const keys = noteKeys(instrumentNames)
  const nd = noteDuration()
  const sd = stemDirection()
  switch (noteSymbolStr) {
    case '0000':
      if (FLAG) {
        let key = 'b/5'
        notes = [sn([{
          instrumentName: '',
          key
        }], '4r', sd)]

      } else {
        let key = 'e/4'
        notes = [sn([{
          instrumentName: '',
          key
        }], '4r', sd)]
      }
      break;
    case '1000':
      notes = [sn(keys[0], '4' + nd, sd)]
      break;
    case '0100':
      notes = [sn(keys[1], '16r', sd), sn(keys[1], '8' + nd, sd).addDotToAll()]
      break;
    case '0010':
      notes = [sn(keys[2], '8r', sd), sn(keys[2], '8' + nd, sd)]
      break;
    case '0001':
      notes = [sn(keys[3], '8r', sd).addDotToAll(), sn(keys[3], '16' + nd, sd)]
      break;
    case '1100':
      notes = [sn(keys[0], '16' + nd, sd), sn(keys[1], '8' + nd, sd).addDotToAll()]
      break;
    case '1010':
      notes = [sn(keys[0], '8' + nd, sd), sn(keys[2], '8' + nd, sd)]
      break;
    case '1001':
      notes = [sn(keys[0], '8' + nd, sd).addDotToAll(), sn(keys[3], '16' + nd, sd)]
      break;
    case '0110':
      notes = [sn(keys[1], '16r', sd), sn(keys[1], '16' + nd, sd), sn(keys[2], '8' + nd, sd)]
      break;
    case '0101':
      notes = [sn(keys[1], '16r', sd), sn(keys[1], '8' + nd, sd), sn(keys[3], '16' + nd, sd)]
      break;
    case '0011':
      notes = [sn(keys[2], '8r', sd), sn(keys[2], '16' + nd, sd), sn(keys[3], '16' + nd, sd)]
      break;
    case '1110':
      notes = [sn(keys[0], '16' + nd, sd), sn(keys[1], '16' + nd, sd), sn(keys[2], '8' + nd, sd)]
      break;
    case '1101':
      notes = [sn(keys[0], '16' + nd, sd), sn(keys[1], '8' + nd, sd), sn(keys[3], '16' + nd, sd)]
      break;
    case '1011':
      notes = [sn(keys[0], '8' + nd, sd), sn(keys[2], '16' + nd, sd), sn(keys[3], '16' + nd, sd)]
      break;
    case '0111':
      notes = [sn(keys[1], '16r', sd), sn(keys[1], '16' + nd, sd), sn(keys[2], '16' + nd, sd), sn(keys[3], '16' + nd, sd)]
      break;
    case '1111':
      notes = [sn(keys[0], '16' + nd, sd), sn(keys[1], '16' + nd, sd), sn(keys[2], '16' + nd, sd), sn(keys[3], '16' + nd, sd)]
      break;
    default:
      return new Error('No Match Notes!')
  }

  return notes
}

export {
  useRuleWithSub4
}