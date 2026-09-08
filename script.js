/* ==========================================================================
   LATIHAN TIK — AYO MENYALIN TEKS (SLB INSAN MADANI METRO)
   ========================================================================== */

// SUPABASE CONFIGURATION
const SUPABASE_URL = "https://wdvvpgzenpkqchgeatnd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SkveRAK4SAbZJltckam3Qw_G_9x5vzF";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// PIN GURU LOKAL
const TEACHER_PIN = "242456";

// 1. DATA MATERI LATIHAN TERKUNCI (PACKAGE A, B, C)
const MATERIAL_PACKAGES = {
  A: [
    { code: "A1", text: "Abu vulkanik dapat mengganggu pernapasan. Gunakan masker saat berada di luar rumah." },
    { code: "A2", text: "Abu vulkanik dapat mengenai mata. Gunakan pelindung mata saat berada di luar rumah." },
    { code: "A3", text: "Kita perlu menjaga kesehatan saat ada abu vulkanik. Gunakan masker untuk melindungi pernapasan." },
    { code: "A4", text: "Abu vulkanik dapat menyebar ke beberapa wilayah. Kurangi kegiatan di luar rumah jika abu meningkat." },
    { code: "A5", text: "Abu vulkanik dapat mengotori air dan makanan. Tutup air dan makanan agar tetap bersih." }
  ],
  B: [
    { code: "B1", text: "Abu vulkanik dapat mengganggu pernapasan. Gunakan masker saat berada di luar rumah. Gunakan pelindung mata jika abu banyak." },
    { code: "B2", text: "Abu vulkanik dapat mengenai mata dan kulit. Gunakan pelindung saat berada di luar rumah. Kurangi kegiatan di luar rumah jika abu meningkat." },
    { code: "B3", text: "Abu vulkanik dapat menyebar ke beberapa wilayah. Gunakan masker untuk melindungi pernapasan. Tutup air dan makanan agar tidak terkena abu." },
    { code: "B4", text: "Erupsi Gunung Anak Krakatau masih dipantau. Abu vulkanik dapat terbawa angin. Masyarakat perlu mengikuti informasi resmi." }
  ],
  C: [
    { code: "C1", text: "Gunung Anak Krakatau sedang mengalami erupsi. Erupsi menghasilkan abu vulkanik yang dapat menyebar. Abu vulkanik dapat mengganggu pernapasan. Gunakan masker saat berada di luar rumah. Gunakan pelindung mata ketika abu meningkat. Kurangi kegiatan di luar rumah dan ikuti informasi resmi." },
    { code: "C2", text: "Abu vulkanik Gunung Anak Krakatau terpantau di beberapa wilayah. Sebaran abu dapat berubah mengikuti arah angin. Abu dapat mengenai mata dan saluran pernapasan. Gunakan masker dan pelindung mata saat berada di luar. Tutup makanan dan sumber air agar tidak terkena abu. Tetap tenang dan ikuti informasi dari pihak berwenang." }
  ]
};

// 2. STATE SISTEM & SESI AKTIF
let studentsList = [];
let exerciseResultsHistory = [];

let activeSession = {
  student: null,
  date: "",
  packageCode: "A",
  material: null,
  primaryAssessment: null,
  retryAssessment: null,
  isRetryMode: false
};

// 3. INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  loadDataFromSupabase();
});

/* ==========================================================================
   SUPABASE DATA LOADING & MAPPING
   ========================================================================== */
