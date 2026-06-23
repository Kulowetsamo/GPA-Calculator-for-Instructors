// ── pending save (grades entered before a profile exists) ─────
let _pendingSave = null;

function flushPendingSave(){
  if(!_pendingSave || !activeProfileId) return;
  const {key, dept, snap} = _pendingSave;
  _pendingSave = null;
  if(snap && snap.length) semData[dept+'|'+key] = snap;
  activeDept = dept;
  document.getElementById('deptSel').value = dept;
  activeKey = key;
  const [year, sem] = key.split('|');
  document.getElementById('yearSel').value = year;
  document.getElementById('semSel').value  = sem;
  loadCourses();
  saveSemester();
  showScreen('calc');
}

// ── calculation helpers ───────────────────────────────────────
function recalculate(){
  let pts=0,cr=0;
  document.querySelectorAll('.course-row').forEach((row,i)=>{
    if(row.dataset.zeroCr==='1') return;
    const c=parseInt(row.dataset.credits)||0;
    const g=row.querySelector('.grade-select').value;
    if(g==='SKIP') return;
    pts+=(GRADE_POINTS[g]??0.0)*c; cr+=c;
  });
  document.getElementById('semGpa').textContent    = cr>0?(pts/cr).toFixed(2):'—';
  document.getElementById('semCredits').textContent = cr>0?cr+' credits':'';
}

function saveSemester(){
  if(!activeProfileId){
    const snap=[];
    document.querySelectorAll('.course-row').forEach(row=>{
      const gradeEl=row.querySelector('.grade-select');
      const credEl =row.querySelector('.spin-val');
      const isElect=row.classList.contains('elective');
      snap.push({grade:gradeEl?gradeEl.value:'',credits:isElect?parseInt(credEl.textContent):parseInt(row.dataset.credits),elective:isElect});
    });
    _pendingSave={key:activeKey,dept:activeDept,snap};
    showToast('Create or load a profile first!');
    showScreen('profiles');
    return;
  }
  persist(activeKey);
  const _courseEntries=[];
  document.querySelectorAll('.course-row').forEach(row=>{
    if(row.dataset.zeroCr==='1') return;
    const c=parseInt(row.dataset.credits)||0;
    const g=row.querySelector('.grade-select').value;
    if(g==='SKIP') return;
    const nameEl=row.querySelector('.course-name span, .course-name');
    const name=(nameEl?.firstChild?.textContent||nameEl?.textContent||'').trim();
    _courseEntries.push({name,credits:c,grade:g,isRetake:row.dataset.retake==='1'});
  });
  const _dedupMap=new Map();
  _courseEntries.forEach(e=>{ if(e.name) _dedupMap.set(e.name,e); else _dedupMap.set(Math.random()+'',e); });
  let pts=0,cr=0;
  _dedupMap.forEach(({credits,grade})=>{
    pts+=(GRADE_POINTS[grade]??0.0)*credits; cr+=credits;
  });
  if(cr===0) return;
  semHistory[activeKey]={gpa:pts/cr,credits:cr};
  persistToProfile(); updateHistoryStrip(); updateCumulative();
  showToast('Semester saved ✓');
}