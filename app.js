// Full-featured SpinIt logic: tasks, labels & filters, calendar, notes, timer, charts
// Updated: added hamburger mobile sidebar toggle, custom timer minutes input, minor mobile tweaks

// ---- Utilities ----
const qs = s => document.querySelector(s)
const qsa = s => Array.from(document.querySelectorAll(s))
const todayISO = () => new Date().toISOString().slice(0,10)

function save(key, val){ localStorage.setItem(key, JSON.stringify(val)) }
function load(key, fallback){ try { return JSON.parse(localStorage.getItem(key))||fallback } catch(e){ return fallback } }
function uid(){ return Math.random().toString(36).slice(2,9) }

// ---- App state ----
let tasks = load('spinit_tasks', []) // {id, title, date, label, priority, done, created}
let notes = load('spinit_notes', []) // {id,title,content,tags,created}
let sessions = load('spinit_sessions', {}) // minutes per day map {YYYY-MM-DD: minutes}
let stats = load('spinit_stats', {sessions:0, minutes:0, streak:0})

// ---- Mobile hamburger (sidebar toggle) ----
const hamburger = qs('#hamburger')
const sidebar = qs('#sidebar')
const overlay = qs('#sidebarOverlay')

function openSidebar(){
  sidebar.classList.add('open')
  overlay.classList.add('visible')
  overlay.setAttribute('aria-hidden','false')
}
function closeSidebar(){
  sidebar.classList.remove('open')
  overlay.classList.remove('visible')
  overlay.setAttribute('aria-hidden','true')
}
hamburger?.addEventListener('click', ()=> {
  if(sidebar.classList.contains('open')) closeSidebar(); else openSidebar()
})
overlay?.addEventListener('click', closeSidebar)

// Close sidebar when switching to a panel on small screens
qsa('.nav-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> {
    if(window.innerWidth <= 980) closeSidebar()
  })
})

// ---- Sidebar navigation ----
qsa('.nav-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    qsa('.nav-btn').forEach(b=>b.classList.remove('active'))
    btn.classList.add('active')
    const target = btn.dataset.panel
    qsa('.panel').forEach(p=>p.style.display = p.id === target ? 'flex' : 'none')
    if(target === 'calendar') renderCalendar()
    if(target === 'analytics') refreshCharts()
    applySearch() // update search context when switching
  })
})

// search box (tasks & notes)
qs('#searchInput').addEventListener('input', applySearch)
function applySearch(){
  const q = qs('#searchInput').value.trim().toLowerCase()
  // filter lists by search
  renderInbox(q)
  renderTodo(q)
  renderNotes(q)
}

// ---- Task creation & rendering ----
function addTask(obj){
  obj.id = uid(); obj.created = new Date().toISOString()
  tasks.unshift(obj); save('spinit_tasks', tasks)
  renderAll()
}
function updateTask(id, patch){
  tasks = tasks.map(t => t.id===id ? {...t,...patch} : t); save('spinit_tasks',tasks); renderAll()
}
function deleteTask(id){
  tasks = tasks.filter(t=>t.id!==id); save('spinit_tasks',tasks); renderAll()
}

qs('#addInboxBtn').addEventListener('click', ()=>{
  const t = qs('#inboxTitle').value.trim(); const d = qs('#inboxDate').value; const label = qs('#inboxLabel').value; const priority = qs('#inboxPriority').value||'normal'
  if(!t) return
  addTask({title:t, date:d||null, label: label||'', priority, done:false})
  qs('#inboxTitle').value=''; qs('#inboxDate').value=''; qs('#inboxLabel').value=''
})

qs('#addTodoBtn').addEventListener('click', ()=>{
  const t = qs('#todoTitle').value.trim(); const label = qs('#todoLabel').value; const priority = qs('#todoPriority').value||'normal'
  if(!t) return
  addTask({title:t, date:null, label: label||'', priority, done:false})
  qs('#todoTitle').value=''; qs('#todoLabel').value=''; renderAll()
})

