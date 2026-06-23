// ── grade systems ─────────────────────────────────────────────
const GRADES = [
  "AA","BA+","BA","BB+","BB","CB+","CB","CC+","CC","DC+","DC","DD+","DD",
  "FD","FF",
  "A1","A2","B1","B2","C1","C2*","D1*","D2*","F3","F2","F1",
  "G","K","H","M","SKIP"
];
const GRADE_POINTS = {
  AA: 4.0,
  "BA+": 3.75,
  BA: 3.5,
  "BB+": 3.25,
  BB: 3.0,
  "CB+": 2.75,
  CB: 2.5,
  "CC+": 2.25,
  CC: 2.0,
  "DC+": 1.75,
  DC: 1.5,
  "DD+": 1.25,
  DD: 1.0,
  FD: 0.5,
  FF: 0.0,
  A1: 4.0,
  A2: 3.5,
  B1: 3.0,
  B2: 2.5,
  C1: 2.0,
  "C2*": 1.5,
  "D1*": 1.0,
  "D2*": 0.5,
  F3: 0.0,
  F2: 0.0,
  F1: 0.0,
  G: 0.0,
  K: 0.0,
  H: 0.0,
  M: 0.0,
};
const ZERO_CR_GRADES = ["S","U","SKIP"];

const DEPT_GRADE_CODES = {
  CNGB: ["AA","BA","BB","CB","CC","DC","DD","FD","FF","SKIP"],
  IENG: ["AA","BA+","BA","BB+","BB","CB+","CB","CC+","CC","DC+","DC","DD+","DD","FF","SKIP"],
  FE: ["A1","A2","B1","B2","C1","C2*","D1*","D2*","F3","F2","F1","G","K","H","M","SKIP"],
};
function getGradeCodesForDept(){ return DEPT_GRADE_CODES[activeDept] || DEPT_GRADE_CODES.CNGB; }

const SEM_ORDER = [
  ["Year 1","Fall"],["Year 1","Spring"],
  ["Year 2","Fall"],["Year 2","Spring"],
  ["Year 3","Fall"],["Year 3","Spring"],
  ["Year 4","Fall"],["Year 4","Spring"],
];

// ── CNGB course data ──────────────────────────────────────────
const CNGB_PRESETS = {
  "Year 1|Fall": [
    ["PHYS 105 · General Physics I",4],
    ["MATH 119 · Calculus with Analytic Geometry",5],
    ["BIOL 109 · Intro to Molecular Biology",3],
    ["CNGB 100 · Computer Engineering Orientation",0],
    ["CNGB 111 · Intro to Computer Eng. Concepts",4],
    ["ENG 101 · English for Academic Purposes I",4],
    ["OHS 101 · Occupational Health and Safety I",0],
    ["IS 100 · Intro to Information Technologies",0],
  ],
  "Year 1|Spring": [
    ["PHYS 106 · General Physics II",4],
    ["MATH 120 · Calculus of Several Variables",5],
    ["MATH 260 · Basic Linear Algebra",3],
    ["BA 100 · Career Planning",0],
    ["CNGB 140 · C Programming",4],
    ["ENG 102 · English for Academic Purposes II",4],
  ],
  "Year 2|Fall": [
    ["MATH 219 · Differential Equations",4],
    ["HIST 2205 · History of the Turkish Revolution I",0],
    ["EE 281 · Electrical Circuits",4],
    ["CNGB 213 · Data Structures",4],
    ["CNGB 223 · Discrete Computational Structures",3],
    ["ENG 211 · Academic Speaking Skills",3],
  ],
  "Year 2|Spring": [
    ["HIST 2206 · History of the Turkish Revolution II",0],
    ["CNGB 222 · Statistical Methods",3],
    ["CNGB 232 · Logic Design",4],
    ["CNGB 242 · Programming Language Concepts",4],
    ["CNGB 280 · Formal Languages & Abstract Machines",3],
  ],
  "Year 3|Fall": [
    ["CNGB 300 · Summer Practice I",0],
    ["CNGB 315 · Algorithms",3],
    ["CNGB 331 · Computer Organization",3],
    ["CNGB 351 · Data Management & File Structures",3],
    ["TURK 105 · Turkish I",0],
    ["OHS 301 · Occupational Health and Safety II",0],
  ],
  "Year 3|Spring": [
    ["CNGB 334 · Intro to Operating Systems",3],
    ["CNGB 336 · Intro to Embedded Systems",3],
    ["CNGB 350 · Software Engineering",3],
    ["CNGB 384 · Signals and Systems",3],
    ["TURK 106 · Turkish II",0],
  ],
  "Year 4|Fall": [
    ["CNGB 400 · Summer Practice II",0],
    ["CNGB 435 · Data Communications and Networking",3],
    ["CNGB 477 · Intro to Computer Graphics",3],
    ["CNGB 491 · Computer Engineering Design I",4],
  ],
  "Year 4|Spring": [
    ["CNGB 492 · Computer Engineering Design II",4],
  ],
};
const CNGB_ELECTIVES = {
  "Year 2|Spring": ["Nontechnical Elective"],
  "Year 3|Fall":   ["Restricted Elective","Nontechnical Elective"],
  "Year 3|Spring": ["Nontechnical Elective"],
  "Year 4|Fall":   ["Technical Elective 1","Technical Elective 2"],
  "Year 4|Spring": ["Free Elective","Technical Elective 1","Technical Elective 2","Technical Elective 3"],
};

