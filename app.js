// app.js

// Sidebar Navigation
const navBtns = document.querySelectorAll('.nav-btn');
const panels = document.querySelectorAll('.panel');
navBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    navBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.panel;
    panels.forEach(p=>p.style.display=(p.id===target)?'flex':'none');
  });
});

// --- Inbox Tasks ---
const inboxInput = document.getElementById('inboxTask');
const inboxDate = document.getElementById('inboxDate');
const inboxList = document.getElementById('inboxList');
const addInboxTask = document.getElementById('addInboxTask');
function loadInbox(){
  const tasks = JSON.parse(localStorage.getItem('spinit_inbox')||'[]');
  inboxList.innerHTML='';
  tasks.forEach((t,i)=>{
    const li = document.createElement('li'); li.textContent = `${t.title} ${t.date? ' - ' + t.date : ''}`; inboxList.appendChild(li);
  });
}
addInboxTask.addEventListener('click', ()=>{
  if(!inboxInput.value.trim()) return;
  const tasks = JSON.parse(localStorage.getItem('spinit_inbox')||'[]');
  tasks.unshift({title:inboxInput.value.trim(), date: inboxDate.value});
  localStorage.setItem('spinit_inbox',JSON.stringify(tasks));
  inboxInput.value=''; inboxDate.value=''; loadInbox(); loadTodayUpcoming();
});
function loadTodayUpcoming(){
  const tasks = JSON.parse(localStorage.getItem('spinit_inbox')||'[]');
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('todayList').innerHTML='';
  document.getElementById('upcomingList').innerHTML='';
  tasks.forEach(t=>{
    if(t.date===today) document.getElementById('todayList').innerHTML += `<li>${t.title}</li>`;
    else if(t.date && t.date>today) document.getElementById('upcomingList').innerHTML += `<li>${t.title} - ${t.date}</li>`;
  });
}
loadInbox(); loadTodayUpcoming();

// --- To-Do List ---
const todoText = document.getElementById('todoText');
const todoList = document.getElementById('todoList');
const addTodo = document.getElementById('addTodo');
function loadTodo(){ const tasks = JSON.parse(localStorage.getItem('spinit_todo')||'[]'); todoList.innerHTML=''; tasks.forEach(t=>{const li=document.createElement('li'); li.textContent=t.title; todoList.appendChild(li); });}
addTodo.addEventListener('click', ()=>{ if(!todoText.value.trim()) return; const tasks = JSON.parse(localStorage.getItem('spinit_todo')||'[]'); tasks.unshift({title:todoText.value}); localStorage.setItem('spinit_todo',JSON.stringify(tasks)); todoText.value=''; loadTodo();});
loadTodo();

// --- Notes ---
const noteText = document.getElementById('noteText');
const saveNoteBtn = document.getElementById('saveNote');
const notesList = document.getElementById('notesList');
function loadNotes(){ const notes = JSON.parse(localStorage.getItem('spinit_notes')||'[]'); notesList.innerHTML=''; notes.forEach(n=>{const li=document.createElement('li'); li.textContent=n; notesList.appendChild(li);});}
saveNoteBtn.addEventListener('click', ()=>{ if(!noteText.value.trim()) return; const notes = JSON.parse(localStorage.getItem('spinit_notes')||'[]'); notes.unshift(noteText.value.trim()); localStorage.setItem('spinit_notes',JSON.stringify(notes)); noteText.value=''; loadNotes();});
loadNotes();

// --- Timer ---
let remaining = 25*60; let interval=null;
const timeEl = document.getElementById('time');
const sessionLabel = document.getElementById('sessionLabel');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
function formatTime(s){const m=Math.floor(s/60); const sec = s%60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}
function updateTime(){ timeEl.textContent = formatTime(remaining);}
function tick(){ if(remaining<=0){ clearInterval(interval); interval=null; return; } remaining--; updateTime();}
startBtn.addEventListener('click', ()=>{if(interval) return; interval=setInterval(tick,1000);});
pauseBtn.addEventListener('click', ()=>{clearInterval(interval); interval=null;});
resetBtn.addEventListener('click', ()=>{clearInterval(interval); interval=null; remaining=25*60; updateTime();});
updateTime();

// --- Analytics Charts ---
const pieCtx = document.getElementById('pieChart').getContext('2d');
const barCtx = document.getElementById('barChart').getContext('2d');
let pieChart = new Chart(pieCtx,{type:'pie', data:{labels:['Inbox Tasks','To-Do Tasks'], datasets:[{data:[inboxList.children.length,todoList.children.length], backgroundColor:['#7c5cff','#00c2a8']}]}, options:{responsive:true}});
let barChart = new Chart(barCtx,{type:'bar', data:{labels:['Today','Week','Month','Year'], datasets:[{label:'Focus Minutes',data:[25,175,750,9000], backgroundColor:'#7c5cff'}]}, options:{responsive:true}});
function refreshCharts(){ pieChart.data.datasets[0].data=[inboxList.children.length,todoList.children.length]; pieChart.update(); }
setInterval(refreshCharts,1000);