async function loadDataFromSupabase() {
  try {
    // Ambil data siswa dari Supabase
    const { data: students, error: studentError } =
      await supabaseClient
        .from("students")
        .select("*")
        .order("name", { ascending: true });

    if (studentError) throw studentError;

    studentsList = (students || []).map(student => ({
      id: String(student.id),
      name: student.name,
      profile: student.profile || "A"
    }));

    // Ambil histori hasil belajar dari Supabase
    const { data: results, error: resultError } =
      await supabaseClient
        .from("results")
        .select("*")
        .order("id", { ascending: false });

    if (resultError) throw resultError;

    // Konversi format Supabase menjadi format yang digunakan Menu Guru.
    exerciseResultsHistory = (results || []).map(r => {
      const main = r.main_result || {};
      const retry = r.retry_result || null;

      return {
        id: String(r.id),
        studentId: String(r.student_id),
        studentName: r.student_name || "-",
        date: r.date || "-",
        class: "SMPLB - SMALB",

        profile: r.package
          ? String(r.package).charAt(0)
          : "A",

        materialCode: r.package || "-",

        totalSentences: Number(main.totalSentences || 0),

        primaryResult:
          `${Number(main.correctCount || 0)}/${Number(main.totalSentences || 0)}`,

        retryResult: retry
          ? `${Number(retry.correctCount || 0)}/${Number(retry.totalSentences || 0)}`
          : "-",

        details: Array.isArray(main.details)
          ? main.details
          : [],

        retryDetails: retry && Array.isArray(retry.details)
          ? retry.details
          : null
      };
    });

    console.log("Supabase terhubung.");
    console.log("Jumlah siswa:", studentsList.length);
    console.log("Jumlah histori:", exerciseResultsHistory.length);

    populateAbsensiDropdown();
    renderTeacherTables();

  } catch (error) {
    console.error("Gagal mengambil data Supabase:", error);
    alert("Database belum dapat dihubungkan. Periksa koneksi Supabase.");
  }
}

/* ==========================================================================
   NAVIGASI DAN ALUR PANEL
   ========================================================================== */
