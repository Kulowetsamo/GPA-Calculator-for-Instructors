// ── profile list ──────────────────────────────────────────────
let profileFilter = 'ALL';
function setProfileFilter(f) {
  profileFilter = f;
  ['ALL', 'CNGB', 'IENG', 'FE'].forEach(d => {
    document.getElementById('filterTab_' + d)?.classList.toggle('active', d === f);
  });
  renderProfileList();
}

function getActiveProfile() {
  const profiles = getAllProfiles();
  const id = getActiveProfileId();
  return id ? profiles[id] : null;
}

function renderProfileList() {
  _gpaEiEnsureSetup();
  const profiles = getAllProfiles();
  const list = document.getElementById('profileList');
  list.innerHTML = '';
  const ids = Object.keys(profiles).filter(id => profileFilter === 'ALL' || (profiles[id].dept || 'CNGB') === profileFilter);
  if (!ids.length) {
    list.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px 0;">No profiles' + (profileFilter !== 'ALL' ? ' for ' + profileFilter : '') + '. Create one above.</div>';
    return;
  }
  ids.forEach(id => {
    const p = profiles[id];
    const cnt = Object.keys(p.semHistory || {}).length;
    const cum = computeCumulative(p);
    const dept = p.dept || 'CNGB';
    const card = document.createElement('div');
    card.className = 'profile-card' + (id === activeProfileId ? ' is-active' : '');
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'pc-info';
    infoDiv.innerHTML = `
      <div class="pc-name">${p.name}<span class="dept-badge">${dept}</span></div>
      <div class="pc-meta">${cnt} semester${cnt !== 1 ? 's' : ''} saved${cum ? ' · ' + cum.val + ' GPA' : ''}${cum?.honor ? ' · ' + cum.honor : ''}</div>
    `;
    card.appendChild(infoDiv);
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'pc-actions';
    
    if (id !== activeProfileId) {
      const loadBtn = document.createElement('button');
      loadBtn.className = 'pc-btn load';
      loadBtn.textContent = 'Load';
      loadBtn.onclick = () => loadProfile(id);
      actionsDiv.appendChild(loadBtn);
    } else {
      const activeSpan = document.createElement('span');
      activeSpan.style.cssText = 'font-size:11px;color:var(--accent);font-family:"DM Mono",monospace;';
      activeSpan.textContent = 'Active';
      actionsDiv.appendChild(activeSpan);
    }
    
    const renameBtn = document.createElement('button');
    renameBtn.className = 'pc-btn';
    renameBtn.style.cssText = 'color:#c8a030;border-color:#3a2a10;';
    renameBtn.textContent = 'Rename';
    renameBtn.onclick = () => openRenameModal(id);
    actionsDiv.appendChild(renameBtn);

    const setIdBtn = document.createElement('button');
    setIdBtn.className = 'pc-btn';
    setIdBtn.style.cssText = 'color:#80a0c0;border-color:#1a2a3a;';
    setIdBtn.textContent = 'ID';
    setIdBtn.onclick = () => openSetStudentIdModal(id);
    actionsDiv.appendChild(setIdBtn);
    
    const delBtn = document.createElement('button');
    delBtn.className = 'pc-btn del';
    delBtn.textContent = 'Del';
    delBtn.onclick = () => askDeleteProfile(id);
    actionsDiv.appendChild(delBtn);
    
    card.appendChild(actionsDiv);
    list.appendChild(card);
  });
}

// ── Student ID modal ────────────────────────────────────────────
function openSetStudentIdModal(id) {
  const profiles = getAllProfiles();
  const p = profiles[id];
  if (!p) return;
  const currentId = p.studentId || '';
  const newId = prompt('Enter Student ID for "' + p.name + '":', currentId);
  if (newId === null) return;
  p.studentId = newId.trim();
  saveAllProfiles(profiles);
  renderProfileList();
  showToast('Student ID updated ✓');
}

// ── Delete All Profiles ──────────────────────────────────────
function deleteAllProfiles() {
  const profiles = getAllProfiles();
  const count = Object.keys(profiles).length;
  if (count === 0) {
    showToast('No profiles to delete');
    return;
  }
  if (!confirm(`Delete ALL ${count} profile(s)? This cannot be undone!`)) return;

  // Clear everything
  localStorage.removeItem('gpa_profiles');
  localStorage.removeItem('gpa_activeProfile');
  activeProfileId = null;
  semData = {};
  semHistory = {};
  document.getElementById('activeProfileName').textContent = 'No Profile';
  document.getElementById('activeProfileBarName').textContent = 'None';
  updateDeptSelectState();
  loadCourses();
  updateHistoryStrip();
  updateCumulative();
  renderProfileList();
  showToast(`All ${count} profile(s) deleted`);
}

// ── floating add button ──────────────────────────────────────
function _createFab() {
  if (document.getElementById('addFab')) return;
  const fab = document.createElement('button');
  fab.id = 'addFab';
  fab.innerHTML = '+';
  fab.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    border: none;
    font-size: 32px;
    font-weight: 300;
    box-shadow: 0 4px 16px rgba(0,0,0,0.35);
    z-index: 40;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s;
    touch-action: manipulation;
  `;
  fab.onclick = openAddCourseModal;
  fab.onmousedown = () => { fab.style.transform = 'scale(0.92)'; };
  fab.onmouseup = () => { fab.style.transform = 'scale(1)'; };
  fab.onmouseleave = () => { fab.style.transform = 'scale(1)'; };
  document.body.appendChild(fab);
}

const GPA_EI_VERSION = 1;
const VALID_DEPTS    = ['CNGB', 'IENG', 'FE'];
let _gpaEiParsed = null;

function _gpaEiEnsureSetup() {
  _gpaEiInjectButtons();
  _gpaEiInjectModal();
  _injectDeleteAllButton();
}

function _gpaEiInjectButtons() {
  if (document.getElementById('gpaEiRow')) return;

  const screen = document.getElementById('profileScreen');
  const list   = document.getElementById('profileList');
  const container = screen?.querySelector('.profile-screen') || screen || list?.parentElement;
  if (!container) return;

  const row = document.createElement('div');
  row.id = 'gpaEiRow';
  row.className = 'gpa-ei-row';
  row.innerHTML = `
    <button class="gpa-ei-btn" onclick="gpaEiExportAll()">↓ Export All</button>
    <button class="gpa-ei-btn" onclick="gpaEiExportActive()">↓ Export Current</button>
    <button class="gpa-ei-btn" onclick="gpaEiShareProfiles()">↗ Share</button>
    <button class="gpa-ei-btn" onclick="gpaEiOpenImport()">↑ Import</button>
  `;
  container.appendChild(row);
}

function _injectDeleteAllButton() {
  // Find the container after "Bulk Create" button
  const screen = document.getElementById('profileScreen');
  const container = screen?.querySelector('.profile-screen');
  if (!container) return;
  // Avoid duplicate
  if (document.getElementById('deleteAllBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'deleteAllBtn';
  btn.className = 'new-profile-btn';
  btn.style.cssText = 'background:transparent;color:var(--danger);border:1px solid var(--danger);margin-top:10px;';
  btn.textContent = '🗑 Delete All Profiles';
  btn.onclick = deleteAllProfiles;
  // Insert after the Bulk Create button (which is the last button before .profiles-label)
  const bulkBtn = container.querySelector('.new-profile-btn:nth-of-type(2)');
  if (bulkBtn) {
    bulkBtn.parentNode.insertBefore(btn, bulkBtn.nextSibling);
  } else {
    container.appendChild(btn);
  }
}

function _gpaEiInjectModal() {
  if (document.getElementById('gpaEiModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="gpaEiModal" style="
        display:none;position:fixed;inset:0;
        background:rgba(0,0,0,0.78);backdrop-filter:blur(6px);
        -webkit-backdrop-filter:blur(6px);z-index:310;
        align-items:center;justify-content:center;padding:20px;">
      <div class="gr-modal" style="max-width:440px;">
        <h2>Import Profiles</h2>
        <p style="margin-bottom:10px;">
          Paste JSON below or choose a .json file.
          Profiles with the same name as an existing one are skipped.
        </p>

        <label class="ei-file-label">
          <span id="gpaEiFileChosen">No file chosen</span>
          <input type="file" id="gpaEiFileInput" accept=".json,application/json"
                 style="display:none;" onchange="gpaEiOnFileChosen(this)">
          <span class="ei-file-btn">Choose file</span>
        </label>

        <textarea id="gpaEiPasteArea" class="ei-textarea"
                  placeholder="Or paste JSON here…"
                  oninput="gpaEiOnPaste(this)"></textarea>

        <div id="gpaEiPreview" class="ei-preview" style="display:none;"></div>

        <div class="gr-modal-btns" style="margin-top:14px;">
          <button class="gr-btn-ghost"  onclick="gpaEiCloseModal()">Cancel</button>
          <button class="gr-btn-accent" id="gpaEiConfirmBtn"
                  onclick="gpaEiConfirmImport()" disabled>Import</button>
        </div>
      </div>
    </div>
  `);
}

