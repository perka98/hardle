'use strict';
// Correct only the obsolete Noisecontrollers label in persisted puzzle/guess snapshots.
// Do not reset sessions, alter clue visibility, or touch scores and attempts.
const artist=require('./private/artists.json').find(item=>item.name==='Noisecontrollers');
const oldLabel='Label: Art of Creation';
const label=artist.clues.find(clue=>clue.startsWith('Label: '));
function clues(value){return Array.isArray(value)?value.map(clue=>clue===oldLabel?label:clue):value}
function feedback(value){if(!value)return value;return {...value,...(Array.isArray(value.clues)?{clues:clues(value.clues)}:{}),...(value.answer?.name===artist.name?{answer:{...value.answer,clues:clues(value.answer.clues)}}:{})}}
function solution(value){if(value?.answer!==artist.id)return value;return {...value,clues:clues(value.clues),reveal:{...value.reveal,clues:clues(value.reveal?.clues)}}}
function session(value,answer){if(!value||answer!==artist.id)return value;return {...value,public_payload:{...value.public_payload,clues:clues(value.public_payload?.clues)},guesses:(value.guesses||[]).map(guess=>({...guess,feedback:feedback(guess.feedback)})),result:feedback(value.result)}}
module.exports={solution,session,feedback,artistId:artist.id};
