// ── Wide‑format Excel export (course codes only) ────────────

function getCourseCode(fullName) {
  // Extract code before the '·' (middle dot) if present, otherwise trim
  const idx = fullName.indexOf('·');
  return idx > 0 ? fullName.substring(0, idx).trim() : fullName.trim();
}

function exportAllProfilesToWideExcel() {
  const dept = activeDept;
  const allProfiles = getAllProfiles();
  const profileIds = Object.keys(allProfiles).filter(id => (allProfiles[id].dept || 'CNGB') === dept);

  if (!profileIds.length) {
    showToast('No profiles for department ' + dept);
    return;
  }

  const presets = (dept === 'IENG') ? IENG_PRESETS : (dept === 'FE' ? FE_PRESETS : CNGB_PRESETS);
  const electives = (dept === 'IENG') ? IENG_ELECTIVES : (dept === 'FE' ? FE_ELECTIVES : CNGB_ELECTIVES);

  // Determine the last saved semester across all profiles
  let maxFilledIdx = -1;
  profileIds.forEach(id => {
    const p = allProfiles[id];
    const semHistory = p.semHistory || {};
    let lastIdx = -1;
    SEM_ORDER.forEach(([year, sem], idx) => {
      const key = year + '|' + sem;
      if (semHistory[key]) {
        lastIdx = idx;
      }
    });
    if (lastIdx > maxFilledIdx) maxFilledIdx = lastIdx;
  });

  if (maxFilledIdx < 0) {
    showToast('No saved semester found for any profile');
    return;
  }

  const includedSemesters = SEM_ORDER.slice(0, maxFilledIdx + 1);

  // Collect all course codes for each included semester (union across profiles)
  const semCourses = {};
  includedSemesters.forEach(([year, sem]) => {
    const key = year + '|' + sem;
    const codeSet = new Set();
    profileIds.forEach(id => {
      const p = allProfiles[id];
      const saved = (p.semData || {})[dept + '|' + key] || [];
      const preset = presets[key] || [];
      const elect = electives[key] || [];
      const presetSorted = [...preset].sort((a, b) => b[1] - a[1]);
      presetSorted.forEach(([name, cr]) => {
        if (cr > 0) codeSet.add(getCourseCode(name));
      });
      elect.forEach(name => codeSet.add(getCourseCode(name)));
      // Retakes (stored as full names, extract code)
      const baseCount = presetSorted.length + elect.length;
      for (let i = baseCount; i < saved.length; i++) {
        const extra = saved[i];
        if (extra && extra.retake && extra.name) {
          codeSet.add(getCourseCode(extra.name));
        }
      }
    });
    semCourses[key] = Array.from(codeSet).sort();
  });

  // Build CSV header: First Name, Surname, Student ID, then courses + GPA per semester
  const header = ['First Name', 'Surname', 'Student ID'];
  includedSemesters.forEach(([year, sem]) => {
    const key = year + '|' + sem;
    const codes = semCourses[key] || [];
    const yIdx = ['Year 1','Year 2','Year 3','Year 4'].indexOf(year) + 1;
    const semN = sem === 'Fall' ? 1 : 2;
    const semLabel = `Y${yIdx}S${semN}`;
    codes.forEach(code => {
      header.push(`${code} (Grade)`);
      header.push(`${code} (Points)`);
    });
    header.push(`${semLabel} GPA`);
  });
  header.push('Cumulative GPA');

  // Build rows
  const rows = [];

  profileIds.forEach(id => {
    const p = allProfiles[id];
    const name = p.name || 'Unnamed';
    const studentId = p.studentId || '';
    const parts = name.trim().split(/\s+/);
    const surname = parts.length > 1 ? parts.pop() : '';
    const firstName = parts.join(' ') || surname;
    const row = [firstName, surname, studentId];

    includedSemesters.forEach(([year, sem]) => {
      const key = year + '|' + sem;
      const codes = semCourses[key] || [];
      const saved = (p.semData || {})[dept + '|' + key] || [];
      const preset = presets[key] || [];
      const elect = electives[key] || [];
      const presetSorted = [...preset].sort((a, b) => b[1] - a[1]);

      // Build map: courseCode -> { credits, grade }
      const savedMap = {};
      // Presets
      presetSorted.forEach(([fullName, cr]) => {
        const code = getCourseCode(fullName);
        const entry = saved[presetSorted.indexOf([fullName, cr])] || { grade: '', credits: 0 };
        savedMap[code] = {
          credits: entry.credits || 0,
          grade: entry.grade || ''
        };
      });
      // Electives
      elect.forEach((fullName, j) => {
        const code = getCourseCode(fullName);
        const idx = presetSorted.length + j;
        const entry = saved[idx] || { grade: '', credits: 3 };
        savedMap[code] = {
          credits: entry.credits || 3,
          grade: entry.grade || ''
        };
      });
      // Retakes
      const baseCount = presetSorted.length + elect.length;
      for (let i = baseCount; i < saved.length; i++) {
        const extra = saved[i];
        if (extra && extra.retake && extra.name) {
          const code = getCourseCode(extra.name);
          savedMap[code] = {
            credits: extra.credits || 3,
            grade: extra.grade || ''
          };
        }
      }

      // Fill course columns (in the order of codes)
      codes.forEach(code => {
        const info = savedMap[code];
        if (info && info.grade && info.grade !== 'SKIP') {
          const grade = info.grade;
          const points = GRADE_POINTS[grade] || 0;
          const weighted = (points * info.credits).toFixed(1);
          row.push(grade);
          row.push(weighted);
        } else {
          row.push('');
          row.push('');
        }
      });

      // Semester GPA (if the semester is saved for this profile)
      const semGPA = (p.semHistory && p.semHistory[key]) ? p.semHistory[key].gpa.toFixed(2) : '';
      row.push(semGPA);
    });

    // Cumulative GPA
    const cum = computeCumulative(p);
    row.push(cum ? cum.val : '—');
    rows.push(row);
  });

  // Generate CSV
  let csvContent = '';
  const escape = (val) => {
    if (val == null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  csvContent += header.map(escape).join(',') + '\n';
  rows.forEach(row => {
    csvContent += row.map(escape).join(',') + '\n';
  });

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GPA_Wide_${dept}_Profiles.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Exported ${profileIds.length} profile(s) for ${dept} (course codes only) ✓`);
}

// ── Inject the "📊 Excel (Wide)" button ──────────────────────

function injectWideExcelButton() {
  const existingRow = document.getElementById('gpaEiRow');
  if (!existingRow) {
    setTimeout(injectWideExcelButton, 300);
    return;
  }
  if (document.getElementById('gpaWideExcelBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'gpaWideExcelBtn';
  btn.className = 'gpa-ei-btn';
  btn.textContent = '📊 Excel (Wide)';
  btn.onclick = exportAllProfilesToWideExcel;
  btn.style.cssText = 'border-color: #2a6a3a; color: #80c080;';
  existingRow.appendChild(btn);
}

document.addEventListener('DOMContentLoaded', injectWideExcelButton);