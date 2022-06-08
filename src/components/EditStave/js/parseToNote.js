import Vex from "vexflow";
const VF = Vex.Flow
import { useRuleWithSub4 } from './useRules'



function parseRule(sub, noteSymbolStr, instrumentNames,flag, clef) {
  if (!sub) throw new Error('Invalid Sub!')
  if (!noteSymbolStr) throw new Error('Invaild noteSymbol!')
  if (!instrumentNames) throw new Error('Invaild InstrumentName')
  if (sub === 3) {
    // sub3
  }
  if (sub === 4) {
    //sub4

    const notes = useRuleWithSub4(noteSymbolStr, instrumentNames,flag,clef)
    return notes
  }

}




function parseToNotes(sub = 4, noteSymbolStr, instrumentNames,flag,clef) {
  const notes = parseRule(sub, noteSymbolStr, instrumentNames,flag,clef)
  return notes
}


export default parseToNotes