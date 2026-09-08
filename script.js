/* ==========================================================================
   SALINTEKS V1.3 LOCAL - SCRIPT LOGIC TERINTEGRASI DATABASE SUPABASE
   ========================================================================== */

// 1. KONSTANTA & STORAGE KEYS
const STORAGE_KEY_STUDENTS = "tik_students_data";
const STORAGE_KEY_HISTORY = "tik_results_history";
const TEACHER_PIN = "242456";

// 2. SUPABASE CONFIGURATION (MENGGUNAKAN PUBLISHABLE ANON KEY)
const SUPABASE_URL = "https://wdvvpgzenpkqchgeatnd.supabase.co"; // URL Supabase Anda
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SkveRAK4SAbZJltckam3Qw_G_9x5vzF"; // Public Anon Key Anda

let supabaseClient = null;
if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

// 3. STRUKTUR MATERIAL TEKS PAKET A, B, DAN C
const MATERIAL_PACKAGES = {
  // PAKET A — TINGKAT MUDAH (1 Teks, Target Huruf Kapital A-Z)
  A: [
    {
      id: "A1",
      sentences: ["ABCDEFGHIJKLMNOPQRSTUVWXYZ"]
    }
  ],

  // PAKET B — TINGKAT SEDANG (Minimal 2 Teks Latihan, Masing-masing 2-3 Kalimat)
  B: [
    {
      id: "B1",
      sentences: [
        "abu vulkanik dapat mengganggu pernapasan.",
        "gunakan masker saat berada di luar rumah.",
       ]
    },
    {
      id: "B2",
      sentences: [
        "abu vulkanik dapat terbawa angin.",
        "gunakan pelindung mata jika abu banyak."
      ]
    }
  ],

  // PAKET C — TINGKAT LEBIH SULIT (Minimal 2 Teks Latihan, Masing-masing 3 Kalimat)
  C: [
    {
      id: "C1",
      sentences: [
        "gunung anak krakatau sedang mengalami erupsi.",
        "abu vulkanik dapat mengganggu pernapasan.",
        "gunakan masker saat berada di luar rumah."
      ]
    },
    {
      id: "C2",
      sentences: [
        "abu vulkanik terpantau di beberapa wilayah.",
        "sebaran abu dapat berubah mengikuti arah angin.",
        "gunakan masker dan pelindung mata saat di luar."
      ]
    }
  ]
};

// 4. INITIAL DEFAULT DATA SISWA
const DEFAULT_STUDENTS = [
  { id: "std_1", name: "Rizky Tabah", profile: "A" },
  { id: "std_2", name: "Siti Rahma", profile: "B" },
  { id: "std_3", name: "Ahmad Dani", profile: "C" }
];

// 5. STATE APLIKASI ACTIVE
let currentSession = {
  studentId: null,
  studentName: "",
  profile: "A",
  date: "",
  targetSentences: [],
  isRetry: false,
  mainResultRecord: null
};

// ==========================================
// INISIALISASI & KONEKSI SUPABASE
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  initStorageFallback();
  await loadDataFromDatabase();
  renderStudentDropdown();
  setCurrentDate();
  setupTextLockProtections();
  setupEditorAutoUppercase();

  const pinInput = document.getElementById("input-pin-guru");
  if (pinInput) {
    pinInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        validateTeacherPin();
      }
    });
  }

  switchScreen("screen-menu-utama");
});

function initStorageFallback() {
  if (!localStorage.getItem(STORAGE_KEY_STUDENTS)) {
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(DEFAULT_STUDENTS));
  }
  if (!localStorage.getItem(STORAGE_KEY_HISTORY)) {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify([]));
  }
}

async function loadDataFromDatabase() {
  if (!supabaseClient) return;

  try {
    // Sync Data Siswa
    const { data: dbStudents, error: stdError } = await supabaseClient
      .from("students")
      .select("*")
      .order("name", { ascending: true });

    if (!stdError && dbStudents && dbStudents.length > 0) {
      const formatted = dbStudents.map(s => ({
        id: String(s.id),
        name: s.name,
        profile: s.profile || "A"
      }));
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(formatted));
    }

    // Sync Data Histori
    const { data: dbResults, error: resError } = await supabaseClient
      .from("results")
      .select("*")
      .order("id", { ascending: false });

    if (!resError && dbResults) {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(dbResults));
    }
  } catch (err) {
    console.warn("Gagal sinkronisasi Supabase. Menggunakan LocalStorage:", err);
  }
}

function getStudents() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
}

function saveStudentsLocal(data) {
  localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(data));
}

function getHistory() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY)) || [];
}

function saveHistoryLocal(data) {
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(data));
}

