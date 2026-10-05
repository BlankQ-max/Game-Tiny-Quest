const $=id=>document.getElementById(id);
const R=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const T=40,COLS=13,ROWS=11;

const MAPS=[
{n:"Thimble Hollow",c:['#93c85e','#8abf55'],w:'🌳',rows:[
"#############",
"#.....~~....#",
"#.H...~~..S.#",
"#.....~~....#",
"#...........#",
"#.P........Q>",
"#...........#",
"#..##.......#",
"#..##...##..#",
"#...........#",
"#############"]},
{n:"Whispering Forest",c:['#5c9a48','#548f42'],w:'🌲',respawn:1,rows:[
"#############",
"#..r...#..C.#",
"#.###..#.g..#",
"#...#....##.#",
"#.g.#..r....#",
"<P.........Q>",
"#.#####.....#",
"#...C..~~.g.#",
"#.r....~~...#",
"#.g.....~...#",
"#############"]},
{n:"Slime Caves",c:['#6b6b76','#63636e'],w:'🪨',rows:[
"#############",
"#...#...#..k#",
"#...#.r.#...#",
"#.r.....#.r.#",
"#...##.....C#",
"<P.........QD",
"#.....##....#",
"#.....#..r..#",
"#.##.....##.#",
"#....r......#",
"#############"]},
{n:"Throne Room",c:['#7a3b4a','#71354a'],w:'🧱',lock:"A cold wind blows from the east door, but the Slime King still blocks the way.",rows:[
"#############",
"#...........#",
"#.....K.....#",
"#...........#",
"#...#...#...#",
"<P.........Q>",
"#...........#",
"#...#...#...#",
"#...........#",
"#...........#",
"#############"]},
{n:"Frostbite Peak",c:['#d6ecf8','#cbe4f3'],w:'🧊',respawn:1,lock:"A wall of ice seals the east exit while the Frost Titan still stands.",rows:[
"#############",
"#.H..#...i.C#",
"#....#..#...#",
"#.S......#..#",
"#...i....#.i#",
"<P.........Q>",
"#..##...##..#",
"#..#..i...#.#",
"#C....##....#",
"#.i........B#",
"#############"]},
{n:"Ember Caverns",c:['#8a4b2d','#7f4328'],w:'🌋',wc:'#e8602c',respawn:1,rows:[
"#############",
"#.H...~~..f.#",
"#.....~~....#",
"#.S.f.......#",
"#...##..f.#.#",
"<P.........Q>",
"#.f.#...##..#",
"#...#.~~..f.#",
"#.C...~~....#",
"#.....f....C#",
"#############"]},
{n:"Murk Marsh",c:['#5f7a45','#587340'],w:'🪵',wc:'#3f6a4f',respawn:1,rows:[
"#############",
"#...~~.....C#",
"#.m.~~..m...#",
"#...#....~~.#",
"#.S.#.m..~~.#",
"<P.........Q>",
"#..~~..#.m..#",
"#H.~~..#....#",
"#....m...~~.#",
"#.C..~~...m.#",
"#############"]},
{n:"Moon Spire",c:['#2b2f5a','#262a52'],w:'🌑',respawn:1,rows:[
"#############",
"#H.S...#...C#",
"#...f..#.i..#",
"#......#....#",
"#.m..f.#..m.#",
"<P.........M#",
"#......#....#",
"#.m....#.i..#",
"#......#....#",
"#.C....#...C#",
"#############"]}];
const DEF={
 g:{name:"Green Slime",color:"#5cc95c",hp:16,atk:[2,4],heavy:.2,c:[3,6],j:.5},
 r:{name:"Red Slime",color:"#e0463c",hp:22,atk:[3,6],heavy:.35,c:[6,10],j:.8},
 f:{name:"Fire Slime",color:"#ff8a3d",hp:40,atk:[6,10],heavy:.35,c:[16,22],j:.6},
 m:{name:"Mud Slime",color:"#8a6a3a",hp:46,atk:[6,11],heavy:.4,c:[18,24],j:.7},
 i:{name:"Frost Slime",color:"#7fd8ff",hp:32,atk:[5,9],heavy:.35,c:[12,18],j:.6},
 K:{name:"Slime King",color:"#5b6ee1",hp:45,atk:[5,8],heavy:.35,king:1,intro:"rises from the throne, crown wobbling."},
 M:{name:"Last King Slime",color:"#3a2f7a",hp:100,atk:[7,11],heavy:.3,king:1,ice:1,cf:"#ffe9a0",cs:"#b8860b",intro:"rises from the shadows, a dark moon floating over its head."},
 B:{name:"Frost Titan",color:"#9ad9ff",hp:75,atk:[6,10],heavy:.3,king:1,ice:1,intro:"bursts out of the ice, crown of icicles clattering."}};