function gpaEiExportAll() {
  const profiles = getAllProfiles();
  const keys = Object.keys(profiles);
  if (!keys.length) { showToast('No profiles to export'); return; }
  const payload = _gpaEiBuildPayload(profiles);
  _gpaEiDownload('gpa_profiles_all.json', payload);
  showToast(`Exported ${keys.length} profile(s) ✓`);
}

function gpaEiExportActive() {
  if (!activeProfileId) { showToast('No active profile'); return; }
  const profiles = getAllProfiles();
  const p = profiles[activeProfileId];
  if (!p) { showToast('Active profile not found'); return; }
  const subset = { [activeProfileId]: p };
  const payload = _gpaEiBuildPayload(subset);
  const safeName = (p.name || 'profile').replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
  _gpaEiDownload(`gpa_${safeName}.json`, payload);
  showToast(`Exported "${p.name}" ✓`);
}

function _gpaEiBuildPayload(profiles) {
  const list = Object.values(profiles).map(p => ({
    name: p.name || 'Unnamed',
    dept: p.dept || 'CNGB',
    studentId: p.studentId || '',
    semData: p.semData || {},
    semHistory: p.semHistory || {},
  }));
  return {
    _type: 'gpa_profiles',
    _version: GPA_EI_VERSION,
    exported: new Date().toISOString(),
    profiles: list,
  };
}

function gpaEiShareProfiles() {
  const profiles = getAllProfiles();
  const keys = Object.keys(profiles);
  if (!keys.length) { showToast('No profiles to share'); return; }
  const payload = _gpaEiBuildPayload(profiles);
  const jsonString = JSON.stringify(payload, null, 2);
  const filename = 'gpa_profiles_all.json';

  if (typeof Android !== 'undefined' && Android.shareText) {
    try {
      Android.shareText(jsonString, 'Share GPA Profiles');
      showToast('Opening share sheet...');
      return;
    } catch (e) {
      console.warn('Android shareText failed:', e);
    }
  }

  const blob = new Blob([jsonString], { type: 'application/json' });
  const file = new File([blob], filename, { type: 'application/json' });

  if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
    navigator.share({ title: 'Share GPA Profiles', files: [file] })
      .then(() => showToast('Shared ✓'))
      .catch((e) => {
        console.warn('File share failed:', e);
        shareText(jsonString, 'Share GPA Profiles').then(shared => {
          if (!shared) fallbackProfileShare(jsonString);
        });
      });
    return;
  }

  if (navigator.share) {
    shareText(jsonString, 'Share GPA Profiles').then(shared => {
      if (!shared) fallbackProfileShare(jsonString);
    });
    return;
  }

  fallbackProfileShare(jsonString);
}

function fallbackProfileShare(jsonString) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonString)
      .then(() => showToast('Copied to clipboard (share not available)'))
      .catch(() => showToast('Share failed'));
  } else {
    showToast('Share not supported');
  }
}

function _gpaEiDownload(filename, payload) {
  const json = JSON.stringify(payload, null, 2);
  if (typeof Android !== 'undefined' && Android.exportFile) {
    try {
      Android.exportFile(json, filename);
      return;
    } catch (e) {
      console.error('Android export error:', e);
      showToast('Export error: ' + e.message);
    }
  }

  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  } catch (e) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json)
        .then(() => showToast('Copied to clipboard (download not available)'))
        .catch(() => showToast('Export failed'));
    } else {
      showToast('Export failed — no file support');
    }
  }
}

function gpaEiOpenImport() {
  _gpaEiParsed = null;
  document.getElementById('gpaEiPasteArea').value = '';
  document.getElementById('gpaEiFileChosen').textContent = 'No file chosen';
  document.getElementById('gpaEiPreview').style.display = 'none';
  document.getElementById('gpaEiPreview').innerHTML = '';
  document.getElementById('gpaEiConfirmBtn').disabled = true;
  document.getElementById('gpaEiModal').style.display = 'flex';
}

function gpaEiCloseModal() {
  document.getElementById('gpaEiModal').style.display = 'none';
  _gpaEiParsed = null;
}

function gpaEiOnFileChosen(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('gpaEiFileChosen').textContent = file.name;
  const reader = new FileReader();
  reader.onload = e => _gpaEiValidate(e.target.result);
  reader.readAsText(file);
}

function gpaEiOnPaste(textarea) {
  _gpaEiValidate(textarea.value.trim());
}

