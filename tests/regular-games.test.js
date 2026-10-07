'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
for(const game of ['daily','artist','djdle','orderdle']){
 const html=fs.readFileSync(game+'.html','utf8');
 assert(!html.includes('secure-game-client.js'),game+' must not load unfinished secure adapter');
 assert(!html.includes(game+'-server.js'),game+' must not load unfinished integration');
 assert(html.includes('scoring.js'),game+' retains stable scoring UI');
 assert(html.includes('result-modal')||html.includes('correctModal'),game+' retains result modal');
}
const daily=fs.readFileSync('daily.html','utf8');
for(const id of ['playBtn','volumeControl','guessInput','guessSubmit','results'])assert(daily.includes('id="'+id+'"'));
assert(daily.includes('Use iPhone volume buttons'));
assert(fs.readFileSync('orderdle.html','utf8').includes('/orderdle.js'));
console.log('Regular games remain on stable implementation with original controls and iPhone volume fix');