const CH={'1:10,1':{c:20,j:2},'1:4,7':{c:15,j:3},'2:11,4':{c:35,pot:2},'4:11,1':{c:50,j:3},'4:1,8':{c:40,pot:3},'5:2,8':{c:45,j:3},'5:11,9':{c:60,pot:3},'6:11,1':{c:55,j:3},'6:2,9':{c:50,pot:3},'7:11,1':{c:70,j:4},'7:11,9':{c:70,pot:3},'7:2,9':{c:60,j:3}};
const SW=[[25,2],[50,4],[90,6],[150,9],[230,12]],AR=[[20,2],[45,4],[80,6],[130,8],[200,11]],HC=[[60,5],[110,8],[180,12]];
const SH=[[40,3],[90,6]],AH=[[35,3],[80,6]],QS=[[50,4],[100,7]],LK=[[45,4],[100,8]];
const GUARD=[.35,.25,.15];
const REWARD=3;                       // coin multiplier for slimes and chests
const BR={K:[300,10],B:[600,16]};     // boss rewards: [coins, jelly]
const LV=i=>1+.4*i;                   // rewards grow with each level (Village x1.0 ... Moon Spire x3.8)
const UP=[
 {id:'sw',l:'⚔ Sword, +2 attack',tb:SW,done:'Your sword gleams.'},
 {id:'ar',l:'🛡 Armor, −1 damage taken',tb:AR,done:'A sturdier fit.'},
 {id:'hc',l:'❤ Heart charm, +10 max HP',tb:HC,done:'You feel sturdier.',fx:()=>{P.max+=10;P.hp+=10}},
 {id:'sh',l:'🔰 Shield polish, guard blocks more',tb:SH,done:'Your guard feels rock solid.'},
 {id:'ah',l:'🍯 Golden acorns, snacks heal +4',tb:AH,done:'The snacks smell amazing.'},
 {id:'qs',l:'💥 Quick strike, power strike recharges faster',tb:QS,done:'You feel quicker.'},
 {id:'lk',l:'🍀 Lucky charm, +25% coins from slimes',tb:LK,done:'The charm jingles.'}];

function svg(d){
 const c=d.color;
 return `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><path d="M8 72 Q4 28 50 20 Q96 28 92 72 Z" fill="${c}" stroke="#0004" stroke-width="3"/><ellipse cx="34" cy="38" rx="9" ry="5" fill="#fff5" transform="rotate(-25 34 38)"/><circle cx="37" cy="50" r="8" fill="#fff"/><circle cx="63" cy="50" r="8" fill="#fff"/><circle cx="39" cy="51" r="3.5" fill="#222"/><circle cx="65" cy="51" r="3.5" fill="#222"/><path d="M40 63 Q50 70 60 63" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/>${d.ice?'<path d="M26 28 L30 8 L38 22 L44 0 L50 20 L56 0 L62 22 L70 8 L74 28 Z" fill="'+(d.cf||'#e8fbff')+'" stroke="'+(d.cs||'#4aa8d8')+'" stroke-width="2.5"/>':d.king?'<path d="M30 26 L34 6 L43 18 L50 2 L57 18 L66 6 L70 26 Z" fill="#f6c343" stroke="#a27a0c" stroke-width="2.5"/>':''}</svg>`}
const IMG={};
for(const k in DEF){const i=new Image();i.onload=()=>mode==='map'&&drawMap();i.src='data:image/svg+xml,'+encodeURIComponent(svg(DEF[k]));IMG[k]=i}