// ── IENG course data ──────────────────────────────────────────
const IENG_PRESETS = {
  "Year 1|Fall": [
    ["IEB 113E · Intro to Industrial Eng. & Ethics",2],
    ["FIZ 101E · Physics I",3],
    ["FIZ 101EL · Physics I Laboratory",1],
    ["BIL 100E · Intro to Programming (Python)",2],
    ["MAT 103E · Mathematics I",4],
    ["TUR 121 · Türk Dili I",0],
    ["ING 100 · EAP Through Global Goals",3],
    ["ATA 121 · Atatürk İlk & İnkılap Tarihi I",0],
  ],
  "Year 1|Spring": [
    ["FIZ 102E · Physics II",3],
    ["FIZ 102EL · Physics II Laboratory",1],
    ["KIM 101E · General Chemistry I",3],
    ["KIM 101EL · General Chemistry I Lab",1],
    ["IEB 112E · Intro to Manufacturing Systems",3],
    ["MAT 104E · Mathematics II",4],
    ["DAN 102 · Girişimcilik & Kariyer Danışmanlığı",0],
    ["ING 112A · Basics of Academic Writing",2],
  ],
  "Year 2|Fall": [
    ["IEB 213E · Data Manag. in Industrial Syst.",3],
    ["IEB 210E · Linear Algebra for Industrial Eng.",3],
    ["EKO 201E · Economics",3],
    ["IEB 215E · System Thinking and Analysis",2],
    ["IEB 252E · Theory of Probability",3],
    ["ING 201A · Essentials of Research Paper Writing",2],
  ],
  "Year 2|Spring": [
    ["MEK 205E · Engineering Mechanics",3],
    ["IEB 232E · Ergonomics",3],
    ["IEB 311E · Statistics",3],
    ["IEB 331E · Operations Research I",3],
    ["IEB 201E · Industrial Engineering Applications in Python",2],
    ["HUK 201 · İş Hukuku",3],
  ],
  "Year 3|Fall": [
    ["IEB 341E · Work Analysis and Design",3],
    ["IEB 421E · Production Planning & Control",3],
    ["IEB 332E · Operations Research II",3],
    ["IEB 305E · Data Analytics for Business",3],
  ],
  "Year 3|Spring": [
    ["IEB 312E · Engineering Economics",3],
    ["IEB 322E · System Simulation",3],
    ["IEB 308E · Quality Engineering",2],
  ],
  "Year 4|Fall": [
    ["IEB 4901E · Industrial Engineering Design I",4],
    ["IEB 411E · Integrated Manufacturing Systems",2],
    ["IEB 431E · Management and Organization",3],
    ["IEB 449 · End. Müh. Uyg. Seminer Dersi",0],
  ],
  "Year 4|Spring": [
    ["IEB 412E · Principles of Human Resources Management",3],
    ["IEB 4902E · Industrial Engineering Design II",4],
    ["ATA 122 · Atatürk İlk & İnkılap Tarihi II",0],
    ["TUR 122 · Türk Dili II",0],
  ],
};
const IENG_ELECTIVES = {
  "Year 3|Fall":   ["5th Sem Elective (Functional)","5th Sem Elective (Analytical)"],
  "Year 3|Spring": ["6th Sem Elective (Functional)","6th Sem Elective (Analytical)","6th Sem Elective (ITB)"],
  "Year 4|Fall":   ["7th Sem Elective (Functional)","7th Sem Elective (Analytical)"],
  "Year 4|Spring": ["8th Sem Elective (Functional)","8th Sem Elective (Analytical)"],
};