function navigateTo(panelId) {
  document.querySelectorAll(".view-panel").forEach(panel => {
    panel.classList.remove("active");
  });

  const targetPanel = document.getElementById(panelId);
  if (targetPanel) {
    targetPanel.classList.add("active");
  }

  const appViewport = document.getElementById("app-viewport");
  if (panelId === "view-ketik" || panelId === "view-hasil") {
    appViewport.classList.add("desktop-wide-view");
  } else {
    appViewport.classList.remove("desktop-wide-view");
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==========================================================================
   ABSENSI SISWA
   ========================================================================== */
function populateAbsensiDropdown() {
  const selectEl = document.getElementById("student-select");
  const emptyMsgEl = document.getElementById("absensi-empty-msg");
  const btnStartEl = document.getElementById("btn-start-session");
  const detailsEl = document.getElementById("absensi-details");

  if (!selectEl) return;

  selectEl.innerHTML = '<option value="">-- Pilih Nama --</option>';

  if (!studentsList || studentsList.length === 0) {
    if (emptyMsgEl) emptyMsgEl.classList.remove("hidden");
    selectEl.disabled = true;
    if (btnStartEl) btnStartEl.disabled = true;
    if (detailsEl) detailsEl.classList.add("hidden");
    return;
  }

  if (emptyMsgEl) emptyMsgEl.classList.add("hidden");
  selectEl.disabled = false;

  studentsList.forEach(st => {
    const opt = document.createElement("option");
    opt.value = st.id;
    opt.textContent = st.name;
    selectEl.appendChild(opt);
  });

  selectEl.value = "";
  if (btnStartEl) btnStartEl.disabled = true;
  if (detailsEl) detailsEl.classList.add("hidden");
}

function handleStudentSelect() {
  const selectEl = document.getElementById("student-select");
  const btnStartEl = document.getElementById("btn-start-session");
  const detailsEl = document.getElementById("absensi-details");
  const dateEl = document.getElementById("absensi-date");

  if (selectEl.value) {
    const student = studentsList.find(s => s.id === selectEl.value);
    if (student) {
      const todayDate = new Date().toISOString().split('T')[0];

      if (dateEl) dateEl.textContent = todayDate;
      activeSession.student = student;
      activeSession.date = todayDate;

      if (detailsEl) detailsEl.classList.remove("hidden");
      if (btnStartEl) btnStartEl.disabled = false;
      return;
    }
  }

  if (detailsEl) detailsEl.classList.add("hidden");
  if (btnStartEl) btnStartEl.disabled = true;
}

function startExerciseSession() {
  if (!activeSession.student) return;

  activeSession.isRetryMode = false;
  activeSession.primaryAssessment = null;
  activeSession.retryAssessment = null;
  const typingInput = document.getElementById("typing-input");
  if (typingInput) typingInput.value = "";

  const profile = activeSession.student.profile || "A";
  activeSession.packageCode = profile;

  const pack = MATERIAL_PACKAGES[profile] || MATERIAL_PACKAGES["A"];
  const randomIndex = Math.floor(Math.random() * pack.length);
  activeSession.material = pack[randomIndex];

  const displayReadingText = document.getElementById("display-reading-text");
  const referenceText = document.getElementById("reference-text");

  if (displayReadingText) displayReadingText.textContent = activeSession.material.text;
  if (referenceText) referenceText.textContent = activeSession.material.text;

  navigateTo("view-baca");
}

/* ==========================================================================
   EVALUASI TEKS & NORMALISASI MENGETIK
   ========================================================================== */
function getSentencesArray(text) {
  if (!text) return [];
  return text
    .split(".")
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s + ".");
}

function normalizeText(text) {
  if (!text) return "";
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForComparison(text) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .trim();
}

function checkTypingAnswer() {
  const userRawInput = document.getElementById("typing-input").value;
  const userCleanInput = normalizeText(userRawInput);

  if (!userCleanInput) {
    alert("Silakan ketik teks terlebih dahulu.");
    return;
  }

  const targetSentences = getSentencesArray(activeSession.material.text);
  const userSentences = getSentencesArray(userCleanInput);

  let feedbackDetails = [];
  let correctCount = 0;

  targetSentences.forEach((target, index) => {
    const userTyped = userSentences[index] || "";
    
    const isExactMatch = normalizeText(target).toLowerCase() === normalizeText(userTyped).toLowerCase();
    const isNoPunctuationMatch = normalizeForComparison(target) === normalizeForComparison(userTyped);

    let status = "partial";
    if (isExactMatch) {
      status = "correct";
      correctCount++;
    } else if (isNoPunctuationMatch) {
      status = "partial";
    }

    feedbackDetails.push({
      index: index + 1,
      isCorrect: status === "correct",
      targetText: target,
      userText: userTyped
    });
  });

  const assessmentResult = {
    totalSentences: targetSentences.length,
    correctCount: correctCount,
    needsImprovementCount: targetSentences.length - correctCount,
    details: feedbackDetails
  };

  if (!activeSession.isRetryMode) {
    activeSession.primaryAssessment = assessmentResult;
  } else {
    activeSession.retryAssessment = assessmentResult;
  }

  saveSessionRecord();
  renderResultsView();
  navigateTo("view-hasil");
}

/* ==========================================================================
   HASIL LATIHAN
   ========================================================================== */
function renderResultsView() {
  document.getElementById("res-nama").textContent = activeSession.student.name;
  document.getElementById("res-tanggal").textContent = activeSession.date;

  const primary = activeSession.primaryAssessment;
  renderFeedbackList("primary-feedback-list", primary.details);

  const retrySectionEl = document.getElementById("retry-result-section");
  if (activeSession.retryAssessment) {
    if (retrySectionEl) retrySectionEl.classList.remove("hidden");
    renderFeedbackList("retry-feedback-list", activeSession.retryAssessment.details);
  } else {
    if (retrySectionEl) retrySectionEl.classList.add("hidden");
  }

  const currentAss = activeSession.retryAssessment || activeSession.primaryAssessment;
  const motivationEl = document.getElementById("res-motivation-text");

  if (motivationEl) {
    if (currentAss.correctCount === currentAss.totalSentences) {
      motivationEl.textContent = "🎉 Bagus sekali! Kamu sudah menyalin seluruh teks dengan sangat teliti dan rapi. Pertahankan ya!";
    } else {
      motivationEl.textContent = "😊 Bagus! Kamu sudah berusaha dengan baik. Coba perhatikan kembali bagian yang perlu diperbaiki agar semakin rapi.";
    }
  }
}

function renderFeedbackList(containerId, details) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  details.forEach(item => {
    const div = document.createElement("div");
    div.className = `feedback-item ${item.isCorrect ? 'feedback-correct' : 'feedback-partial'}`;

    const statusText = item.isCorrect 
      ? `🟢 Kalimat ${item.index} — Benar` 
      : `🟡 Kalimat ${item.index} — Perlu diperbaiki`;

    div.innerHTML = `
      <div class="feedback-status">${statusText}</div>
      <div class="feedback-target">"${item.targetText}"</div>
    `;

    container.appendChild(div);
  });
}