/* Arlo: look changes with sword level (blade) and armor level (tunic, pads, helm) */
function hero(sw=0,ar=0,f=0,bk=0,ln=0){
 const tun=['#4f8f5a','#9a6a3a','#8b94a3','#d7b03a','#b04fd7','#e8f2ff'][ar],dk='#0004';
 const bl=['#b8bcc4','#e3edf7','#f2c94c','#6fe3ff','#ff6bd6','#fff6a8'][sw];
 const lo=f===1?-6:0,ro=f===2?-6:0,sa=f===1?24:f===2?-24:0;
 return `<svg class="hero" viewBox="0 -8 60 88" xmlns="http://www.w3.org/2000/svg">
 <ellipse cx="30" cy="77" rx="17" ry="3" fill="#0003"/>
 <g transform="translate(0 ${f?-2:0}) rotate(${ln} 30 72)">
 <path d="M19 34 L${f===1?7:f===2?11:9} ${f===1?62:f===2?68:66} L27 60 Z" fill="#c9503c" stroke="${dk}" stroke-width="1.5"/>
 <g transform="translate(0 ${lo})"><rect x="21" y="56" width="7" height="16" rx="2" fill="#3b3a4a"/><rect x="19" y="68" width="10" height="7" rx="3" fill="#5a3a22" stroke="${dk}"/></g>
 <g transform="translate(0 ${ro})"><rect x="32" y="56" width="7" height="16" rx="2" fill="#3b3a4a"/><rect x="31" y="68" width="10" height="7" rx="3" fill="#5a3a22" stroke="${dk}"/></g>
 <g transform="rotate(${sa} 16 36)"><rect x="12" y="34" width="8" height="18" rx="4" fill="${tun}" stroke="${dk}" stroke-width="1.5"/><circle cx="16" cy="53" r="4" fill="#f1c7a0"/></g>
 <rect x="18" y="32" width="24" height="26" rx="6" fill="${tun}" stroke="${dk}" stroke-width="2"/>
 <rect x="18" y="49" width="24" height="5" fill="#5a3a22"/><rect x="28" y="48" width="4" height="7" rx="1" fill="#f6c343"/>
 ${bk?`<path d="M20 32 Q30 29 40 32 L45 63 Q30 69 15 63Z" fill="#c9503c" stroke="${dk}" stroke-width="2"/>`:''}
 <rect x="40" y="34" width="8" height="16" rx="4" fill="${tun}" stroke="${dk}" stroke-width="1.5"/><circle cx="46" cy="52" r="4" fill="#f1c7a0"/>
 ${ar>=1?`<circle cx="17" cy="36" r="6" fill="${tun}" stroke="${dk}" stroke-width="2"/><circle cx="43" cy="36" r="6" fill="${tun}" stroke="${dk}" stroke-width="2"/>`:''}
 ${sw>=3?`<rect x="41" y="10" width="9" height="42" rx="4" fill="${bl}" opacity=".35"/>`:''}
 <rect x="44.5" y="12" width="3" height="38" rx="1.5" fill="${bl}" stroke="${dk}"/><path d="M44.5 12 L46 7 L47.5 12Z" fill="${bl}" stroke="${dk}"/>
 <rect x="41" y="49" width="10" height="3" rx="1" fill="#8a6a2a"/><rect x="45" y="52" width="2" height="5" fill="#5a3a22"/>
 <circle cx="30" cy="22" r="12" fill="${bk?(ar>=2?'#9aa3b2':'#5a3a22'):'#f1c7a0'}" stroke="${dk}" stroke-width="2"/>
 ${bk?'':`<circle cx="26" cy="23" r="1.8" fill="#222"/><circle cx="34" cy="23" r="1.8" fill="#222"/><path d="M26 28 Q30 31 34 28" stroke="#222" stroke-width="1.6" fill="none" stroke-linecap="round"/>`}
 ${bk?'':ar>=2?`<path d="M17 22 Q17 6 30 6 Q43 6 43 22 L38 17 Q30 13 22 17Z" fill="#9aa3b2" stroke="${dk}" stroke-width="2"/>`:`<path d="M18 21 Q19 6 32 8 Q43 9 42 21 Q36 13 30 14 Q23 14 18 21Z" fill="#5a3a22" stroke="${dk}"/>`}
 ${ar>=3?`<path d="M30 6 Q36 -4 46 2 Q39 5 35 10Z" fill="#c9503c" stroke="${dk}"/>`:''}
 </g></svg>`}
const HI={};
function heroImg(f,v){
 const b=P.sw+'-'+P.ar;
 if(!HI[b])HI[b]=[0,1,2,3,4,5,6,7,8].map(n=>{const fr=n%3,vw=(n-fr)/3,i=new Image();i.onload=()=>mode==='map'&&drawMap();i.src='data:image/svg+xml,'+encodeURIComponent(hero(P.sw,P.ar,fr,vw===1,vw===2&&fr?9:0));return i});
 const a=HI[b],h=a[v*3+f];return h.complete?h:a[0];
}
let G,F,INIT,SP,cur,pl,P,mode='text',B,busy,log=[],frame=0,curKey,face=1,vw=0,vis={x:0,y:0},dust=[];
const isMoving=()=>Math.abs(vis.x-pl.x)>.001||Math.abs(vis.y-pl.y)>.001;
const cv=$('cv'),ctx=cv.getContext('2d');ctx.scale(2,2);
const key=(x,y)=>x+','+y;
function view(v){['mapView','battleView','textView'].forEach(x=>$(x).hidden=x!==v)}
function setMsg(t){$('status').textContent=t}
function showText(o,cb,btn){
 mode='text';view('textView');
 $('textView').innerHTML=`<div class="card">${o.pic||''}<h2 style="${o.big?'font-size:2.4rem':''}">${o.title}</h2>${o.text.split("\n\n").map(t=>`<p>${t}</p>`).join("")}<button class="primary" id="ok">${btn||'Continue'}</button></div>`;
 $('ok').onclick=cb;$('ok').focus();
}
const BUILD=13;
function fixExits(){   // older saves kept their own copy of each map and are missing newer exits
 G.forEach((g,i)=>{if(MAPS[i].rows[5][12]==='>'&&g[5][12]==='#')g[5][12]='>'});
}
function toMap(){fixExits();mode='map';view('mapView');hud();drawMap()}
function quest(){
 if(P.won)return "🏆 You saved the Moon Crumb! Explore freely, open chests, and max out your gear.";
 const left=Object.keys(F[2]).length;
 const ka=i=>Object.values(F[i]).some(d=>DEF[d].king);
 if(!ka(4))return "Reach the Moon Spire at the end of the climb and defeat the Last King Slime to win back the Moon Crumb.";
 if(!ka(3))return cur===4?"Defeat the Frost Titan in the far corner of the peak.":"The Slime King is beaten! Take the cracked east door to Frostbite Peak.";
 if(P.key)return "You have the key! Take it to the locked door at the end of the caves and defeat the Slime King.";
 if(P.sw+P.ar<2)return "Hunt forest slimes for coins and jelly, then upgrade your gear at the village shop.";
 return left?`Clear the Slime Caves (${left} slime${left>1?'s':''} left), then open the key chest.`:"Open the key chest at the far end of the caves.";
}
function exitOpen(){return !Object.keys(F[cur]).length||!!(P.cl&&P.cl[cur])}
function exitHint(){
 const ka=Object.values(F[cur]).some(d=>DEF[d].king);
 if(P.won&&cur===MAPS.length-1)return "The Moon Spire is quiet now. Use the ⬅️ exit on the left wall to revisit earlier levels.";
 if(cur===MAPS.length-1)return "This is the last level! Defeat the Last King Slime at the right end of the middle row.";
 if(cur===2&&!P.key)return "The 🚪 door on the right wall is locked. Open the 🧰 key chest in the top-right corner first (defeat every slime in the caves).";
 if(!exitOpen()){const n=Object.keys(F[cur]).length;return ka?"The ➡️ exit is sealed. Defeat every slime, including the big crowned boss, to open it.":`Clear the room first: ${n} slime${n>1?'s':''} left. Then use the exit on the right wall, middle row.`}
 return "Walk to the glowing exit on the right wall, middle row.";
}
function hud(){
 save();
 const pct=P.hp/P.max*100,low=pct<30,nm=['Village','Forest','Caves','Throne','Peak','Ember','Marsh','Spire'];
 $('hud').innerHTML=`<div class="por">${hero(P.sw,P.ar)}</div>
 <div><div style="font-size:.85rem"><b>Arlo</b> · ${MAPS[cur].n}</div><div class="dbar"><i style="width:${pct}%;${low?'background:#e0463c':''}"></i><span>HP ${P.hp} / ${P.max}</span></div></div>
 <div class="chips"><span>💰 ${P.coins}</span><span>🟢 ${P.jelly}</span><span>🌰 ${P.pot}</span><span>⚔ ${4+P.sw*2}–${7+P.sw*2}</span><span>🛡 −${P.ar}</span><span>🗝️ ${P.key?'Yes':'No'}</span>${P.won?'<span>🏆</span>':''}</div>
 <div class="quest"><b>Quest:</b> ${quest()}</div>
 <div class="quest" style="border-top:0;padding-top:0"><b>Next level:</b> ${exitHint()}</div>
 <div class="route">${nm.map((n,i)=>`<b class="${i===cur?'on':''}">${n}${i===3&&!P.key?' 🔒':''}</b>`).join(' › ')}</div>`;
}