// inbox render with filters & search
function renderInbox(search=''){
  const labelFilter = qs('#filterLabel').value
  const priorityFilter = qs('#filterPriority').value
  const showCompleted = qs('#showCompleted').checked
  const list = qs('#inboxList'); list.innerHTML = ''
  const filtered = tasks.filter(t=>{
    if(!showCompleted && t.done) return false
    if(labelFilter && t.label!==labelFilter) return false
    if(priorityFilter && t.priority!==priorityFilter) return false
    if(search && !((t.title||'').toLowerCase().includes(search) || (t.label||'').toLowerCase().includes(search))) return false
    return true
  })
  filtered.forEach(t=>{
    const li = document.createElement('li'); li.className='task'
    const left = document.createElement('div'); left.className='task-left'
    const tick = document.createElement('input'); tick.type='checkbox'; tick.checked = !!t.done
    tick.addEventListener('change', ()=> updateTask(t.id, {done: tick.checked}))
    left.appendChild(tick)
    const meta = document.createElement('div')
    const title = document.createElement('div'); title.className='task-title'; title.textContent = t.title
    if(t.done) title.style.textDecoration = 'line-through'; if(t.label) { const lab = document.createElement('div'); lab.className='task-meta'; lab.textContent = `${t.label} • ${t.priority}`; meta.appendChild(lab) }
    meta.appendChild(title); left.appendChild(meta)
    li.appendChild(left)

    const actions = document.createElement('div'); actions.className='task-actions'
    const dateSpan = document.createElement('div'); dateSpan.className='task-meta'; dateSpan.textContent = t.date || ''
    const del = document.createElement('button'); del.className='btn'; del.textContent='Delete'; del.addEventListener('click', ()=> deleteTask(t.id))
    actions.appendChild(dateSpan); actions.appendChild(del)
    li.appendChild(actions)
    list.appendChild(li)
  })
}

// today & upcoming
function loadTodayUpcoming(){
  const today = todayISO()
  const todayList = qs('#todayList'); const upcomingList = qs('#upcomingList'); todayList.innerHTML=''; upcomingList.innerHTML=''
  tasks.forEach(t=>{
    if(t.date===today) {
      const li=document.createElement('li'); li.className='task'; li.innerHTML=`<div class="task-left"><input type="checkbox" ${t.done?'checked':''} /><div><div class="task-title">${t.title}</div><div class="task-meta">${t.label} • ${t.priority}</div></div></div><div class="task-actions"><button class="btn" data-id="${t.id}">Delete</button></div>`
      const cb = li.querySelector('input'); cb.addEventListener('change', ()=> updateTask(t.id,{done:cb.checked}))
      li.querySelector('button').addEventListener('click', ()=> deleteTask(t.id))
      todayList.appendChild(li)
    } else if(t.date && t.date > today) {
      const li=document.createElement('li'); li.className='task'; li.innerHTML=`<div class="task-left"><div><div class="task-title">${t.title}</div><div class="task-meta">${t.date} • ${t.label}</div></div></div><div class="task-actions"><button class="btn" data-id="${t.id}">Delete</button></div>`
      li.querySelector('button').addEventListener('click', ()=> deleteTask(t.id))
      upcomingList.appendChild(li)
    }
  })
}

// todo list render (no date)
function renderTodo(search=''){
  const list = qs('#todoList'); list.innerHTML=''
  const filtered = tasks.filter(t=>!t.date)
  .filter(t => search ? (t.title||'').toLowerCase().includes(search) || (t.label||'').toLowerCase().includes(search) : true)
  filtered.forEach(t=>{
    const li = document.createElement('li'); li.className='task'
    const left = document.createElement('div'); left.className='task-left'
    const tick = document.createElement('input'); tick.type='checkbox'; tick.checked = !!t.done
    tick.addEventListener('change', ()=> updateTask(t.id, {done: tick.checked}))
    left.appendChild(tick)
    const title = document.createElement('div'); title.className='task-title'; title.textContent = t.title
    if(t.done) title.style.textDecoration='line-through'
    left.appendChild(title)
    const meta = document.createElement('div'); meta.className='task-meta'; meta.textContent = `${t.label} • ${t.priority}`
    left.appendChild(meta)
    li.appendChild(left)

    const actions = document.createElement('div'); actions.className='task-actions'
    const del = document.createElement('button'); del.className='btn'; del.textContent='Delete'; del.addEventListener('click', ()=> deleteTask(t.id))
    actions.appendChild(del)
    li.appendChild(actions)
    list.appendChild(li)
  })
}

