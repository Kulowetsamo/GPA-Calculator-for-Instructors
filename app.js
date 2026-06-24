// ── screen / history ──────────────────────────────────────────
let _currentScreen='calc';

function showScreen(name,fromPopState){
  const ov=document.getElementById('imgOverlay');
  if(ov) ov.style.display='none';

  ['newProfileModal','deleteModal','resetModal','renameModal'].forEach(id=>{
    document.getElementById(id)?.classList.remove('open');
  });

  document.getElementById('calcScreen').classList.toggle('active',name==='calc');
  document.getElementById('transcriptScreen').classList.toggle('active',name==='transcript');
  document.getElementById('profileScreen').classList.toggle('active',name==='profiles');
  document.getElementById('navCalc').classList.toggle('active',name==='calc');
  document.getElementById('navProfiles').classList.toggle('active',name==='profiles');
  if(name==='profiles')   renderProfileList();
  if(name==='transcript') renderTranscript();

  if(!fromPopState){
    if(name==='calc'){
      history.replaceState({screen:'calc'},'','');
    } else {
      if(_currentScreen==='calc'){
        history.pushState({screen:name},'','');
      } else {
        history.replaceState({screen:name},'','');
      }
    }
  }
  _currentScreen=name;
}


window.addEventListener('popstate',function(e){
  const screen=(e.state&&e.state.screen)||'calc';

  const ov=document.getElementById('imgOverlay');
  if(ov&&ov.style.display!=='none'){
    ov.style.display='none';
    _currentScreen='transcript';
    return;
  }

  if(screen==='calc'){
    showScreen('calc',true);
  } else {
    showScreen('calc',true);
    history.replaceState({screen:'calc'},'','');
  }
});

// ── semester navigation ───────────────────────────────────────
function currentKey(){ return document.getElementById('yearSel').value+'|'+document.getElementById('semSel').value; }

function onDeptChange(){
  if (activeProfileId) {
    document.getElementById('deptSel').value = activeDept;
    return;
  }
  persist(activeKey);
  activeDept=document.getElementById('deptSel').value;
  persistToProfile();
  loadCourses();
  if(window.updateSwipeDots) updateSwipeDots();
}

function onYearChange(){
  document.getElementById('semSel').value='Fall';
  switchSemester();
}

function switchSemester(){
  persist(activeKey);
  activeKey=currentKey();
  loadCourses();
  if(window.updateSwipeDots) updateSwipeDots();
}

// ── profile actions ───────────────────────────────────────────
function loadProfile(id){
  persist(activeKey); persistToProfile();
  setActiveProfileId(id);
  loadActiveProfile();
  document.getElementById('deptSel').value=activeDept;
  loadCourses(); updateHistoryStrip(); updateCumulative(); renderProfileList();
  if(typeof flushPendingSave==='function') flushPendingSave();
}

// ── Android back button bridge ────────────────────────────────
window.handleBackButton = function(){
  const ov = document.getElementById('imgOverlay');
  if(ov && ov.style.display !== 'none'){
    ov.style.display = 'none';
    return true;
  }
  const modals = ['newProfileModal','deleteModal','resetModal','renameModal','targetModal'];
  const openModal = modals.find(id => document.getElementById(id)?.classList.contains('open'));
  if(openModal){
    document.getElementById(openModal).classList.remove('open');
    return true;
  }
  if(_currentScreen !== 'calc'){
    showScreen('calc');
    return true;
  }
  return false;
};

loadTheme();
loadActiveProfile();
loadCourses();
updateSwipeDots();
history.replaceState({screen:'calc'},'','');