function newGame(sv){
 G=[];INIT=[];SP=[];F=[];
 MAPS.forEach((m,i)=>{
  const g=m.rows.map(r=>r.split('')),f={},sp={};
  g.forEach((row,y)=>row.forEach((c,x)=>{
   if(c==='P'||c==='Q'){sp[c]={x,y};row[x]='.'}
   if(DEF[c]){f[key(x,y)]=c;row[x]='.'}}));
  G.push(g);INIT.push(f);F.push({...f});SP.push(sp)});
 P={hp:30,max:30,hc:0,sh:0,ah:0,qs:0,lk:0,pot:2,coins:10,jelly:0,sw:0,ar:0,key:0,cd:0,guard:false,opened:{},cl:{}};
 if(!sv)return go(0,'P');
 P={...P,...sv.P,guard:false};
 if(!sv.P.cl){P.cl={};for(let i=0;i<sv.cur;i++)P.cl[i]=1}   // old saves: rooms you already left count as cleared
G=G.map((g,i)=>sv.G[i]?sv.G[i].map(r=>r.split('')):g);F=F.map((f,i)=>sv.F[i]||f);
 fixExits();
 cur=sv.cur;pl={...sv.pl};vis={...pl};
 setMsg('Welcome back, '+user.name+'.');toMap();
}
/* ---------- login / accounts (stored on this device) ---------- */
let user=null;
const LS={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}};
const users=()=>LS.get('tq_users')||{};
function save(){
 if(!user||user.guest||!P||!G)return;
 const all=users(),a=all[user.id];if(!a)return;
 a.save={P:{...P,guard:false},cur,pl,G:G.map(g=>g.map(r=>r.join(''))),F};
 LS.set('tq_users',all);
 if(window.tqCloud)window.tqCloud.save(a.save);
}
function menu(){
 mode='text';view('textView');
 const sv=user.guest?null:(users()[user.id]||{}).save;
 $('textView').innerHTML=`<div class="card"><div style="text-align:center">${hero(sv?sv.P.sw:0,sv?sv.P.ar:0)}</div><h2>Welcome, ${user.name}</h2>
 ${sv?`<p>Saved game: ${MAPS[sv.cur].n}, ${sv.P.coins} coins, sword level ${sv.P.sw}, armor level ${sv.P.ar}${sv.P.key?', key in hand':''}.${sv.P.won?' 🏆 Adventure complete!':''}</p>`:`<p class="muted">${user.guest?"Guest play does not save your progress.":"No saved game yet."}</p>`}
 <div class="list">${sv?'<button class="primary" id="m1">Continue</button>':''}<button id="m2" class="${sv?'':'primary'}">New game</button><button id="m3">Log out</button></div></div>`;
 if(sv)$('m1').onclick=()=>newGame(sv);
 $('m2').onclick=()=>{if(sv&&!confirm('Starting a new game will replace your saved game'+(sv.P.won?' (including your finished adventure)':'')+'. Start over?'))return;title()};
 $('m3').onclick=()=>window.tqLogout&&window.tqLogout();
 (sv?$('m1'):$('m2')).focus();
}
$('quit').onclick=()=>{save();menu()};