function _gpaEiValidate(raw) {
  const preview = document.getElementById('gpaEiPreview');
  const btn = document.getElementById('gpaEiConfirmBtn');
  _gpaEiParsed = null;
  btn.disabled = true;
  preview.style.display = 'none';
  preview.innerHTML = '';
  if (!raw) return;

  let payload;
  try { payload = JSON.parse(raw); }
  catch (e) {
    preview.style.display = 'block';
    preview.innerHTML = `<span class="ei-preview-error">Invalid JSON — check for missing commas or brackets.</span>`;
    return;
  }

  if (payload._type !== 'gpa_profiles') {
    preview.style.display = 'block';
    preview.innerHTML = `<span class="ei-preview-error">
      Wrong file type — expected <strong>gpa_profiles</strong>,
      got <strong>${payload._type || 'unknown'}</strong>.
    </span>`;
    return;
  }

  if (!Array.isArray(payload.profiles) || !payload.profiles.length) {
    preview.style.display = 'block';
    preview.innerHTML = `<span class="ei-preview-error">No profiles found in this file.</span>`;
    return;
  }

  const existingNames = Object.values(getAllProfiles()).map(p => p.name.toLowerCase());
  const valid = [];
  const errors = [];

  payload.profiles.forEach((p, i) => {
    const label = `Profile ${i + 1}`;
    if (typeof p.name !== 'string' || !p.name.trim()) {
      errors.push(`${label}: missing name`); return;
    }
    if (!VALID_DEPTS.includes(p.dept)) {
      errors.push(`"${p.name}": unknown dept "${p.dept}" (must be CNGB, IENG, or FE)`); return;
    }
    if (typeof p.semData !== 'object' || Array.isArray(p.semData)) {
      errors.push(`"${p.name}": semData is malformed`); return;
    }
    if (typeof p.semHistory !== 'object' || Array.isArray(p.semHistory)) {
      errors.push(`"${p.name}": semHistory is malformed`); return;
    }

    const dupe = existingNames.includes(p.name.trim().toLowerCase());
    const semCount = Object.keys(p.semHistory || {}).length;
    valid.push({ ...p, _dupe: dupe, _semCount: semCount });
  });

  const toImport = valid.filter(p => !p._dupe);
  const skipped = valid.filter(p => p._dupe);

  let html = '<div class="ei-preview-list">';
  valid.forEach(p => {
    const meta = `${p.dept} · ${p._semCount} semester(s) saved`;
    html += `<div class="ei-preview-item ${p._dupe ? 'ei-preview-skip' : 'ei-preview-new'}">
      <span class="ei-preview-dot">${p._dupe ? '○' : '●'}</span>
      <div style="flex:1;min-width:0;">
        <div class="ei-preview-name">${_gpaEiEsc(p.name)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px;">${meta}</div>
      </div>
      <span class="ei-preview-tag">${p._dupe ? 'skip — exists' : 'new'}</span>
    </div>`;
  });
  errors.forEach(e => {
    html += `<div class="ei-preview-item ei-preview-error-row">
      <span class="ei-preview-dot">✗</span>
      <span class="ei-preview-name">${_gpaEiEsc(e)}</span>
    </div>`;
  });
  html += '</div>';

  if (toImport.length) {
    html += `<div class="ei-preview-summary">
      ${toImport.length} will be imported${skipped.length ? `, ${skipped.length} skipped` : ''}.
    </div>`;
  } else {
    html += `<div class="ei-preview-summary ei-preview-error">
      Nothing to import — all profiles already exist or are invalid.
    </div>`;
  }

  preview.style.display = 'block';
  preview.innerHTML = html;

  if (toImport.length) {
    _gpaEiParsed = toImport;
    btn.disabled = false;
  }
}

function gpaEiConfirmImport() {
  if (!_gpaEiParsed || !_gpaEiParsed.length) return;
  const profiles = getAllProfiles();
  let count = 0;

  _gpaEiParsed.forEach(p => {
    const id = 'prof_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    profiles[id] = {
      name: p.name.trim(),
      dept: p.dept,
      studentId: p.studentId || '',
      semData: p.semData || {},
      semHistory: p.semHistory || {},
    };
    count++;
  });

  saveAllProfiles(profiles);
  gpaEiCloseModal();
  if (typeof renderProfileList === 'function') renderProfileList();
  showToast(`${count} profile(s) imported ✓`);
}

function _gpaEiEsc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── semester UI ───────────────────────────────────────────────
function persist(key) {
  const rows = document.querySelectorAll('.course-row');
  const snap = [];
  rows.forEach(row => {
    const gradeEl = row.querySelector('.grade-select');
    const credEl = row.querySelector('.spin-val');
    const isElect = row.classList.contains('elective');
    const isRetake = row.dataset.retake === '1';
    const entry = {
      grade: gradeEl ? gradeEl.value : '',
      credits: isElect || isRetake ? parseInt(credEl?.textContent || row.dataset.credits) : parseInt(row.dataset.credits),
      elective: isElect
    };
    if (isRetake) {
      entry.retake = true;
      const nameEl = row.querySelector('.course-name span');
      entry.name = nameEl ? nameEl.textContent : row.querySelector('.course-name')?.textContent || '';
    }
    snap.push(entry);
  });
  semData[activeDept + '|' + key] = snap;
  persistToProfile();
}

function loadCourses() {
  const list = document.getElementById('courseList');
  list.innerHTML = '';
  const key = activeKey;
  const dataKey = activeDept + '|' + key;
  const saved = semData[dataKey] || null;
  const preset = getCoursePresets()[key] || [];
  const elects = getElectivePresets()[key] || [];
  const sorted = [...preset].sort((a, b) => b[1] - a[1]);
  const baseCount = sorted.length + elects.length;
  sorted.forEach(([name, credits], i) => {
    list.appendChild(makeCourseRow(name, credits, saved?.[i]?.grade || '', false));
  });
  elects.forEach((name, j) => {
    const idx = sorted.length + j;
    list.appendChild(makeCourseRow(name, saved?.[idx]?.credits || 3, saved?.[idx]?.grade || '', true));
  });
  if (saved && saved.length > baseCount) {
    for (let i = baseCount; i < saved.length; i++) {
      const r = saved[i];
      if (r && r.retake) list.appendChild(makeRetakeRow(r.name, r.credits, r.grade || ''));
    }
  }
  recalculate();
  updateHistoryStrip();
  updateCumulative();
}

function makeRetakeRow(name, credits, savedGrade) {
  const row = document.createElement('div');
  row.className = 'course-row retake-row';
  row.dataset.credits = credits;
  row.dataset.zeroCr = '0';
  row.dataset.retake = '1';

  const nameEl = document.createElement('div');
  nameEl.className = 'course-name';
  nameEl.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
  nameEl.innerHTML = `<span>${name}</span><span style="font-size:9px;color:var(--accent2);letter-spacing:0.04em;">RETAKE</span>`;
  row.appendChild(nameEl);

  const spin = document.createElement('div');
  spin.className = 'credit-spin';
  const minus = document.createElement('button');
  minus.className = 'spin-btn';
  minus.textContent = '−';
  const val = document.createElement('span');
  val.className = 'spin-val';
  val.textContent = credits;
  const plus = document.createElement('button');
  plus.className = 'spin-btn';
  plus.textContent = '+';
  minus.onclick = () => { let v = parseInt(val.textContent); if (v > 1) { val.textContent = v - 1; row.dataset.credits = v - 1; recalculate(); persist(activeKey); } };
  plus.onclick = () => { let v = parseInt(val.textContent); if (v < 9) { val.textContent = v + 1; row.dataset.credits = v + 1; recalculate(); persist(activeKey); } };
  spin.appendChild(minus);
  spin.appendChild(val);
  spin.appendChild(plus);
  row.appendChild(spin);

  const sel = document.createElement('select');
  sel.className = 'grade-select' + (savedGrade ? ' has-grade' : '');
  sel.appendChild(Object.assign(document.createElement('option'), { value: '', textContent: '—' }));
  getGradeCodesForDept().filter(g => g !== 'SKIP').forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    if (g === savedGrade) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = () => {
    sel.classList.toggle('has-grade', sel.value !== '');
    row.classList.toggle('graded', sel.value !== '' && sel.value !== 'SKIP');
    recalculate();
    persist(activeKey);
  };
  if (savedGrade && savedGrade !== 'SKIP') row.classList.add('graded');
  row.appendChild(sel);

  const rmBtn = document.createElement('button');
  rmBtn.className = 'delete-btn';
  rmBtn.textContent = '×';
  rmBtn.title = 'Remove retake';
  rmBtn.onclick = () => { row.remove(); persist(activeKey); recalculate(); updateCumulative(); };
  row.appendChild(rmBtn);

  return row;
}

// ── Add Course Modal ──────────────────────────────────────────
function openAddCourseModal() {
  _ensureAddCourseModalDOM();
  _renderAddCourseList('');
  document.getElementById('addCourseModal').classList.add('open');
  setTimeout(() => document.getElementById('addCourseSearch').focus(), 100);
}