function setCurrentDate() {
  const today = new Date();
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  const dateStr = today.toLocaleDateString('id-ID', options);
  const inputDate = document.getElementById("input-tanggal");
  if (inputDate) inputDate.value = dateStr;
  currentSession.date = dateStr;
}

// ==========================================
// PROTEKSI PENGUNCIAN TEKS SUMBER
// ==========================================
function setupTextLockProtections() {
  const targetTextDisplay = document.getElementById("target-text-display");
  const readingTextDisplay = document.getElementById("baca-teks-content");

  const lockElements = [targetTextDisplay, readingTextDisplay];

  lockElements.forEach(el => {
    if (!el) return;

    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("copy", (e) => e.preventDefault());
    el.addEventListener("cut", (e) => e.preventDefault());
    el.addEventListener("dragstart", (e) => e.preventDefault());
    el.addEventListener("drop", (e) => e.preventDefault());
  });
}

// ==========================================
// AUTOMATIC UPPERCASE KHUSUS PAKET A
// ==========================================
function setupEditorAutoUppercase() {
  const editor = document.getElementById("typing-editor");
  if (!editor) return;

  editor.addEventListener("input", () => {
    if (currentSession.profile === "A") {
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      const startOffset = range ? range.startOffset : 0;

      const upperText = editor.innerText.toUpperCase();
      if (editor.innerText !== upperText) {
        editor.innerText = upperText;

        try {
          const newRange = document.createRange();
          const textNode = editor.firstChild || editor;
          const maxLen = textNode.length || 0;
          newRange.setStart(textNode, Math.min(startOffset, maxLen));
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch (err) {
          const newRange = document.createRange();
          newRange.selectNodeContents(editor);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }
  });
}

// ==========================================
// KONTROL NAVIGASI SCREEN
// ==========================================
function switchScreen(screenId) {
  const allScreens = document.querySelectorAll(".view-panel");
  allScreens.forEach(s => s.classList.remove("active"));

  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add("active");
    window.scrollTo(0, 0);
  }

  if (screenId === "screen-ayo-mengetik") {
    document.body.classList.add("screen-docuslate-active");
  } else {
    document.body.classList.remove("screen-docuslate-active");
  }
}

function renderStudentDropdown() {
  const select = document.getElementById("select-siswa");
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Nama Siswa --</option>';
  const students = getStudents();
  students.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
}

// ==========================================
// ALUR SEKUENSIS BELAJAR
// ==========================================
function startSession() {
  const studentId = document.getElementById("select-siswa").value;
  if (!studentId) {
    alert("Silakan pilih nama siswa terlebih dahulu!");
    return;
  }

  const students = getStudents();
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  currentSession.studentId = student.id;
  currentSession.studentName = student.name;
  currentSession.profile = student.profile || "A";
  currentSession.isRetry = false;
  currentSession.mainResultRecord = null;

  document.body.classList.remove("package-a-active", "package-c-active");
  if (currentSession.profile === "A") {
    document.body.classList.add("package-a-active");
  } else if (currentSession.profile === "C") {
    document.body.classList.add("package-c-active");
  }

  const packageList = MATERIAL_PACKAGES[currentSession.profile] || MATERIAL_PACKAGES["A"];
  const randomIndex = Math.floor(Math.random() * packageList.length);
  const selectedMaterial = packageList[randomIndex];
  
  currentSession.targetSentences = selectedMaterial.sentences;

  const previewBox = document.getElementById("baca-teks-content");
  previewBox.textContent = currentSession.targetSentences.join("\n");

  switchScreen("screen-baca-teks");
}

function goToMengetik() {
  document.getElementById("ds-student-name").textContent = currentSession.studentName;
  document.getElementById("ds-date").textContent = currentSession.date;

  const targetDisplay = document.getElementById("target-text-display");
  targetDisplay.textContent = currentSession.targetSentences.join("\n");

  const editor = document.getElementById("typing-editor");
  editor.innerHTML = "";

  switchScreen("screen-ayo-mengetik");
}

// ==========================================
// TOOLBAR MINI DOCUSLATE
// ==========================================
function executeDocCommand(cmd) {
  document.execCommand(cmd, false, null);
  const editor = document.getElementById("typing-editor");
  if (editor) editor.focus();
}

function changeFontSize(delta) {
  const editor = document.getElementById("typing-editor");
  const currentSize = window.getComputedStyle(editor).fontSize;
  let newSize = parseFloat(currentSize) + (delta * 2);
  if (newSize >= 14 && newSize <= 32) {
    editor.style.fontSize = newSize + "px";
  }
}

// ==========================================
// LOGIKA PENILAIAN & AKUMULASI HASIL SUPABASE
// ==========================================
function normalizeText(str) {
  if (!str) return "";
  return str.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

async function checkTypingResult() {
  const editor = document.getElementById("typing-editor");
  let userRawInput = editor.innerText || editor.textContent || "";
  
  if (currentSession.profile === "A") {
    userRawInput = userRawInput.toUpperCase();
  }

  const normalizedUser = normalizeText(userRawInput);

  if (!normalizedUser) {
    alert("Area mengetik masih kosong. Silakan ketik kalimat terlebih dahulu!");
    return;
  }

  const targets = currentSession.targetSentences;
  let correctCount = 0;
  let wrongCount = 0;
  let sentenceEvaluations = [];
  let remainingUserText = normalizedUser;

  targets.forEach((targetSentence, idx) => {
    const normTarget = normalizeText(targetSentence);
    if (remainingUserText.includes(normTarget)) {
      correctCount++;
      sentenceEvaluations.push({ index: idx + 1, target: targetSentence, isCorrect: true });
      remainingUserText = remainingUserText.replace(normTarget, "").trim();
    } else {
      wrongCount++;
      sentenceEvaluations.push({ index: idx + 1, target: targetSentence, isCorrect: false });
    }
  });

  const recordPayload = {
    id: (currentSession.isRetry ? "hist_retry_" : "hist_") + Date.now(),
    date: currentSession.date,
    studentName: currentSession.studentName,
    studentId: currentSession.studentId,
    sessionType: currentSession.isRetry ? "PERBAIKAN (RETRY)" : "UTAMA",
    correct: correctCount,
    total: targets.length,
    details: sentenceEvaluations
  };

  const history = getHistory();
  history.push(recordPayload);
  saveHistoryLocal(history);

  if (supabaseClient) {
    try {
      await supabaseClient.from("results").insert([{
        student_id: currentSession.studentId,
        student_name: currentSession.studentName,
        date: new Date().toISOString().split("T")[0],
        session_type: recordPayload.sessionType,
        correct_count: correctCount,
        total_count: targets.length,
        details_json: sentenceEvaluations
      }]);
    } catch (dbErr) {
      console.warn("Gagal menyimpan ke Supabase (Tersimpan di LocalStorage):", dbErr);
    }
  }

  renderResultScreen(correctCount, wrongCount, sentenceEvaluations);
  switchScreen("screen-hasil-latihan");
}

function renderResultScreen(correct, wrong, evaluations) {
  document.getElementById("res-nama").textContent = currentSession.studentName;
  document.getElementById("res-tanggal").textContent = currentSession.date;
  
  const statusPill = document.getElementById("res-status-pill");
  if (currentSession.isRetry) {
    statusPill.textContent = "HASIL LATIHAN PERBAIKAN";
    statusPill.style.backgroundColor = "var(--warning-yellow)";
  } else {
    statusPill.textContent = "HASIL PENILAIAN UTAMA";
    statusPill.style.backgroundColor = "var(--primary-purple)";
  }

  const listContainer = document.getElementById("result-sentences-list");
  listContainer.innerHTML = "";

  evaluations.forEach(item => {
    const div = document.createElement("div");
    div.className = `sentence-item ${item.isCorrect ? 'correct' : 'wrong'}`;
    div.innerHTML = `
      <div class="sentence-header">
        <span>Kalimat ${item.index}</span>
        <span>${item.isCorrect ? '✓ BENAR' : '⚠️ PERLU DIPERBAIKI'}</span>
      </div>
      <div class="sentence-text">${item.target}</div>
    `;
    listContainer.appendChild(div);
  });

  const motivationBox = document.getElementById("res-motivation-text");
  if (wrong === 0) {
    motivationBox.textContent = "🎉 Bagus sekali! Kamu sudah menyalin seluruh teks dengan sangat teliti dan rapi. Pertahankan ya!";
  } else if (correct > 0) {
    motivationBox.textContent = "😊 Bagus! Kamu sudah berusaha dengan baik. Coba perhatikan kembali bagian yang perlu diperbaiki agar semakin rapi.";
  } else {
    motivationBox.textContent = "💪 TETAP SEMANGAT! Mari kita latihan lagi perlahan-lahan ya.";
  }
}

function retryExercise() {
  currentSession.isRetry = true;
  goToMengetik();
}

function finishSession() {
  document.body.classList.remove("package-a-active", "package-c-active");
  currentSession = {
    studentId: null,
    studentName: "",
    profile: "A",
    date: currentSession.date,
    targetSentences: [],
    isRetry: false,
    mainResultRecord: null
  };
  switchScreen("screen-menu-utama");
}

// ==========================================
// MENU GURU & MODAL PIN
// ==========================================
function openTeacherPinModal() {
  const pinInput = document.getElementById("input-pin-guru");
  const errorMsg = document.getElementById("pin-error-msg");
  if (pinInput) pinInput.value = "";
  if (errorMsg) errorMsg.classList.add("hidden");
  
  const modal = document.getElementById("modal-pin");
  if (modal) modal.classList.remove("hidden");
  
  setTimeout(() => { if (pinInput) pinInput.focus(); }, 100);
}

function closeTeacherPinModal() {
  const modal = document.getElementById("modal-pin");
  const errorMsg = document.getElementById("pin-error-msg");
  const pinInput = document.getElementById("input-pin-guru");

  if (errorMsg) errorMsg.classList.add("hidden");
  if (pinInput) pinInput.value = "";
  if (modal) modal.classList.add("hidden");
}

function validateTeacherPin() {
  const pinInput = document.getElementById("input-pin-guru");
  const errorMsg = document.getElementById("pin-error-msg");
  const inputPin = pinInput ? pinInput.value.trim() : "";

  if (inputPin === TEACHER_PIN) {
    closeTeacherPinModal();
    renderTeacherData();
    switchScreen("screen-menu-guru");
  } else {
    if (errorMsg) errorMsg.classList.remove("hidden");
    if (pinInput) {
      pinInput.value = "";
      pinInput.focus();
    }
  }
}

function switchTeacherTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

  if (tab === 'siswa') {
    document.getElementById("tab-btn-siswa").classList.add("active");
    document.getElementById("teacher-tab-siswa").classList.add("active");
  } else {
    document.getElementById("tab-btn-histori").classList.add("active");
    document.getElementById("teacher-tab-histori").classList.add("active");
  }
}

function renderTeacherData() {
  const studentTbody = document.getElementById("student-table-body");
  studentTbody.innerHTML = "";
  const students = getStudents();

  students.forEach((s, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${s.name}</strong> (Profil ${s.profile})</td>
      <td>
        <button class="btn btn-secondary btn-sm" style="color:var(--danger-red)" onclick="deleteStudent('${s.id}')">🗑️ Hapus</button>
      </td>
    `;
    studentTbody.appendChild(tr);
  });

  const historyTbody = document.getElementById("history-table-body");
  historyTbody.innerHTML = "";
  const history = getHistory();

  if (history.length === 0) {
    historyTbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:var(--text-muted)">Belum ada histori latihan.</td></tr>';
  } else {
    const reversedHistory = [...history].reverse();
    reversedHistory.forEach((h) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${h.date}</td>
        <td>${h.studentName}</td>
        <td><small>${h.sessionType || 'UTAMA'}</small></td>
        <td><strong>${h.correct} / ${h.total}</strong></td>
        <td>
          <button class="btn btn-secondary btn-sm" style="color:var(--danger-red)" onclick="deleteHistoryItem('${h.id}')">🗑️ Hapus</button>
        </td>
      `;
      historyTbody.appendChild(tr);
    });
  }
}

async function addNewStudent() {
  const nameInput = document.getElementById("add-student-name");
  const profileSelect = document.getElementById("add-student-profile");
  const name = nameInput.value.trim();
  const profile = profileSelect.value;

  if (!name) {
    alert("Masukkan nama siswa terlebih dahulu!");
    return;
  }

  const newStudent = {
    id: "std_" + Date.now(),
    name: name,
    profile: profile
  };

  const students = getStudents();
  students.push(newStudent);
  saveStudentsLocal(students);

  if (supabaseClient) {
    try {
      await supabaseClient.from("students").insert([{ name: name, profile: profile }]);
    } catch (e) {
      console.warn("Gagal simpan ke DB:", e);
    }
  }

  nameInput.value = "";
  renderStudentDropdown();
  renderTeacherData();
}

async function deleteStudent(id) {
  if (confirm("Apakah Anda yakin ingin menghapus data siswa ini?")) {
    let students = getStudents();
    const targetStudent = students.find(s => s.id === id);
    students = students.filter(s => s.id !== id);
    saveStudentsLocal(students);

    if (supabaseClient && targetStudent) {
      try {
        await supabaseClient.from("students").delete().eq("name", targetStudent.name);
      } catch (e) {
        console.warn("Gagal hapus dari DB:", e);
      }
    }

    renderStudentDropdown();
    renderTeacherData();
  }
}

function deleteHistoryItem(id) {
  if (confirm("Hapus catatan histori ini?")) {
    let history = getHistory();
    history = history.filter(h => h.id !== id);
    saveHistoryLocal(history);
    renderTeacherData();
  }
}

function clearHistory() {
  if (confirm("Apakah Anda yakin ingin MENGHAPUS SELURUH HISTORI pembelajaran?")) {
    saveHistoryLocal([]);
    renderTeacherData();
  }
}