async function saveSessionRecord() {
  const payload = {
    student_id: activeSession.student.id,
    student_name: activeSession.student.name,
    date: activeSession.date,
    package: activeSession.material.code,
    main_result: activeSession.primaryAssessment,
    retry_result: activeSession.retryAssessment
  };

  try {
    const { data, error } = await supabaseClient
      .from("results")
      .insert([payload]);

    if (error) throw error;
    console.log("Berhasil menyimpan hasil ke Supabase:", data);
    
    // Refresh data dari database
    await loadDataFromSupabase();
  } catch (err) {
    console.error("Gagal menyimpan hasil ke Supabase:", err);
  }
}

function startRetrySession() {
  activeSession.isRetryMode = true;
  const typingInput = document.getElementById("typing-input");
  if (typingInput) typingInput.value = "";
  navigateTo("view-ketik");
}

function finishSessionAndReset() {
  activeSession = {
    student: null,
    date: "",
    packageCode: "A",
    material: null,
    primaryAssessment: null,
    retryAssessment: null,
    isRetryMode: false
  };

  populateAbsensiDropdown();
  navigateTo("view-home");
}

/* ==========================================================================
   KEAMANAN PIN & MENU GURU
   ========================================================================== */
function promptTeacherPin() {
  const pinInput = document.getElementById("pin-input");
  if (pinInput) pinInput.value = "";
  const errEl = document.getElementById("pin-error-msg");
  if (errEl) errEl.classList.add("hidden");
  
  const modalPin = document.getElementById("modal-pin");
  if (modalPin) modalPin.classList.remove("hidden");
  
  setTimeout(() => {
    if (pinInput) pinInput.focus();
  }, 100);
}

function handlePinSubmit(event) {
  if (event) event.preventDefault();
  
  const pinInput = document.getElementById("pin-input");
  const inputPin = pinInput ? pinInput.value.trim() : "";
  
  if (inputPin === TEACHER_PIN) {
    const modalPin = document.getElementById("modal-pin");
    if (modalPin) modalPin.classList.add("hidden");
    navigateTo("view-guru");
  } else {
    const errorMsg = document.getElementById("pin-error-msg");
    if (errorMsg) errorMsg.classList.remove("hidden");
    if (pinInput) {
      pinInput.value = "";
      pinInput.focus();
    }
  }
}

function closePinModal() {
  const modalPin = document.getElementById("modal-pin");
  if (modalPin) modalPin.classList.add("hidden");
}

function switchTeacherTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));

  if (tabName === 'students') {
    const btnSt = document.getElementById("tab-btn-students");
    const tabSt = document.getElementById("teacher-tab-students");
    if (btnSt) btnSt.classList.add("active");
    if (tabSt) tabSt.classList.add("active");
  } else {
    const btnRes = document.getElementById("tab-btn-results");
    const tabRes = document.getElementById("teacher-tab-results");
    if (btnRes) btnRes.classList.add("active");
    if (tabRes) tabRes.classList.add("active");
  }
}