function closeAddCourseModal() {
  document.getElementById('addCourseModal')?.classList.remove('open');
}

function _ensureAddCourseModalDOM() {
  if (document.getElementById('addCourseModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="addCourseModal" class="modal-overlay">
      <div class="modal" style="max-height:80vh;display:flex;flex-direction:column;">
        <h2 style="margin:0 0 4px;">Add Course</h2>
        <p style="font-size:11px;color:var(--muted);margin:0 0 12px;line-height:1.6;">
          Add a retake or extra course to this semester.<br>
          For cGPA, only the last grade of a repeated course counts.
        </p>
        <input id="addCourseSearch" type="text" placeholder="Search courses…"
          style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-family:'DM Mono',monospace;font-size:12px;margin-bottom:10px;outline:none;"
          oninput="_renderAddCourseList(this.value)">
        <div id="addCourseList" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;min-height:0;max-height:calc(80vh - 180px);"></div>
        <div class="modal-btns" style="margin-top:14px;">
          <button class="modal-cancel" onclick="closeAddCourseModal()">Cancel</button>
        </div>
      </div>
    </div>
  `);
}

function _allDeptCourses() {
  const presets = getCoursePresets();
  const courses = [];
  const seen = new Set();
  SEM_ORDER.forEach(([year, sem]) => {
    const key = year + '|' + sem;
    (presets[key] || []).forEach(([name, cr]) => {
      if (cr === 0) return;
      if (!seen.has(name)) { seen.add(name);
        courses.push({ name, cr, sem: key }); }
    });
  });
  return courses;
}

function _renderAddCourseList(query) {
  const container = document.getElementById('addCourseList');
  if (!container) return;
  const q = (query || '').toLowerCase().trim();
  const all = _allDeptCourses();
  const filtered = q ? all.filter(c => c.name.toLowerCase().includes(q)) : all;

  if (!filtered.length) {
    container.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px 0;">No courses found.</div>';
    return;
  }

  const bySem = {};
  filtered.forEach(c => {
    if (!bySem[c.sem]) bySem[c.sem] = [];
    bySem[c.sem].push(c);
  });

  container.innerHTML = '';
  SEM_ORDER.forEach(([year, sem]) => {
    const key = year + '|' + sem;
    if (!bySem[key]) return;
    const yIdx = ['Year 1', 'Year 2', 'Year 3', 'Year 4'].indexOf(year) + 1;
    const semN = sem === 'Fall' ? 1 : 2;
    const label = document.createElement('div');
    label.style.cssText = 'font-size:10px;color:var(--muted);margin:8px 0 4px;letter-spacing:0.06em;';
    label.textContent = `YEAR ${yIdx} · SEM ${semN}`;
    container.appendChild(label);

    bySem[key].forEach(({ name, cr }) => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;gap:8px;';
      item.innerHTML = `
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px;">${cr} credits</div>
        </div>
        <button style="background:var(--accent);color:#0f0f0f;border:none;border-radius:6px;padding:4px 10px;font-family:'DM Mono',monospace;font-size:11px;cursor:pointer;white-space:nowrap;font-weight:600;">Add</button>
      `;
      item.querySelector('button').onclick = (e) => { e.stopPropagation();
        addCourseFromPicker(name, cr); };
      container.appendChild(item);
    });
  });
}

function addCourseFromPicker(name, credits) {
  closeAddCourseModal();
  const list = document.getElementById('courseList');
  if (!list) return;
  const row = makeRetakeRow(name, credits, '');
  list.appendChild(row);
  persist(activeKey);
  recalculate();
  showToast(`${name.split('·')[0].trim()} added as retake`);
}

function makeCourseRow(name, credits, savedGrade, isElective) {
  const isZero = (!isElective && credits === 0);
  const row = document.createElement('div');
  row.className = 'course-row' + (isElective ? ' elective' : '') + (isZero ? ' zero-cr' : '');
  row.dataset.credits = credits;
  row.dataset.zeroCr = isZero ? '1' : '0';

  const nameEl = document.createElement('div');
  nameEl.className = 'course-name';
  nameEl.textContent = name;
  row.appendChild(nameEl);

  if (isElective) {
    const spin = document.createElement('div');
    spin.className = 'credit-spin';
    const minus = document.createElement('button');
    minus.className = 'spin-btn';
    minus.textContent = '−';
    const val = document.createElement('span');
    val.className = 'spin-val';
    val.textContent = credits;
    const plus = document.createElement('button');
    plus.className = 'spin-btn';
    plus.textContent = '+';
    minus.onclick = () => { let v = parseInt(val.textContent); if (v > 1) { val.textContent = v - 1;
        row.dataset.credits = v - 1;
        recalculate(); } };
    plus.onclick = () => { let v = parseInt(val.textContent); if (v < 9) { val.textContent = v + 1;
        row.dataset.credits = v + 1;
        recalculate(); } };
    spin.appendChild(minus);
    spin.appendChild(val);
    spin.appendChild(plus);
    row.appendChild(spin);
  } else {
    row.appendChild(Object.assign(document.createElement('div'), { className: 'course-credits', textContent: isZero ? '—' : credits }));
  }

  const sel = document.createElement('select');
  if (isZero) {
    sel.appendChild(Object.assign(document.createElement('option'), { value: '', textContent: '—' }));
    [
      ['S', 'Passed'],
      ['U', 'Not Passed'],
      ['SKIP', "Didn't Take"]
    ].forEach(([v, t]) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = t;
      if (v === savedGrade) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.className = 'grade-select' + (savedGrade === 'S' ? ' zero-pass' : savedGrade === 'U' ? ' zero-fail has-grade' : savedGrade ? '  has-grade' : '');
    sel.onchange = () => {
      sel.className = 'grade-select' + (sel.value === 'S' ? ' zero-pass' : sel.value === 'U' ? ' zero-fail has-grade' : sel.value ? ' has-grade' : '');
      row.classList.toggle('graded', sel.value !== '' && sel.value !== 'SKIP');
      persist(activeKey);
    };
  } else {
    sel.className = 'grade-select' + (savedGrade ? ' has-grade' : '');
    sel.appendChild(Object.assign(document.createElement('option'), { value: '', textContent: '—' }));
    getGradeCodesForDept().filter(g => g !== 'SKIP').forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      if (g === savedGrade) opt.selected = true;
      sel.appendChild(opt);
    });
    const skipOpt = document.createElement('option');
    skipOpt.value = 'SKIP';
    skipOpt.textContent = "Didn't Take";
    if (savedGrade === 'SKIP') skipOpt.selected = true;
    sel.appendChild(skipOpt);
    sel.onchange = () => {
      sel.classList.toggle('has-grade', sel.value !== '');
      row.classList.toggle('graded', sel.value !== '' && sel.value !== 'SKIP');
      recalculate();
      persist(activeKey);
    };
  }
  if (savedGrade && savedGrade !== 'SKIP') row.classList.add('graded');
  row.appendChild(sel);
  return row;
}

function updateHistoryStrip() {
  const wrap = document.getElementById('historyWrap');
  wrap.innerHTML = '';
  SEM_ORDER.forEach(([year, sem]) => {
    const key = year + '|' + sem;
    if (!semHistory[key]) return;
    const yIdx = ['Year 1', 'Year 2', 'Year 3', 'Year 4'].indexOf(year) + 1;
    const semNum = sem === 'Fall' ? 1 : 2;
    const chip = document.createElement('div');
    chip.className = 'chip' + (key === activeKey ? ' active-chip' : '');
    chip.innerHTML = `<div class="chip-label">Y${yIdx}S${semNum}</div><div class="chip-gpa">${semHistory[key].gpa.toFixed(2)}</div>`;
    chip.onclick = () => {
      const [y, s] = key.split('|');
      document.getElementById('yearSel').value = y;
      document.getElementById('semSel').value = s;
      switchSemester();
    };
    wrap.appendChild(chip);
  });
}

function updateCumulative(wiGpa) {
  const profile = getActiveProfile();
  const cum = profile ? computeCumulative(profile) : null;
  const banner = document.getElementById('cumBanner');
  const badge = document.getElementById('honorBadge');
  const cumLabel = document.getElementById('cumLabel');
  const cumGpaEl = document.getElementById('cumGpa');
  const cumSubsEl = document.getElementById('cumSubs');

  if (!cum) {
    cumGpaEl.textContent = '—';
    cumSubsEl.textContent = '';
    badge.style.display = 'none';
    banner.className = 'banner cum';
    cumLabel.textContent = 'Cumulative';
    banner.classList.remove('whatif-active');
    return;
  }

  const realGpa = parseFloat(cum.val);
  const displayGpa = (wiGpa != null) ? wiGpa : realGpa;
  cumGpaEl.textContent = displayGpa.toFixed(2);
  const keys = Object.keys(semHistory);
  cumSubsEl.textContent = keys.length + ' semester' + (keys.length > 1 ? 's' : '');

  banner.className = 'banner cum';
  badge.style.display = 'none';
  cumLabel.textContent = 'Cumulative';
  banner.classList.remove('whatif-active');

  if (wiGpa != null) {
    banner.classList.add('whatif-active');
    cumLabel.textContent = 'Cumulative (What-If)';
    const diff = wiGpa - realGpa;
    if (Math.abs(diff) >= 0.005) {
      cumSubsEl.textContent = (diff > 0 ? '▲ +' : '▼ ') + diff.toFixed(2) + ' vs real · ' + keys.length + ' sem' + (keys.length > 1 ? 's' : '');
    }
  } else {
    if (realGpa < 2.0) {
      banner.classList.add('danger');
      cumLabel.textContent = 'Cumulative ⚠';
    } else if (realGpa >= 3.5) {
      banner.classList.add('high-honor');
      badge.style.display = 'inline-block';
      badge.className = 'honor-badge high';
      badge.textContent = '★ High Honor';
    } else if (realGpa >= 3.0) {
      badge.style.display = 'inline-block';
      badge.className = 'honor-badge';
      badge.textContent = '✦ Honor Student';
    }
  }
}

// ── modals ────────────────────────────────────────────────────
let _modalDept = 'CNGB';
function selectModalDept(d) {
  _modalDept = d;
  ['CNGB', 'IENG', 'FE'].forEach(x => document.getElementById('mdept_' + x).classList.toggle('active', x === d));
}

function openNewProfileModal() {
  _modalDept = activeDept;
  ['CNGB', 'IENG', 'FE'].forEach(x => document.getElementById('mdept_' + x).classList.toggle('active', x === _modalDept));
  document.getElementById('profileNameInput').value = '';
  document.getElementById('profileStudentIdInput').value = '';
  document.getElementById('newProfileModal').classList.add('open');
  setTimeout(() => document.getElementById('profileNameInput').focus(), 100);
}
function closeNewProfileModal() { document.getElementById('newProfileModal').classList.remove('open'); }

function confirmNewProfile() {
  const name = document.getElementById('profileNameInput').value.trim();
  const studentId = document.getElementById('profileStudentIdInput').value.trim();
  if (!name) return;
  const profiles = getAllProfiles();
  const id = 'profile_' + Date.now();
  profiles[id] = { name, dept: _modalDept, studentId, semData: {}, semHistory: {} };
  saveAllProfiles(profiles);
  closeNewProfileModal();
  loadProfile(id);
}

function askDeleteProfile(id) {
  const profiles = getAllProfiles();
  deleteTargetId = id;
  deleteTargetName = profiles[id]?.name;
  document.getElementById('deleteModalText').textContent = `Delete "${deleteTargetName}"? This cannot be undone.`;
  document.getElementById('deleteModal').classList.add('open');
}
function closeDeleteModal() { document.getElementById('deleteModal').classList.remove('open');
  deleteTargetId = null;
  deleteTargetName = null; }

function confirmDelete() {
  if (!deleteTargetId) return;
  const profiles = getAllProfiles();
  const name = profiles[deleteTargetId]?.name;
  deletedProfile = { id: deleteTargetId, data: JSON.parse(JSON.stringify(profiles[deleteTargetId])) };
  delete profiles[deleteTargetId];
  saveAllProfiles(profiles);
  if (activeProfileId === deleteTargetId) {
    localStorage.removeItem('gpa_activeProfile');
    activeProfileId = null;
    semData = {};
    semHistory = {};
    document.getElementById('activeProfileName').textContent = 'No Profile';
    document.getElementById('activeProfileBarName').textContent = 'None';
    updateDeptSelectState();
    loadCourses();
    updateHistoryStrip();
    updateCumulative();
  }
  closeDeleteModal();
  renderProfileList();
  showToast(`"${name}" deleted`, 5000, true);
}

function undoDelete() {
  if (!deletedProfile) return;
  const profiles = getAllProfiles();
  profiles[deletedProfile.id] = deletedProfile.data;
  saveAllProfiles(profiles);
  if (!activeProfileId) {
    setActiveProfileId(deletedProfile.id);
    loadActiveProfile();
    loadCourses();
    updateHistoryStrip();
    updateCumulative();
  }
  deletedProfile = null;
  if (toastTimer) { clearTimeout(toastTimer);
    toastTimer = null; }
  document.getElementById('toast').classList.remove('show');
  renderProfileList();
  showToast('Restored ✓', 2000, false);
}

function confirmReset() { document.getElementById('resetModal').classList.add('open'); }
function closeResetModal() { document.getElementById('resetModal').classList.remove('open'); }
function doReset() { semData = {};
  semHistory = {};
  if (activeProfileId) persistToProfile();
  loadCourses();
  closeResetModal(); }

let toastTimer = null;
function showToast(msg, duration = 2000, showUndo = false) {
  const t = document.getElementById('toast');
  const msgEl = document.getElementById('toastMsg');
  const undo = document.getElementById('toastUndo');
  const bar = document.getElementById('toastBar');
  if (toastTimer) { clearTimeout(toastTimer);
    toastTimer = null; }
  msgEl.textContent = msg;
  undo.style.display = showUndo ? 'block' : 'none';
  bar.style.transition = 'none';
  bar.style.width = '100%';
  t.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.transition = `width ${duration}ms linear`;
    bar.style.width = '0%';
  }));
  toastTimer = setTimeout(() => { t.classList.remove('show');
    deletedProfile = null;
    toastTimer = null; }, duration);
}

let renameTargetId = null;
function openRenameModal(id) {
  renameTargetId = id;
  const profiles = getAllProfiles();
  document.getElementById('renameInput').value = profiles[id]?.name || '';
  document.getElementById('renameModal').classList.add('open');
  setTimeout(() => document.getElementById('renameInput').focus(), 100);
}
function closeRenameModal() { document.getElementById('renameModal').classList.remove('open');
  renameTargetId = null; }
function confirmRename() {
  const name = document.getElementById('renameInput').value.trim();
  if (!name || !renameTargetId) return;
  const profiles = getAllProfiles();
  profiles[renameTargetId].name = name;
  saveAllProfiles(profiles);
  if (renameTargetId === activeProfileId) {
    document.getElementById('activeProfileName').textContent = name;
    document.getElementById('activeProfileBarName').textContent = name;
  }
  closeRenameModal();
  renderProfileList();
}

// ── theme ─────────────────────────────────────────────────────
function loadTheme() {
  const savedTheme = localStorage.getItem('gpa_theme');
  if (savedTheme === 'dark') {
    document.body.classList.remove('light');
  } else {
    document.body.classList.add('light');
    if (!savedTheme) localStorage.setItem('gpa_theme', 'light');
  }
}

// ── transcript ────────────────────────────────────────────────
function renderTranscript() {
  const wrap = document.getElementById('transcriptWrap');
  wrap.innerHTML = '';
  const profiles = getAllProfiles();
  const profileName = activeProfileId && profiles[activeProfileId] ? profiles[activeProfileId].name : null;

  const header = document.createElement('div');
  header.className = 'transcript-header';
  header.innerHTML = `<span class="transcript-title">${activeDept}</span><span class="transcript-sub">GPA Calculator</span>`;
  wrap.appendChild(header);

  const pName = document.createElement('div');
  pName.className = 'transcript-profile';
  pName.textContent = profileName || 'No Profile';
  wrap.appendChild(pName);

  const savedSems = SEM_ORDER.filter(([y, s]) => semHistory[y + '|' + s]);
  if (!savedSems.length) {
    const msg = document.createElement('div');
    msg.className = 'no-data-msg';
    msg.innerHTML = 'No saved semesters yet.<br>Save semester GPAs in the Calc tab.';
    wrap.appendChild(msg);
    renderTranscriptActions(wrap);
    return;
  }

  const presets = getCoursePresets();
  const electives = getElectivePresets();

  savedSems.forEach(([year, sem]) => {
    const key = year + '|' + sem;
    const dataKey = activeDept + '|' + key;
    const yIdx = ['Year 1', 'Year 2', 'Year 3', 'Year 4'].indexOf(year) + 1;
    const semN = sem === 'Fall' ? 1 : 2;
    const saved = semData[dataKey] || [];
    const preset = [...(presets[key] || [])].sort((a, b) => b[1] - a[1]);
    const elects = electives[key] || [];

    const semDiv = document.createElement('div');
    semDiv.className = 'transcript-sem';
    const semH = document.createElement('div');
    semH.className = 'transcript-sem-header';
    semH.innerHTML = `<span class="transcript-sem-title">Year ${yIdx} · Semester ${semN}</span><span class="transcript-sem-gpa">${semHistory[key].gpa.toFixed(2)} GPA</span>`;
    semDiv.appendChild(semH);

    const allCourses = [];
    preset.forEach((c, i) => {
      allCourses.push({
        name: c[0],
        cr: c[1],
        grade: saved[i]?.grade || '',
        isZero: c[1] === 0
      });
    });
    elects.forEach((nm, j) => {
      const idx = preset.length + j;
      allCourses.push({
        name: nm,
        cr: saved[idx]?.credits || 3,
        grade: saved[idx]?.grade || '',
        isZero: false
      });
    });
    if (saved && saved.length > preset.length + elects.length) {
      for (let i = preset.length + elects.length; i < saved.length; i++) {
        const extra = saved[i];
        if (extra && extra.retake && extra.name) {
          allCourses.push({
            name: extra.name,
            cr: extra.credits || 3,
            grade: extra.grade || '',
            isZero: false
          });
        }
      }
    }

    allCourses.forEach(({ name, cr, grade, isZero }) => {
      if (grade === 'SKIP') return;
      const row = document.createElement('div');
      row.className = 'transcript-course';
      let gradeClass = '',
        gradeText = '';
      if (isZero) {
        gradeText = grade === 'S' ? 'S' : grade === 'U' ? 'U' : '—';
        gradeClass = grade === 'S' ? 'pass' : grade === 'U' ? 'fail' : 'empty';
      } else {
        gradeText = grade || 'FF';
        gradeClass = grade === '' ? 'empty' : '';
      }
      row.innerHTML = `
        <span class="transcript-course-name">${name}</span>
        <span class="transcript-course-cr">${isZero ? '—' : cr + 'cr'}</span>
        <span class="transcript-course-grade ${gradeClass}">${gradeText}</span>`;
      semDiv.appendChild(row);
    });
    wrap.appendChild(semDiv);
  });

  const cum = computeCumulative(profiles[activeProfileId]);
  if (cum) {
    const cumDiv = document.createElement('div');
    cumDiv.className = 'transcript-cum' + (parseFloat(cum.val) < 2 ? ' danger' : '');
    cumDiv.innerHTML = `
      <div class="transcript-cum-left">
        <div class="label">Cumulative GPA</div>
        ${cum.honor ? `<div class="transcript-honor">${cum.honor}</div>` : ''}
      </div>
      <div class="transcript-cum-gpa">${cum.val}</div>`;
    wrap.appendChild(cumDiv);
  }

  renderTranscriptActions(wrap);
}

function renderTranscriptActions(wrap) {
  const actions = document.createElement('div');
  actions.className = 'transcript-actions';
  actions.innerHTML = `
    <button class="transcript-btn" onclick="shareTranscript()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      Share
    </button>
    <button class="transcript-btn" onclick="copyTranscript()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      Copy
    </button>
    <button class="transcript-btn" id="exportImgBtn" onclick="exportAsImage()" style="grid-column:1/-1;border-color:#2a3a4a;color:var(--accent2);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      Export as Image
    </button>`;
  wrap.appendChild(actions);
}

function buildShareText() {
  const profiles = getAllProfiles();
  const name = activeProfileId && profiles[activeProfileId] ? profiles[activeProfileId].name : 'GPA';
  const presets = getCoursePresets();
  const electives = getElectivePresets();
  const lines = [`${activeDept} GPA — ${name}`, ``];
  SEM_ORDER.filter(([y, s]) => semHistory[y + '|' + s]).forEach(([year, sem]) => {
    const key = year + '|' + sem;
    const dataKey = activeDept + '|' + key;
    const yIdx = ['Year 1', 'Year 2', 'Year 3', 'Year 4'].indexOf(year) + 1;
    const semN = sem === 'Fall' ? 1 : 2;
    const saved = semData[dataKey] || [];
    const preset = [...(presets[key] || [])].sort((a, b) => b[1] - a[1]);
    const elects = electives[key] || [];

    lines.push(`── Year ${yIdx} · Semester ${semN}  (GPA: ${semHistory[key].gpa.toFixed(2)}) ──`);

    const allCourses = [];
    preset.forEach((c, i) => {
      allCourses.push({
        name: c[0],
        cr: c[1],
        grade: saved[i]?.grade || '',
        isZero: c[1] === 0
      });
    });
    elects.forEach((nm, j) => {
      const idx = preset.length + j;
      allCourses.push({
        name: nm,
        cr: saved[idx]?.credits || 3,
        grade: saved[idx]?.grade || '',
        isZero: false
      });
    });
    if (saved && saved.length > preset.length + elects.length) {
      for (let i = preset.length + elects.length; i < saved.length; i++) {
        const extra = saved[i];
        if (extra && extra.retake && extra.name) {
          allCourses.push({
            name: extra.name,
            cr: extra.credits || 3,
            grade: extra.grade || '',
            isZero: false
          });
        }
      }
    }

    allCourses.forEach(({ name, cr, grade, isZero }) => {
      if (grade === 'SKIP') return;
      const g = isZero ? (grade || '—') : (grade || 'FF');
      lines.push(`${g.padEnd(3)}  ${isZero ? '—  ' : (String(cr) + 'cr')}  ${name}`);
    });
    lines.push('');
  });
  const cum = computeCumulative(profiles[activeProfileId]);
  if (cum) { lines.push(`Cumulative GPA: ${cum.val}`);
    if (cum.honor) lines.push(cum.honor); }
  return lines.join('\n');
}

async function shareTranscript() {
  const text = buildShareText();
  const shared = await shareText(text, 'GPA Transcript');
  if (!shared) {
    copyTranscript();
  }
}

async function shareText(text, title) {
  if (typeof Android !== 'undefined' && Android.shareText) {
    try {
      Android.shareText(text, title);
      return true;
    } catch (e) {
      console.warn('Android shareText failed:', e);
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return true;
    } catch (e) {
      if (e && e.name === 'AbortError') return true;
      console.warn('Web share failed:', e);
    }
  }

  return false;
}

function copyTranscript() {
  const text = buildShareText();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied ✓', 2000));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied ✓', 2000);
  }
}

// ── image share & save ─────────────────────────────
window._lastExportDataUrl = null;
window._lastExportName = null;

window.shareImage = async function() {
  if (!window._lastExportDataUrl) {
    showToast('No image to share. Export first.');
    return;
  }

  if (typeof Android !== 'undefined' && Android.shareImage) {
    try {
      Android.shareImage(window._lastExportDataUrl, window._lastExportName || 'GPA_Transcript.png');
      return;
    } catch (e) {
      console.warn('Android shareImage failed:', e);
    }
  }

  try {
    const response = await fetch(window._lastExportDataUrl);
    const blob = await response.blob();
    const file = new File([blob], window._lastExportName || 'GPA_Transcript.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: 'GPA Transcript' });
      return;
    }
  } catch (e) {
    console.warn('Web share failed:', e);
  }

  downloadImg();
};

window.downloadImg = function() {
  if (!window._lastExportDataUrl) {
    showToast('No image to save');
    return;
  }

  if (typeof Android !== 'undefined' && Android.saveImage) {
    try {
      Android.saveImage(window._lastExportDataUrl, window._lastExportName || 'GPA_Transcript.png');
      return;
    } catch (e) {
      console.warn('Android saveImage failed:', e);
    }
  }

  const a = document.createElement('a');
  a.href = window._lastExportDataUrl;
  a.download = window._lastExportName || 'GPA_Transcript.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Saved ✓');
};

window.exportAsImage = async function() {
  const btn = document.getElementById('exportImgBtn');
  if (btn) {
    btn.textContent = 'Generating…';
    btn.disabled = true;
  }
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    if (document.fonts && document.fonts.load) {
      await Promise.all([
        document.fonts.load('10px "DM Mono"'),
        document.fonts.load('bold 17px "DM Mono"'),
        document.fonts.load('600 10px "DM Mono"'),
      ]).catch(() => {});
    }

    const isLight = document.body.classList.contains('light');
    const BG = isLight ? '#f5f5f0' : '#0f0f0f';
    const SURF = isLight ? '#ffffff' : '#1a1a1a';
    const BOR = isLight ? '#dddbd0' : '#2e2e2e';
    const TEXT = isLight ? '#1a1a1a' : '#f0f0f0';
    const ACC = isLight ? '#5a8a00' : '#c8f060';
    const MUT = isLight ? '#888' : '#666';
    const SAVBG = isLight ? '#eef5e8' : '#1a2e1a';
    const FONT = '"DM Mono", ui-monospace, "Courier New", monospace';

    const profiles = getAllProfiles();
    const profileName = activeProfileId && profiles[activeProfileId] ? profiles[activeProfileId].name : '—';
    const savedSems = SEM_ORDER.filter(([y, s]) => semHistory[y + '|' + s]);
    const cum = computeCumulative(profiles[activeProfileId]);
    const presets = getCoursePresets();
    const electives = getElectivePresets();

    const SC = 2,
      W = 380,
      PAD = 22,
      INNER = W - PAD * 2;

    const semBlocks = [];
    savedSems.forEach(([year, sem]) => {
      const key = year + '|' + sem;
      const dataKey = activeDept + '|' + key;
      const yIdx = ['Year 1', 'Year 2', 'Year 3', 'Year 4'].indexOf(year) + 1;
      const semN = sem === 'Fall' ? 1 : 2;
      const savedD = semData[dataKey] || [];
      const preset = [...(presets[key] || [])].sort((a, b) => b[1] - a[1]);
      const elects = electives[key] || [];

      const courses = [];
      preset.forEach((c, i) => {
        courses.push({ name: c[0], cr: c[1], grade: savedD[i]?.grade || '', isZero: c[1] === 0 });
      });
      elects.forEach((nm, j) => {
        const idx = preset.length + j;
        courses.push({ name: nm, cr: savedD[idx]?.credits || 3, grade: savedD[idx]?.grade || '', isZero: false });
      });
      if (savedD && savedD.length > preset.length + elects.length) {
        for (let i = preset.length + elects.length; i < savedD.length; i++) {
          const extra = savedD[i];
          if (extra && extra.retake && extra.name) {
            courses.push({ name: extra.name, cr: extra.credits || 3, grade: extra.grade || '', isZero: false });
          }
        }
      }
      semBlocks.push({ yIdx, semN, key, courses });
    });

    let H = PAD + 14 + 6 + 22 + 10;
    semBlocks.forEach(b => { H += 18 + 7 + b.courses.length * (28 + 4) + 16; });
    if (cum) H += 54 + 12;
    H += 20 + PAD;

    const MAX_H = 16384;
    if (H * SC > MAX_H) {
      showToast('Too many semesters to export as image');
      if (btn) { btn.textContent = 'Export as Image';
        btn.disabled = false; }
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = W * SC;
    canvas.height = H * SC;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      showToast('Canvas not supported');
      if (btn) { btn.textContent = 'Export as Image';
        btn.disabled = false; }
      return;
    }
    ctx.scale(SC, SC);

    function rr(x, y, w, h, r, fill, stroke, sw) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill;
        ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke;
        ctx.lineWidth = sw || 1;
        ctx.stroke(); }
    }

    function trunc(str, maxW) {
      if (ctx.measureText(str).width <= maxW) return str;
      let short = str;
      while (short.length > 1 && ctx.measureText(short + '…').width > maxW) short = short.slice(0, -1);
      return short + '…';
    }

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    let y = PAD;

    ctx.font = `600 10px ${FONT}`;
    ctx.fillStyle = ACC;
    ctx.fillText(activeDept, PAD, y + 11);
    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = MUT;
    const sub = 'GPA Calculator';
    ctx.fillText(sub, W - PAD - ctx.measureText(sub).width, y + 11);
    y += 14 + 6;

    ctx.font = `bold 17px ${FONT}`;
    ctx.fillStyle = TEXT;
    ctx.fillText(trunc(profileName, INNER), PAD, y + 17);
    y += 22 + 10;

    semBlocks.forEach(({ yIdx, semN, key, courses }) => {
      ctx.font = `500 9px ${FONT}`;
      ctx.fillStyle = MUT;
      ctx.fillText('YEAR ' + yIdx + ' · SEM ' + semN, PAD, y + 12);
      ctx.font = `bold 13px ${FONT}`;
      ctx.fillStyle = ACC;
      const gStr = semHistory[key].gpa.toFixed(2);
      ctx.fillText(gStr, W - PAD - ctx.measureText(gStr).width, y + 12);
      y += 18 + 7;
      courses.forEach(({ name, cr, grade, isZero }) => {
        const g = isZero ? (grade === 'S' ? 'S' : grade === 'U' ? 'U' : '—') : (grade || 'FF');
        const gC = isZero ? (grade === 'S' ? '#80e080' : grade === 'U' ? '#e08080' : MUT) : (grade ? ACC : '#c06060');
        rr(PAD, y, INNER, 26, 5, SURF, BOR, 0.8);
        ctx.font = `bold 12px ${FONT}`;
        ctx.fillStyle = gC;
        ctx.fillText(g, PAD + 10, y + 17);
        ctx.font = `10px ${FONT}`;
        ctx.fillStyle = MUT;
        ctx.fillText(isZero ? '—' : cr + 'cr', PAD + 46, y + 17);
        ctx.font = `11px ${FONT}`;
        ctx.fillStyle = TEXT;
        ctx.fillText(trunc(name, INNER - 86 - 8), PAD + 84, y + 17);
        y += 28 + 4;
      });
      y += 16;
    });

    if (cum) {
      rr(PAD, y, INNER, 50, 8, SAVBG, '#2a3a1a', 1);
      ctx.font = `500 9px ${FONT}`;
      ctx.fillStyle = MUT;
      ctx.fillText('CUMULATIVE GPA', PAD + 12, y + 16);
      if (cum.honor) {
        ctx.font = `11px ${FONT}`;
        ctx.fillStyle = ACC;
        ctx.fillText(cum.honor, PAD + 12, y + 34);
      }
      ctx.font = `bold 24px ${FONT}`;
      ctx.fillStyle = ACC;
      ctx.fillText(cum.val, W - PAD - 12 - ctx.measureText(cum.val).width, y + 36);
      y += 54 + 12;
    }

    ctx.font = `9px ${FONT}`;
    ctx.fillStyle = MUT;
    const foot = 'Generated with GPA Calculator';
    ctx.fillText(foot, W / 2 - ctx.measureText(foot).width / 2, y + 13);

    const dataUrl = canvas.toDataURL('image/png');
    window._lastExportDataUrl = dataUrl;
    window._lastExportName = activeDept + '_GPA_' + profileName.replace(/\s+/g, '_') + '.png';

    const overlayImg = document.getElementById('overlayImg');
    if (overlayImg) overlayImg.src = dataUrl;
    const overlay = document.getElementById('imgOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      setTimeout(() => {
        const btns = overlay.querySelectorAll('button');
        for (let i = 0; i < btns.length; i++) {
          const txt = btns[i].innerText;
          if (txt === 'Share') btns[i].onclick = window.shareImage;
          else if (txt === 'Save') btns[i].onclick = window.downloadImg;
        }
      }, 50);
    }
    showToast('Image ready – use Share or Save');
  } catch (e) {
    console.error('Export failed:', e);
    showToast('Export failed: ' + (e.message || 'unknown error'));
  } finally {
    if (btn) {
      btn.textContent = 'Export as Image';
      btn.disabled = false;
    }
  }
};

window.closeImgOverlay = function() {
  const overlay = document.getElementById('imgOverlay');
  if (overlay) overlay.style.display = 'none';
};

// ── swipe ─────────────────────────────────────────────────────
(function() {
  const SEM_FLAT = ["Year 1|Fall", "Year 1|Spring", "Year 2|Fall", "Year 2|Spring", "Year 3|Fall", "Year 3|Spring", "Year 4|Fall", "Year 4|Spring"];

  function currentFlatIdx() { return SEM_FLAT.indexOf(document.getElementById('yearSel').value + '|' + document.getElementById('semSel').value); }

  function goToFlat(idx) {
    if (idx < 0 || idx >= SEM_FLAT.length) return;
    const [year, sem] = SEM_FLAT[idx].split('|');
    document.getElementById('yearSel').value = year;
    document.getElementById('semSel').value = sem;
    switchSemester();
    updateSwipeDots();
  }
  window.updateSwipeDots = function() {
    const wrap = document.getElementById('swipeDots');
    if (!wrap) return;
    const cur = currentFlatIdx();
    wrap.innerHTML = '';
    SEM_FLAT.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'swipe-dot' + (i === cur ? ' active' : '');
      wrap.appendChild(d);
    });
  };
  let tx0 = 0,
    ty0 = 0,
    swiping = false;
  const area = document.getElementById('calcScrollArea');
  area.addEventListener('touchstart', e => { tx0 = e.touches[0].clientX;
    ty0 = e.touches[0].clientY;
    swiping = true; }, { passive: true });
  area.addEventListener('touchmove', e => {
    if (!swiping) return;
    if (Math.abs(e.touches[0].clientX - tx0) > Math.abs(e.touches[0].clientY - ty0) * 1.5 && Math.abs(e.touches[0].clientX - tx0) > 30) e.preventDefault();
  }, { passive: false });
  area.addEventListener('touchend', e => {
    if (!swiping) return;
    swiping = false;
    const dx = e.changedTouches[0].clientX - tx0;
    const dy = e.changedTouches[0].clientY - ty0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goToFlat(dx < 0 ? currentFlatIdx() + 1 : currentFlatIdx() - 1);
  }, { passive: true });
})();

// ── initialise ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  _createFab();
});

// ── Bulk Create with Student IDs ─────────────────────────────
let _bulkDept = 'CNGB';

function selectBulkDept(d) {
  _bulkDept = d;
  ['CNGB','IENG','FE'].forEach(x => {
    document.getElementById('bmdept_' + x)?.classList.toggle('active', x === d);
  });
}

function openBulkCreateModal() {
  document.getElementById('bulkNamesInput').value = '';
  document.getElementById('bulkCreateModal').classList.add('open');
  selectBulkDept(activeDept || 'CNGB');
  // Show a hint about the format
  const hint = document.getElementById('bulkHint');
  if (hint) hint.style.display = 'block';
  setTimeout(() => document.getElementById('bulkNamesInput').focus(), 100);
}

function closeBulkCreateModal() {
  document.getElementById('bulkCreateModal').classList.remove('open');
}

function confirmBulkCreate() {
  const text = document.getElementById('bulkNamesInput').value.trim();
  if (!text) {
    showToast('Please paste at least one name');
    return;
  }
  const lines = text.split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (!lines.length) {
    showToast('No valid lines found');
    return;
  }

  const profiles = getAllProfiles();
  let created = 0;
  lines.forEach(line => {
    // Try to split by comma or tab
    let name = line;
    let studentId = '';
    if (line.includes(',')) {
      const parts = line.split(',').map(s => s.trim());
      name = parts[0];
      studentId = parts.slice(1).join(',').trim();
    } else if (line.includes('\t')) {
      const parts = line.split('\t').map(s => s.trim());
      name = parts[0];
      studentId = parts.slice(1).join('\t').trim();
    }
    // If name is empty, skip
    if (!name) return;
    // Check duplicate (case‑insensitive)
    const exists = Object.values(profiles).some(p => p.name.toLowerCase() === name.toLowerCase());
    if (exists) return;

    const id = 'profile_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    profiles[id] = {
      name: name,
      dept: _bulkDept,
      studentId: studentId,
      semData: {},
      semHistory: {}
    };
    created++;
  });

  if (created === 0) {
    showToast('No new profiles created (all names already exist or invalid)');
    closeBulkCreateModal();
    return;
  }

  saveAllProfiles(profiles);
  closeBulkCreateModal();
  renderProfileList();
  showToast(`Created ${created} profile(s) ✓`);
}