// ── FE course data ────────────────────────────────────────────
const FE_PRESETS = {
  "Year 1|Fall": [
    ["KIM 147 · General Chemistry", 4],
    ["KIM 119 · General Chemistry Lab. I", 1],
    ["MAT 123 · Mathematics I", 5],
    ["FIZ 137 · Physics I", 4],
    ["FIZ 117 · General Physics Lab.", 1],
    ["BEB 650 · Basic Information and Communication Technologies", 1],
    ["ING 111 · Integrated Skills I", 3],
    ["TRK 117 · Basic Turkish I", 2],
    ["FED 101 · Introduction to Food Engineering", 2],
  ],

  "Year 1|Spring": [
    ["FED 100 · Career Planning", 1],
    ["KIM 355 · Organic Chemistry", 4],
    ["MAT 124 · Mathematics II", 5],
    ["FIZ 138 · Physics II", 4],
    ["FED 104 · Programming with Python for Engineers", 3],
    ["FED 106 · Biology", 2],
    ["ING 112 · Integrated Skills II", 3],
    ["TRK 118 · Basic Turkish II", 2],
  ],

  "Year 2|Fall": [
    ["FED 215 · General Microbiology", 3],
    ["FED 225 · General Microbiology Lab.", 1],
    ["FED 235 · Material and Energy Balances", 4],
    ["FED 231 · Engineering Mathematics", 4],
    ["FED 205 · Food Chemistry", 5],
    ["FED 206 · Food Chemistry Laboratory", 1],
    ["AIT 203 · History of Turkish Revolution and Atatürk’s Principles I", 2],
    ["MUH 103 · Occupational Health and Safety I", 1],
  ],

  "Year 2|Spring": [
    ["FED 242 · Fluid Mechanics", 3],
    ["FED 248 · Food Microbiology", 3],
    ["FED 254 · Food Microbiology Lab.", 1],
    ["FED 210 · Instrumental Analysis", 4],
    ["IST 292 · Statistic", 3],
    ["FED 268 · Chemical Reaction Engineering", 3],
    ["AIT 204 · History of Turkish Revolution and Atatürk’s Principles II", 2],
    ["MUH 104 · Occupational Health and Safety II", 1],
  ],

  "Year 3|Fall": [
    ["FED 313 · Heat Transfer", 3],
    ["FED 319 · Engineering Thermodynamics", 3],
    ["FED 321 · Mass Transfer", 3],
  ],

  "Year 3|Spring": [
    ["FED 311 · Unit Operations in Food Engineering", 4],
    ["FED 378 · Unit Operations in Food Engineering Lab.", 1],
    ["FED 370 · Food Technology", 5],
    ["FED 320 · Food Technology Lab.", 2],
  ],

  "Year 4|Fall": [
    ["FED 467 · Food Safety and Legislation", 3],
    ["FED 445 · Food Engineering Plant Design", 4],
    ["MUH 401 · Multi-Disciplined Project Work", 1],
  ],

  "Year 4|Spring": [
    ["FED 438 · Training", 4],
    ["FED 440 · Graduation Project", 1],
  ],
};
const FE_ELECTIVES = {};

// ── helpers ───────────────────────────────────────────────────
let activeDept = 'CNGB';
function getCoursePresets(){ return activeDept==='IENG'?IENG_PRESETS:activeDept==='FE'?FE_PRESETS:CNGB_PRESETS; }
function getElectivePresets(){ return activeDept==='IENG'?IENG_ELECTIVES:activeDept==='FE'?FE_ELECTIVES:CNGB_ELECTIVES; }