function renderTeacherTables() {
  // 1. DATA SISWA
  const studentBody = document.getElementById("student-table-body");
  if (studentBody) {
    studentBody.innerHTML = "";

    if (!studentsList || studentsList.length === 0) {
      studentBody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--text-muted)">Belum ada data siswa.</td></tr>`;
    } else {
      studentsList.forEach(s => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${s.name}</strong></td>
          <td>Profil ${s.profile}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="editStudent('${s.id}')">✏️ Edit</button>
            <button class="btn btn-secondary btn-sm" style="color:var(--danger-red)" onclick="deleteStudent('${s.id}')">🗑️ Hapus</button>
          </td>
        `;
        studentBody.appendChild(tr);
      });
    }
  }

  // 2. HISTORI HASIL BELAJAR
  const resultsBody = document.getElementById("results-table-body");
  if (resultsBody) {
    resultsBody.innerHTML = "";

    if (!exerciseResultsHistory || exerciseResultsHistory.length === 0) {
      resultsBody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-muted)">Belum ada histori hasil belajar.</td></tr>`;
    } else {
      exerciseResultsHistory.forEach((r, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${r.date}</td>
          <td><strong>${r.studentName}</strong></td>
          <td>${r.totalSentences} Kalimat</td>
          <td><span style="color:var(--success-green); font-weight:bold">${r.primaryResult}</span> Benar</td>
          <td>${r.retryResult !== '-' ? `<span style="color:var(--primary-purple); font-weight:bold">${r.retryResult}</span> Benar` : '-'}</td>
          <td>
            <div class="action-btn-group">
              <button class="btn btn-secondary btn-sm" onclick="viewHistoryDetail(${idx})">👁️</button>
              <button class="btn btn-secondary btn-sm" onclick="openHistoryEdit(${idx})">✏️</button>
              <button class="btn btn-secondary btn-sm" style="color:var(--danger-red)" onclick="deleteHistoryRecord(${idx})">🗑️</button>
            </div>
          </td>
        `;
        resultsBody.appendChild(tr);
      });
    }
  }
}

/* SISWA CRUD */
function openStudentForm() {
  document.getElementById("form-title").textContent = "Tambah Siswa Baru";
  document.getElementById("edit-student-id").value = "";
  document.getElementById("input-student-name").value = "";
  document.getElementById("input-student-profile").value = "A";
  document.getElementById("student-form-box").classList.remove("hidden");
  document.getElementById("input-student-name").focus();
}

function closeStudentForm() {
  document.getElementById("student-form-box").classList.add("hidden");
}

async function saveStudentData() {
  const id = document.getElementById("edit-student-id").value;
  const name = document.getElementById("input-student-name").value.trim();
  const profile = document.getElementById("input-student-profile").value;

  if (!name) {
    alert("Nama siswa tidak boleh kosong.");
    return;
  }

  try {
    if (id) {
      const { error } = await supabaseClient
        .from("students")
        .update({ name, profile })
        .eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient
        .from("students")
        .insert([{ name, profile }]);
      if (error) throw error;
    }

    await loadDataFromSupabase();
    closeStudentForm();
  } catch (err) {
    console.error("Gagal menyimpan data siswa ke Supabase:", err);
    alert("Gagal menyimpan data siswa.");
  }
}

function editStudent(id) {
  const student = studentsList.find(s => s.id === id);
  if (!student) return;

  document.getElementById("form-title").textContent = "Edit Data Siswa";
  document.getElementById("edit-student-id").value = student.id;
  document.getElementById("input-student-name").value = student.name;
  document.getElementById("input-student-profile").value = student.profile;
  document.getElementById("student-form-box").classList.remove("hidden");
}

async function deleteStudent(id) {
  const student = studentsList.find(s => s.id === id);
  if (!student) return;

  if (confirm(`Apakah Anda yakin ingin menghapus siswa "${student.name}"?\n(Riwayat hasil belajar siswa ini akan tetap ada).`)) {
    try {
      const { error } = await supabaseClient
        .from("students")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await loadDataFromSupabase();
    } catch (err) {
      console.error("Gagal menghapus siswa:", err);
      alert("Gagal menghapus data siswa.");
    }
  }
}

/* HISTORI CRUD & DETAIL */
function viewHistoryDetail(index) {
  const record = exerciseResultsHistory[index];
  if (!record) return;

  const contentEl = document.getElementById("modal-detail-content");
  let primaryDetailsHtml = "";
  if (record.details) {
    record.details.forEach(item => {
      primaryDetailsHtml += `<p style="margin-bottom:6px;">${item.isCorrect ? '🟢' : '🟡'} <strong>Kalimat ${item.index}:</strong> "${item.targetText}"</p>`;
    });
  }

  if (contentEl) {
    contentEl.innerHTML = `
      <p><strong>Nama:</strong> ${record.studentName}</p>
      <p><strong>Tanggal:</strong> ${record.date}</p>
      <p><strong>Penilaian Utama:</strong> ${record.primaryResult}</p>
      <p><strong>Latihan Perbaikan:</strong> ${record.retryResult}</p>
      <hr style="margin:12px 0; border:0; border-top:1px solid #DFE6E9;">
      <h4 style="color:var(--primary-purple); margin-bottom:8px;">Rincian Kalimat:</h4>
      ${primaryDetailsHtml}
    `;
  }

  const modalDetail = document.getElementById("modal-detail");
  if (modalDetail) modalDetail.classList.remove("hidden");
}

function closeDetailModal() {
  const modalDetail = document.getElementById("modal-detail");
  if (modalDetail) modalDetail.classList.add("hidden");
}

function openHistoryEdit(index) {
  const record = exerciseResultsHistory[index];
  if (!record) return;

  document.getElementById("edit-history-id").value = record.id;
  document.getElementById("edit-history-student").value = record.studentName;
  document.getElementById("edit-history-primary").value = record.primaryResult;
  document.getElementById("edit-history-retry").value = record.retryResult;

  document.getElementById("history-edit-box").classList.remove("hidden");
}

function closeHistoryEdit() {
  document.getElementById("history-edit-box").classList.add("hidden");
}

async function saveHistoryEdit() {
  const recordId = document.getElementById("edit-history-id").value;
  const newPrimaryStr = document.getElementById("edit-history-primary").value.trim();
  const newRetryStr = document.getElementById("edit-history-retry").value.trim();

  const record = exerciseResultsHistory.find(r => r.id === recordId);
  if (!record) return;

  // Parse hasil perbaikan / penilaian utama sederhana
  const parseResult = (str, fallbackTotal) => {
    const parts = str.split('/');
    if (parts.length === 2) {
      return { correctCount: parseInt(parts[0]) || 0, totalSentences: parseInt(parts[1]) || fallbackTotal };
    }
    return null;
  };

  const updatedMain = parseResult(newPrimaryStr, record.totalSentences);
  const updatedRetry = newRetryStr !== '-' ? parseResult(newRetryStr, record.totalSentences) : null;

  try {
    const updatePayload = {};
    if (updatedMain) {
      updatePayload.main_result = {
        totalSentences: updatedMain.totalSentences,
        correctCount: updatedMain.correctCount,
        needsImprovementCount: updatedMain.totalSentences - updatedMain.correctCount,
        details: record.details
      };
    }
    if (updatedRetry !== undefined) {
      updatePayload.retry_result = updatedRetry ? {
        totalSentences: updatedRetry.totalSentences,
        correctCount: updatedRetry.correctCount,
        needsImprovementCount: updatedRetry.totalSentences - updatedRetry.correctCount,
        details: record.retryDetails || []
      } : null;
    }

    const { error } = await supabaseClient
      .from("results")
      .update(updatePayload)
      .eq("id", recordId);

    if (error) throw error;

    await loadDataFromSupabase();
    closeHistoryEdit();
  } catch (err) {
    console.error("Gagal mengedit histori:", err);
    alert("Gagal menyimpan perubahan histori.");
  }
}

async function deleteHistoryRecord(index) {
  const record = exerciseResultsHistory[index];
  if (!record) return;

  if (confirm("Apakah Anda yakin ingin menghapus histori hasil belajar ini?")) {
    try {
      const { error } = await supabaseClient
        .from("results")
        .delete()
        .eq("id", record.id);

      if (error) throw error;
      await loadDataFromSupabase();
    } catch (err) {
      console.error("Gagal menghapus histori:", err);
      alert("Gagal menghapus histori hasil belajar.");
    }
  }
}