// ---- Calendar UI ----
let calendarRef = new Date()
const monthLabel = qs('#monthLabel'), calendarGrid = qs('#calendarGrid'), dayPanel = qs('#dayPanel'), dayPanelLabel = qs('#dayPanelLabel'), dayTaskList = qs('#dayTaskList')
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1) }
function renderCalendar(){
  calendarGrid.innerHTML = ''
  const start = startOfMonth(calendarRef)
  monthLabel.textContent = start.toLocaleString(undefined, {month:'long', year:'numeric'})
  const firstWeekday = start.getDay() // 0..6
  const daysInMonth = new Date(start.getFullYear(), start.getMonth()+1, 0).getDate()
  // previous month placeholders
  for(let i=0;i<firstWeekday;i++){ const cell=document.createElement('div'); cell.className='calendar-cell empty'; calendarGrid.appendChild(cell) }
  for(let day=1; day<=daysInMonth; day++){
    const dateStr = new Date(start.getFullYear(), start.getMonth(), day).toISOString().slice(0,10)
    const cell = document.createElement('div'); cell.className='calendar-cell'
    const num = document.createElement('div'); num.className='date-num'; num.textContent = day
    cell.appendChild(num)
    // add task badges
    const dayTasks = tasks.filter(t=>t.date===dateStr)
    if(dayTasks.length){
      const badge = document.createElement('div'); badge.className='badge'; badge.textContent = `${dayTasks.length} task${dayTasks.length>1?'s':''}`; cell.appendChild(badge)
    }
    cell.addEventListener('click', ()=>{
      showDayPanel(dateStr)
    })
    calendarGrid.appendChild(cell)
  }
  showDayPanel(todayISO())
}
qs('#prevMonth').addEventListener('click', ()=>{ calendarRef.setMonth(calendarRef.getMonth()-1); renderCalendar() })
qs('#nextMonth').addEventListener('click', ()=>{ calendarRef.setMonth(calendarRef.getMonth()+1); renderCalendar() })

function showDayPanel(dateStr){
  dayPanel.style.display = 'block'
  dayPanelLabel.textContent = new Date(dateStr).toDateString()
  renderDayTasks(dateStr)
  qs('#addDayTask').onclick = ()=> {
    const title = qs('#dayTaskTitle').value.trim()
    if(!title) return
    addTask({title, date: dateStr, label:'', priority:'normal', done:false})
    qs('#dayTaskTitle').value = ''
    renderDayTasks(dateStr)
  }
}
function renderDayTasks(dateStr){
  dayTaskList.innerHTML = ''
  const dayTasks = tasks.filter(t=>t.date===dateStr)
  dayTasks.forEach(t=>{
    const li = document.createElement('li'); li.className='task'
    const left = document.createElement('div'); left.className='task-left'
    const tick = document.createElement('input'); tick.type='checkbox'; tick.checked = !!t.done; tick.addEventListener('change', ()=> updateTask(t.id,{done:tick.checked}))
    left.appendChild(tick)
    const title = document.createElement('div'); title.className='task-title'; title.textContent = t.title; if(t.done) title.style.textDecoration='line-through'
    left.appendChild(title)
    li.appendChild(left)
    const actions = document.createElement('div'); actions.className='task-actions'
    const del = document.createElement('button'); del.className='btn'; del.textContent='Delete'; del.addEventListener('click', ()=> deleteTask(t.id))
    actions.appendChild(del); li.appendChild(actions)
    dayTaskList.appendChild(li)
  })
}

// ---- Notes ----
function renderNotes(search=''){
  const list = qs('#notesList'); list.innerHTML=''
  const filtered = notes.filter(n => search ? (n.title||'').toLowerCase().includes(search) || (n.content||'').toLowerCase().includes(search) : true)
  filtered.forEach(n=>{
    const li = document.createElement('li'); li.className='note-card'
    const header = document.createElement('div'); header.style.display='flex'; header.style.justifyContent='space-between'
    const title = document.createElement('div'); title.textContent = n.title || '(no title)'; title.style.fontWeight='800'
    const del = document.createElement('button'); del.className='btn'; del.textContent='Delete'; del.addEventListener('click', ()=> { notes = notes.filter(x=>x.id!==n.id); save('spinit_notes', notes); renderNotes(qs('#noteSearch')?.value||'') })
    header.appendChild(title); header.appendChild(del)
    const content = document.createElement('div'); content.textContent = n.content; content.className='task-meta'
    const tags = document.createElement('div'); tags.className='task-meta'; tags.textContent = n.tags ? 'Tags: ' + n.tags.join(', ') : ''
    li.appendChild(header); li.appendChild(content); li.appendChild(tags)
    list.appendChild(li)
  })
}
qs('#saveNoteBtn').addEventListener('click', ()=>{
  const title = qs('#noteTitle').value.trim(); const content = qs('#noteContent').value.trim(); const tags = qs('#noteTags').value.split(',').map(s=>s.trim()).filter(Boolean)
  if(!content && !title) return
  notes.unshift({id:uid(), title, content, tags, created: new Date().toISOString()}); save('spinit_notes',notes)
  qs('#noteTitle').value=''; qs('#noteContent').value=''; qs('#noteTags').value=''; renderNotes()
})
qs('#noteSearch')?.addEventListener('input', ()=> renderNotes(qs('#noteSearch').value.trim().toLowerCase()))