function title(){
 showText({big:1,pic:hero(0,0),title:"Tiny Quest",text:"The Slime King has swallowed the Moon Crumb, the little light that keeps Thimble Hollow warm. You are Arlo, the village handyman, and nobody else volunteered.\n\nBuy supplies in the village, hunt slimes in the forest for coins and jelly, upgrade your gear, then find the key in the slime caves. Only the key opens the throne room."},()=>newGame(),"Start the quest");
}
function respawn(){
 const c=P.ck;
 go(c?c.map:0,'P');
 if(c){pl={x:c.x,y:c.y};vis={...pl}}
 setMsg(c?"You are back at your checkpoint 🚩.":"You are back in the village.");
}
function go(i,w){
 cur=i;
 if(MAPS[i].respawn){const n={};for(const k in INIT[i]){const id=INIT[i][k];if(DEF[id].king){if(F[i][k])n[k]=id}else n[k]=id}F[i]=n}

 pl={...(SP[i][w]||SP[i].P)};vis={...pl};held.length=0;setMsg("Entered "+MAPS[i].n+".");toMap();
}

function move(dx,dy){
 if(mode!=='map'||isMoving())return;
 const nx=pl.x+dx,ny=pl.y+dy;
 if(nx<0||ny<0||nx>=COLS||ny>=ROWS)return;
 if(dx){face=dx;vw=2}else vw=dy<0?1:0;
 const c=G[cur][ny][nx],k=key(nx,ny);
 if(F[cur][k])return startBattle(k);
 if(c==='#'||c==='~')return;
 if(c==='H'){P.hp=P.max;P.cd=0;P.ck={map:cur,x:pl.x,y:pl.y,hx:nx,hy:ny};setMsg("You rest at the house. HP restored. 🚩 Checkpoint saved!");return hud()}
 if(c==='S')return shop();
 if(c==='C'||c==='k')return chest(nx,ny,c);
 if(c==='>'){const n=Object.keys(F[cur]).length;if(!exitOpen())return setMsg(`Clear the room first! ${n} slime${n>1?'s':''} left.`);return go(cur+1,'P')}
 if(c==='<')return go(cur-1,'Q');
 if(c==='D'){if(P.key)return go(cur+1,'P');return setMsg("The throne door is locked. Find the key in this cave.")}
 pl={x:nx,y:ny};setMsg("");drawMap();
}
function chest(x,y,c){
 if(c==='k'){
  if(Object.keys(F[cur]).length)return setMsg("Slimes still guard this chest. Defeat them all first.");
  P.key=1;G[cur][y][x]='.';setMsg("You found the Throne Room key! 🗝️");return hud()||drawMap();
 }
 const r=CH[cur+':'+x+','+y]||{c:10};
 const rc=Math.round((r.c||0)*REWARD*LV(cur)),rj=Math.round((r.j||0)*2*(1+.3*cur));
 P.coins+=rc;P.jelly+=rj;P.pot+=r.pot||0;G[cur][y][x]='.';
 setMsg(`Chest opened: +${rc} coins${rj?`, +${rj} jelly`:''}${r.pot?`, +${r.pot} acorn snacks`:''}.`);
 hud();drawMap();
}
const KM={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]},held=[];
addEventListener('keydown',e=>{
 const m=KM[e.key];if(!m||mode!=='map')return;
 e.preventDefault();if(!held.includes(e.key))held.push(e.key);move(...m);
});
addEventListener('keyup',e=>{const i=held.indexOf(e.key);if(i>=0)held.splice(i,1)});
document.querySelectorAll('#pad button').forEach(b=>{
 const k='B'+b.dataset.d;KM[k]=b.dataset.d.split(',').map(Number);
 const off=()=>{const i=held.indexOf(k);if(i>=0)held.splice(i,1)};
 b.onpointerdown=e=>{e.preventDefault();if(!held.includes(k))held.push(k);move(...KM[k])};
 b.onpointerup=b.onpointerleave=b.onpointercancel=off;
});

function shop(msg){
 save();
 mode='text';view('textView');
 const heal=9+4*(P.ah||0);
 const ups=UP.map(u=>{const lv=P[u.id]||0,c=u.tb[lv];return{u,lv,c,ok:!!c&&P.coins>=c[0]&&P.jelly>=c[1]}});
 $('textView').innerHTML=`<div class="card"><h2>Village Shop</h2><p class="muted">💰 ${P.coins} coins · 🟢 ${P.jelly} jelly</p><p>${msg||"Slime jelly makes excellent gear. Bring me some!"}</p><div class="list">
 <button id="b1" ${P.coins>=8&&P.pot<9?'':'disabled'}>🌰 Acorn snack, heals ${heal} (you have ${P.pot}) — 8 coins</button>
 ${ups.map((x,i)=>`<button id="u${i}" ${x.ok?'':'disabled'}>${x.u.l}${x.c?` (Lv ${x.lv}→${x.lv+1}) — ${x.c[0]} coins, ${x.c[1]} jelly`:' — maxed ✔'}</button>`).join('')}
 <button class="primary" id="b4">Leave shop</button></div></div>`;
 $('b1').onclick=()=>{P.coins-=8;P.pot++;shop("One acorn snack, fresh.")};
 ups.forEach((x,i)=>$('u'+i).onclick=()=>{P.coins-=x.c[0];P.jelly-=x.c[1];P[x.u.id]=x.lv+1;if(x.u.fx)x.u.fx();shop(x.u.done)});
 $('b4').onclick=toMap;
}

