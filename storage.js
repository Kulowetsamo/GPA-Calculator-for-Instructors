// ── storage ───────────────────────────────────────────────────
function getAllProfiles(){ try{ return JSON.parse(localStorage.getItem('gpa_profiles'))||{}; }catch(e){ return {}; } }
function saveAllProfiles(p){ localStorage.setItem('gpa_profiles',JSON.stringify(p)); }
function getActiveProfileId(){ return localStorage.getItem('gpa_activeProfile')||null; }
function setActiveProfileId(id){ localStorage.setItem('gpa_activeProfile',id); }

let activeKey='Year 1|Fall';
let semData={}, semHistory={};
let activeProfileId=null, deleteTargetId=null, deleteTargetName=null, deletedProfile=null;

function updateDeptSelectState() {
    const deptSel = document.getElementById('deptSel');
    if (!deptSel) return;
    const hasActiveProfile = (activeProfileId !== null);
    deptSel.disabled = hasActiveProfile;
}

function loadActiveProfile(){
  activeProfileId=getActiveProfileId();
  const profiles=getAllProfiles();
  if(activeProfileId&&profiles[activeProfileId]){
    semData    = profiles[activeProfileId].semData    ||{};
    semHistory = profiles[activeProfileId].semHistory ||{};
    activeDept = profiles[activeProfileId].dept       ||'CNGB';
    document.getElementById('deptSel').value=activeDept;
    document.getElementById('activeProfileName').textContent    =profiles[activeProfileId].name;
    document.getElementById('activeProfileBarName').textContent =profiles[activeProfileId].name;
  } else {
    semData={}; semHistory={};
    activeDept = 'CNGB';
    document.getElementById('deptSel').value = 'CNGB';
    document.getElementById('activeProfileName').textContent    ='No Profile';
    document.getElementById('activeProfileBarName').textContent ='None';
  }
  updateDeptSelectState();
}

function persistToProfile(){
  if(!activeProfileId) return;
  const profiles=getAllProfiles();
  if(!profiles[activeProfileId]) return;
  profiles[activeProfileId].semData    =semData;
  profiles[activeProfileId].semHistory =semHistory;
  profiles[activeProfileId].dept       =activeDept;
  saveAllProfiles(profiles);
}

function computeCumulative(profile) {
  if (!profile) return null;
  const semData = profile.semData || {};
  const semHistory = profile.semHistory || {};
  const dept = profile.dept || 'CNGB';
  const latest = {}; // courseName -> { credits, grade }

  const presets = (dept === 'IENG') ? IENG_PRESETS : (dept === 'FE' ? FE_PRESETS : CNGB_PRESETS);
  const electives = (dept === 'IENG') ? IENG_ELECTIVES : (dept === 'FE' ? FE_ELECTIVES : CNGB_ELECTIVES);

  for (const [year, sem] of SEM_ORDER) {
    const key = year + '|' + sem;
    if (!semHistory[key]) continue; // only saved semesters

    const dataKey = dept + '|' + key;
    const saved = semData[dataKey] || [];
    const preset = presets[key] || [];
    const elect = electives[key] || [];

    // Build full list of courses for this semester (presets + electives)
    const presetSorted = [...preset].sort((a, b) => b[1] - a[1]);
    const all = [];
    presetSorted.forEach(([name, cr]) => all.push({ name, cr, isElective: false }));
    elect.forEach((name) => all.push({ name, cr: 3, isElective: true }));

    const baseCount = all.length;
    const entries = [];

    // Preset/elective courses
    for (let i = 0; i < baseCount; i++) {
      const savedEntry = saved[i] || { grade: '', credits: all[i].cr };
      entries.push({
        name: all[i].name,
        credits: (savedEntry.credits !== undefined) ? savedEntry.credits : all[i].cr,
        grade: savedEntry.grade || ''
      });
    }

    // Additional retakes (stored with retake:true)
    for (let i = baseCount; i < saved.length; i++) {
      const extra = saved[i];
      if (extra && extra.retake && extra.name) {
        entries.push({
          name: extra.name,
          credits: extra.credits || 3,
          grade: extra.grade || ''
        });
      }
    }

    // Update latest map (overwrites any previous attempt of the same course name)
    entries.forEach(({ name, credits, grade }) => {
      if (grade && grade !== 'SKIP') {
        latest[name] = { credits, grade };
      }
    });
  }

  // Compute GPA from the latest map
  let pts = 0, cr = 0;
  for (const name in latest) {
    const { credits, grade } = latest[name];
    const points = GRADE_POINTS[grade] ?? 0;
    pts += points * credits;
    cr += credits;
  }

  if (cr === 0) return null;
  const gpa = pts / cr;
  let honor = '';
  if (gpa >= 3.5)      honor = '★ High Honor';
  else if (gpa >= 3.0) honor = '✦ Honor';
  else if (gpa < 2.0)  honor = '⚠ Below 2.0';
  return { val: gpa.toFixed(2), honor };
}

// Legacy wrapper for code that still expects calcCumulative(semHistory)
function calcCumulative(sh) {
  const profiles = getAllProfiles();
  const id = getActiveProfileId();
  if (id && profiles[id]) {
    return computeCumulative(profiles[id]);
  }
  return null;
}

// ── for Excel export ──────────────────────────────────────────
function getLatestCourses(profile) {
  if (!profile) return {};
  const semData = profile.semData || {};
  const dept = profile.dept || 'CNGB';
  const latest = {}; // courseName -> { credits, grade }

  const presets = (dept === 'IENG') ? IENG_PRESETS : (dept === 'FE' ? FE_PRESETS : CNGB_PRESETS);
  const electives = (dept === 'IENG') ? IENG_ELECTIVES : (dept === 'FE' ? FE_ELECTIVES : CNGB_ELECTIVES);

  for (const [year, sem] of SEM_ORDER) {
    const key = year + '|' + sem;
    const dataKey = dept + '|' + key;
    const saved = semData[dataKey] || [];
    const preset = presets[key] || [];
    const elect = electives[key] || [];

    const presetSorted = [...preset].sort((a, b) => b[1] - a[1]);
    const all = [];
    presetSorted.forEach(([name, cr]) => all.push({ name, cr, isElective: false }));
    elect.forEach((name) => all.push({ name, cr: 3, isElective: true }));

    const baseCount = all.length;
    const entries = [];

    for (let i = 0; i < baseCount; i++) {
      const savedEntry = saved[i] || { grade: '', credits: all[i].cr };
      entries.push({
        name: all[i].name,
        credits: (savedEntry.credits !== undefined) ? savedEntry.credits : all[i].cr,
        grade: savedEntry.grade || ''
      });
    }

    for (let i = baseCount; i < saved.length; i++) {
      const extra = saved[i];
      if (extra && extra.retake && extra.name) {
        entries.push({
          name: extra.name,
          credits: extra.credits || 3,
          grade: extra.grade || ''
        });
      }
    }

    entries.forEach(({ name, credits, grade }) => {
      if (grade && grade !== 'SKIP') {
        latest[name] = { credits, grade };
      }
    });
  }
  return latest;
}