// ---- Timer & sessions tracking (custom minutes support) ----
let timerRemaining = 25*60, timerInterval = null
const timeDisplay = qs('#timeDisplay'), sessionLabelEl = qs('#sessionLabel')
const customMinutesInput = qs('#customMinutes')

function fmt(s){const m=Math.floor(s/60); const sec=s%60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`}
function updateTimerUI(){ timeDisplay.textContent = fmt(timerRemaining) }

function getCustomMinutes(){
  const v = parseInt(customMinutesInput?.value, 10)
  if(!v || isNaN(v) || v < 1) return 25
  return Math.min(480, v)
}

qs('#startBtn').addEventListener('click', ()=> {
  if(timerInterval) return
  // set remaining if timer not started or at initial value
  if(timerRemaining <= 0 || timerRemaining === 25*60) {
    const mins = getCustomMinutes()
    // if timerRemaining is different from desired minutes, set it (so pressing start uses input)
    if(timerRemaining !== mins*60) timerRemaining = mins*60
    updateTimerUI()
  }
  timerInterval = setInterval(()=> {
    timerRemaining--; updateTimerUI()
    if(timerRemaining<=0){
      clearInterval(timerInterval); timerInterval=null
      // add custom minutes to today's sessions
      const minutesCompleted = getCustomMinutes()
      const day = todayISO(); sessions[day] = (sessions[day]||0) + minutesCompleted; save('spinit_sessions', sessions)
      stats.sessions = (stats.sessions||0)+1; stats.minutes = (stats.minutes||0)+minutesCompleted; save('spinit_stats',stats); updateStatsUI(); refreshCharts()
      // reset timerRemaining to default input minutes
      timerRemaining = getCustomMinutes()*60; updateTimerUI()
    }
  },1000)
})
qs('#pauseBtn').addEventListener('click', ()=> { clearInterval(timerInterval); timerInterval=null })
qs('#resetBtn').addEventListener('click', ()=> { clearInterval(timerInterval); timerInterval=null; timerRemaining = getCustomMinutes()*60; updateTimerUI() })
updateTimerUI()

function updateStatsUI(){
  qs('#statSessions').textContent = stats.sessions||0
  qs('#statMinutes').textContent = stats.minutes||0
  qs('#statStreak').textContent = stats.streak||0
}
updateStatsUI()

// ---- Charts ----
const pieCtx = qs('#pieChart').getContext('2d')
const barCtx = qs('#barChart').getContext('2d')
let pieChart = new Chart(pieCtx, {
  type:'pie',
  data:{ labels:['Completed','Pending'], datasets:[{ data:[0,0], backgroundColor:[ '#7c5cff','#00c2a8'] }]},
  options:{responsive:true, maintainAspectRatio:false}
})
let barChart = new Chart(barCtx, {
  type:'bar',
  data:{ labels:[], datasets:[{ label:'Focus minutes', data:[], backgroundColor:'#7c5cff' }]},
  options:{responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true}}}
})

function refreshCharts(){
  // pie: completed vs pending
  const completed = tasks.filter(t=>t.done).length
  const pending = tasks.length - completed
  pieChart.data.datasets[0].data = [completed, Math.max(0,pending)]
  pieChart.update()

  // bar: last 7 days minutes
  const last7 = []; const labels = []
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i); const k = d.toISOString().slice(0,10)
    labels.push(k.slice(5)) // MM-DD
    last7.push(sessions[k]||0)
  }
  barChart.data.labels = labels
  barChart.data.datasets[0].data = last7
  barChart.update()
}

// ---- render all & helpers ----
function renderAll(){
  renderInbox(qs('#searchInput').value.trim().toLowerCase())
  renderTodo(qs('#searchInput').value.trim().toLowerCase())
  loadTodayUpcoming()
  renderNotes(qs('#noteSearch')?.value?.trim().toLowerCase()||'')
  renderCalendar()
  refreshCharts()
  updateStatsUI()
}

// filters change bindings
qs('#filterLabel')?.addEventListener('change', ()=> renderInbox(qs('#searchInput').value.trim().toLowerCase()))
qs('#filterPriority')?.addEventListener('change', ()=> renderInbox(qs('#searchInput').value.trim().toLowerCase()))
qs('#showCompleted')?.addEventListener('change', ()=> renderInbox(qs('#searchInput').value.trim().toLowerCase()))

// initial render
renderAll()

// expose for quick debugging
window.SpinIt = { addTask, tasks, notes, renderAll }