function drawMap(){
 const m=MAPS[cur];
 ctx.textAlign='center';ctx.textBaseline='middle';
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
  const c=G[cur][y][x];
  ctx.fillStyle=c==='~'?(m.wc||'#4a90c8'):m.c[(x+y)%2];
  ctx.fillRect(x*T,y*T,T,T);
  ctx.font='30px serif';
  const e={'#':m.w,'H':'🏠','S':'🏪','C':'🎁','k':'🧰','>':'➡️','<':'⬅️','D':'🚪'}[c];
  if(e)ctx.fillText(e,x*T+T/2,y*T+T/2+2);
  if(c==='>'||c==='D'){
   const op=c==='D'?P.key:exitOpen();
   if(op){ctx.save();ctx.globalAlpha=.5+.35*Math.sin(performance.now()/260);ctx.strokeStyle='#ffd23f';ctx.lineWidth=3;ctx.strokeRect(x*T+2,y*T+2,T-4,T-4);ctx.restore()}
  }
  if(c==='H'&&P.ck&&P.ck.map===cur&&P.ck.hx===x&&P.ck.hy===y){ctx.font='16px serif';ctx.fillText('🚩',x*T+T-9,y*T+9)}
 }
 const bob=frame%2*2;
 for(const k in F[cur]){
  const [x,y]=k.split(',').map(Number),id=F[cur][k],big=DEF[id].king;
  if(IMG[id].complete)ctx.drawImage(IMG[id],x*T+(big?0:3),y*T+(big?-2:6)+bob,big?T:T-6,big?T:T-12);
 }
 dust.forEach(d=>{ctx.globalAlpha=Math.max(0,d.l)*.55;ctx.fillStyle='#efe9cf';ctx.beginPath();ctx.arc(d.x,d.y-(1-d.l)*8,2+(1-d.l)*4,0,7);ctx.fill()});ctx.globalAlpha=1;
 const mv=isMoving(),hi=heroImg(mv?1+Math.floor(performance.now()/90)%2:0,vw);
 if(hi.complete){ctx.save();ctx.translate(vis.x*T+T/2,0);ctx.scale(face,1);ctx.drawImage(hi,-14,vis.y*T-2+(mv?0:frame%2),28,T+2);ctx.restore()}
}
setInterval(()=>frame++,450);
let last=performance.now();
function loop(t){
 const dt=Math.min(.05,(t-last)/1000);last=t;
 if(G&&pl){const sp=9*dt;['x','y'].forEach(a=>{const d=pl[a]-vis[a];vis[a]=Math.abs(d)<=sp?pl[a]:vis[a]+Math.sign(d)*sp});
  if(mode==='map'){
   if(isMoving()&&Math.random()<.5)dust.push({x:vis.x*T+T/2-(vw===2?face*8:0),y:vis.y*T+T-4,l:1});
   for(let i=dust.length-1;i>=0;i--){dust[i].l-=dt*3;if(dust[i].l<=0)dust.splice(i,1)}
   if(!isMoving()&&held.length)move(...KM[held[held.length-1]]);
   drawMap()}}
 requestAnimationFrame(loop)}
requestAnimationFrame(loop);

/* ---------- battle ---------- */
function startBattle(k){
 curKey=k;const d=DEF[F[cur][k]];
 B={...d,max:d.hp,intent:'n'};rollIntent();
 log=[`A ${B.name} ${B.intro||'wobbles into your path!'}`];
 busy=false;P.guard=false;mode='battle';view('battleView');drawB();
}
const rollIntent=()=>{B.intent=Math.random()<B.heavy?'h':'n'};
const say=t=>{log.push(t);if(log.length>4)log.shift()};
function enableBtns(){
 if(!$('a1'))return;
 $('a1').disabled=$('a2').disabled=false;$('a3').disabled=!P.pot;$('a4').disabled=!!P.cd;
}
function drawB(k='',n=''){
 const pw=P.sw?` (+${P.sw*2})`:"",col=['#ffffff','#e3edf7','#f2c94c','#6fe3ff','#ff6bd6','#fff6a8'][P.sw];
 const arc=(c,f)=>`<svg class="fx slash ${f?'s2':''}" viewBox="0 0 100 100"><path d="${f?'M88 80 Q52 10 10 24':'M12 82 Q48 8 92 22'}" stroke="${c}" stroke-width="9" fill="none" stroke-linecap="round" pathLength="1"/></svg>`;
 const ring=c=>`<i class="fx ring" style="border-color:${c}"></i>`;
 let pc=P.guard&&k!=='eblock'?' guarded':'',ec='',po='',eo='',pn='',en='',cc='';
 const num=(c,t)=>`<span class="dmg ${c}">${t}</span>`;
 if(k==='slash'){pc+=' a-slash';ec=' hitfx';eo=arc(col);en=num('','-'+n)}
 if(k==='power'){pc+=' a-power';ec=' hitbig';eo=arc(col)+arc(col,1)+ring(col);en=num('big','-'+n);cc=' shk'}
 if(k==='guard'){pc+=' a-guard';po='<span class="fx shield">🛡️</span>'}
 if(k==='heal'){pc+=' a-heal';po='<span class="fx sp s1">✚</span><span class="fx sp s2">✚</span><span class="fx sp s3">✚</span>';pn=num('heal','+'+n)}
 if(k==='eatk'){ec=' e-hop';pc+=' hitfx';po=arc('#ff6b5a');pn=num('','-'+n)}
 if(k==='eheavy'){ec=' e-slam';pc+=' hitbig';po=arc('#ff6b5a')+ring('#ff6b5a');pn=num('big','-'+n);cc=' shk'}
 if(k==='eblock'){ec=' e-hop';po='<span class="fx spark">✦</span>';pn=num('blk','Blocked! -'+n)}
 if(k==='edie')ec=' edie';
 if(k==='pdie')pc+=' pdie';
 $('battleView').innerHTML=`<div class="card bt${cc}"><div class="arena">
  <div class="fighter"><div class="sprite${pc}">${hero(P.sw,P.ar)}${po}</div>${pn}<b>Arlo</b><div class="bar"><i style="width:${P.hp/P.max*100}%"></i></div><div class="muted">${P.hp} / ${P.max} HP</div></div>
  <div class="fighter"><div class="sprite${ec}">${svg(B)}${eo}</div>${en}<b>${B.name}</b><div class="bar foe"><i style="width:${B.hp/B.max*100}%"></i></div><div class="muted">${B.hp} / ${B.max} HP</div></div></div>
  <div class="intent">${B.hp>0?(B.intent==='h'?"⚠ It is winding up a big hit. Guard!":"It jiggles menacingly."):""}</div>
  <div class="actions">
   <button id="a1" ${busy?'disabled':''}>⚔ Sword slash${pw}</button>
   <button id="a2" ${busy?'disabled':''}>🛡 Guard</button>
   <button id="a3" ${busy||!P.pot?'disabled':''}>🌰 Acorn snack (${P.pot})</button>
   <button id="a4" ${busy||P.cd?'disabled':''}>💥 Power strike${P.cd?` (${P.cd})`:''}</button></div>
  <div class="log">${log.map(l=>`<div>${l}</div>`).join("")}</div></div>`;
 ['atk','grd','heal','pow'].forEach((q,i)=>$('a'+(i+1)).onclick=()=>act(q));
}
function act(k){
 if(busy)return;busy=true;let kind,n=0;
 if(P.cd>0&&k!=='pow')P.cd--;
 if(k==='atk'){n=R(4,7)+P.sw*2;B.hp-=n;say(`Arlo slashes for ${n} damage.`);kind='slash'}
 if(k==='grd'){P.guard=true;say("Arlo raises his sword and braces.");kind='guard'}
 if(k==='heal'){P.pot--;n=Math.min(9+4*(P.ah||0),P.max-P.hp);P.hp+=n;say(`Arlo eats an acorn snack and heals ${n}.`);kind='heal'}
 if(k==='pow'){n=R(9,12)+P.sw*2;B.hp-=n;P.cd=3-(P.qs||0);say(`POWER STRIKE! ${n} damage.`);kind='power'}
 if(B.hp<=0){B.hp=0;say(`${B.name} splats into goo!`);drawB(kind,n);return setTimeout(()=>{drawB('edie');setTimeout(win,750)},700)}
 drawB(kind,n);setTimeout(foeTurn,kind==='power'?1000:800);
}
function foeTurn(){
 const heavy=B.intent==='h';
 let d=R(B.atk[0],B.atk[1]);if(heavy)d=Math.round(d*1.7);
 d=Math.max(1,d-P.ar);
 let kind=heavy?'eheavy':'eatk',m=`${B.name} ${heavy?'body-slams':'bounces into'} Arlo for ${d}.`;
 if(P.guard){d=Math.max(1,Math.round(d*GUARD[P.sh||0]));m=`${B.name} attacks, but Arlo blocks most of it. ${d} damage.`;P.guard=false;kind='eblock'}
 P.hp=Math.max(0,P.hp-d);say(m);
 if(P.hp<=0){drawB(kind,d);return setTimeout(()=>{drawB('pdie');setTimeout(lose,800)},750)}
 rollIntent();drawB(kind,d);
 setTimeout(()=>{busy=false;enableBtns()},heavy?900:650);
}
function win(){
 const id=F[cur][curKey];delete F[cur][curKey];
 const clr=!Object.keys(F[cur]).length;if(clr){P.cl=P.cl||{};P.cl[cur]=1}
 const br=BR[id];if(br){P.coins+=br[0];P.jelly+=br[1]}
 const bc=clr&&cur>0?Math.round(30*LV(cur)):0,bj=clr&&cur>0?1+Math.floor(cur/2):0;   // room-clear bonus
 P.coins+=bc;P.jelly+=bj;
 const bonus=bc?` Room bonus: +${bc} coins, +${bj} jelly.`:'';
 if(id==='K')return showText({title:"The Slime King falls!",text:"The Slime King drops his crown, hiccups, and admits he was only guarding the Moon Crumb for someone colder.\n\nWith a crack, the east wall of the throne room splits open. A freezing wind pours in from the Frostbite Peak."},()=>{setMsg("A new exit has opened on the east wall. Boss reward: +"+BR.K[0]+" coins, +"+BR.K[1]+" jelly!"+bonus);toMap()},"Climb the peak");
 if(id==='B')return showText({title:"The Frost Titan falls!",text:"The Frost Titan cracks, hiccups, and mutters that it only froze the Moon Crumb's light to keep it safe from something hungrier.\n\nWith a hiss of steam, the east ice wall melts away. Far beyond the Ember Caverns and the Murk Marsh, a dark moon hangs over the Moon Spire."},()=>{setMsg("The east exit is open. Boss reward: +"+BR.B[0]+" coins, +"+BR.B[1]+" jelly!"+bonus);toMap()},"Keep climbing");
 if(id==='M'){P.won=1;save();return ending()}
 const d=DEF[id],c=Math.round(R(d.c[0],d.c[1])*REWARD*LV(cur)*(1+.25*(P.lk||0))),j=Math.round((Math.random()<Math.min(1,d.j+.3)?R(1,2):0)*(1+.3*cur));
 P.coins+=c;P.jelly+=j;
 showText({title:"Slime defeated!",text:`You collect ${c} coins${j?` and ${j} slime jelly`:''}.${cur===2&&!Object.keys(F[2]).length?"\n\nThe cave falls quiet. Nothing guards the chest at the far end now.":""}${bc?`\n\nRoom clear bonus: +${bc} coins, +${bj} jelly!`:''}${clr&&cur<MAPS.length-1&&cur!==2?"\n\nThe room is clear. The exit is open!":""}`},toMap);
}
function ending(){
 const boss=`<div class="sprite" style="justify-content:center">${svg(DEF.M)}</div>`;
 const you=hero(P.sw,P.ar);
 const party='<div style="text-align:center;font-size:1.7rem;letter-spacing:.2em">🎉✨🌙✨🎉</div>';
 const pages=[
  {pic:boss,title:"The eclipse breaks",text:"The Last King Slime wobbles, hiccups, and slumps to the floor. The dark moon above the Moon Spire cracks like an egg.\n\nA warm light pours through the crack. The Moon Crumb tumbles out and rolls across the spire floor, glowing brighter than ever."},
  {pic:you,title:"The Moon Crumb",text:"You pick it up. It is warm, and it smells faintly of toast.\n\nOne by one, the slimes of the spire stop fighting. Fire, mud, and frost slimes bob in a circle around you, almost as if they were saying thank you."},
  {title:"The long way home",text:"You walk back through the Murk Marsh, the Ember Caverns, and down Frostbite Peak. The ice melts behind you. In the throne room, the Slime King waves, wearing his crown a little crooked.\n\nThe forest has never been so quiet, or so green."},
  {pic:you,title:"Home at last",text:"In Thimble Hollow, you set the Moon Crumb back above the village. The night sky glows silver, and the whole village cheers.\n\nArlo the handyman is now Arlo the Slime Slayer, though he mostly still fixes fences."},
  {big:1,pic:party+you,title:"THE END",text:`Congratulations, ${user.name}! You defeated the Last King Slime and saved the Moon Crumb.\n\n💰 ${P.coins} coins · 🟢 ${P.jelly} jelly · ⚔ Sword Lv ${P.sw} · 🛡 Armor Lv ${P.ar} · ❤ ${P.max} max HP\n\nYour progress is saved. Choose Continue on the menu to keep exploring!\n\nThanks for playing Tiny Quest!`}
 ];
 const done=()=>{save();menu()};   // progress is kept: Continue resumes in the Moon Spire
 let i=0;
 const show=()=>{const last=i===pages.length-1;showText(pages[i],last?done:()=>{i++;show()},last?"Back to menu":"Next ▶")};
 show();
}
function lose(){
 showText({title:"Arlo needs a nap",text:"Everything goes wobbly and green. You wake up at your last checkpoint with your HP restored. Your coins are safe, and the slimes are still out there."},()=>{P.hp=P.max;P.cd=0;respawn()},"Get back up");
}
/* Called by auth-guard.js once Firebase confirms who is logged in */
window.startTinyQuest=(name,uid,cloudSave)=>{
 const all=users(),a=all[uid]||{name,save:null};
 a.name=name;
 if(cloudSave!==undefined)a.save=cloudSave;   // cloud copy wins (null = none)
 all[uid]=a;LS.set('tq_users',all);
 const boot=$('boot');if(boot)boot.remove();
 const note=document.querySelector('#mapView .muted');if(note&&!note.dataset.b){note.dataset.b=1;note.textContent+=' (build '+BUILD+')'}
 user={name,id:uid,guest:0};menu();
};
