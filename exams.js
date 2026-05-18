// ══════════════════════════════════════════════════════════════
//  SISTEMA DE EXÁMENES — Electrotecnia
// ══════════════════════════════════════════════════════════════

// ── STATE ─────────────────────────────────────────────────────
let currentExamId     = null;
let currentQuestionId = null;
let examQCache        = [];   // preguntas del examen actual (admin o alumno)
let takingExam        = null; // examen que el alumno está rindiendo
let examTimerRef      = null;
let examSecondsLeft   = 0;

// ── ADMIN: LISTA DE EXÁMENES ──────────────────────────────────
async function loadAdminExams() {
  const { data } = await db
    .from('exams')
    .select('*, exam_questions(count)')
    .order('created_at', { ascending: false });
  renderAdminExams(data || []);
  loadAdminResults();
}

function renderAdminExams(list) {
  const el = document.getElementById('adminExamsList');
  if (!list.length) {
    el.innerHTML = `<div style="text-align:center;padding:48px;color:var(--gray-500)">
      <i class="fas fa-clipboard" style="font-size:40px;opacity:.3;display:block;margin-bottom:16px"></i>
      No hay exámenes creados todavía.
    </div>`;
    return;
  }
  el.innerHTML = list.map(exam => {
    const examUnitIds = exam.unit_ids
      ? (Array.isArray(exam.unit_ids) ? exam.unit_ids : JSON.parse(exam.unit_ids || '[]'))
      : (exam.unit_id ? [exam.unit_id] : []);
    const unitNames = examUnitIds
      .map(uid => liveUnits.find(u => u.id === uid))
      .filter(Boolean)
      .map(u => `U${u.id}: ${u.title}`)
      .join(' + ') || '—';
    const qCount = exam.exam_questions?.[0]?.count || 0;
    return `
    <div style="background:white;border-radius:12px;padding:20px;margin-bottom:12px;box-shadow:var(--shadow);
      ${exam.is_practice ? 'border-left:4px solid var(--success)' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
            <span class="score-badge ${exam.is_active ? 'score-high' : 'score-low'}" style="font-size:11px">
              ${exam.is_active ? '● ACTIVO' : '○ INACTIVO'}
            </span>
            ${exam.is_practice ? '<span class="score-badge" style="font-size:11px;background:#d1fae5;color:#065f46">📝 PRÁCTICA</span>' : ''}
            <strong>${exam.title}</strong>
          </div>
          <p style="font-size:13px;color:var(--gray-500)">
            ${unitNames} &nbsp;·&nbsp;
            ${exam.time_limit || 60} min &nbsp;·&nbsp;
            ${qCount} pregunta${qCount != 1 ? 's' : ''}
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;align-items:center">
          <button class="btn btn-ghost btn-sm" title="Descargar para imprimir"
            onclick="downloadExamPDF('${exam.id}')">
            <i class="fas fa-print"></i> Imprimir
          </button>
          <button class="btn btn-outline btn-sm" onclick="openEditExam('${exam.id}')">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn btn-sm ${exam.is_active ? 'btn-danger' : 'btn-success'}"
            onclick="toggleExamActive('${exam.id}',${exam.is_active})">
            <i class="fas fa-${exam.is_active ? 'stop-circle' : 'play-circle'}"></i>
            ${exam.is_active ? 'Deshabilitar' : 'Habilitar'}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── ADMIN: CREAR / EDITAR EXAMEN ──────────────────────────────
function openCreateExam() {
  currentExamId = null;
  document.getElementById('examFormTitle').textContent = 'Nuevo examen';
  document.getElementById('fExamTitle').value          = '';
  document.getElementById('fExamTime').value           = 60;
  document.getElementById('fExamInstr').value          = '';
  document.getElementById('fExamPractice').checked     = false;
  document.getElementById('examFormAlert').innerHTML   = '';
  document.getElementById('examQSection').style.display = 'none';
  document.getElementById('examQList').innerHTML       = '';
  renderUnitCheckboxes([]);
  openModal('modalExam');
}

async function openEditExam(examId) {
  const { data: exam } = await db.from('exams').select('*').eq('id', examId).single();
  if (!exam) return;
  currentExamId = examId;
  document.getElementById('examFormTitle').textContent = 'Editar examen';
  document.getElementById('fExamTitle').value  = exam.title;
  document.getElementById('fExamTime').value       = exam.time_limit || 60;
  document.getElementById('fExamInstr').value      = exam.instructions || '';
  document.getElementById('fExamPractice').checked = exam.is_practice || false;
  document.getElementById('examFormAlert').innerHTML = '';
  document.getElementById('examQSection').style.display = 'block';
  const savedUnitIds = exam.unit_ids
    ? (Array.isArray(exam.unit_ids) ? exam.unit_ids : JSON.parse(exam.unit_ids || '[]'))
    : (exam.unit_id ? [exam.unit_id] : []);
  renderUnitCheckboxes(savedUnitIds);
  await loadExamQuestionsAdmin(examId);
  openModal('modalExam');
}

function renderUnitCheckboxes(selectedIds = []) {
  const container = document.getElementById('examUnitsCheckboxes');
  if (!container) return;
  const sorted = [...liveUnits].sort((a, b) => a.id - b.id);
  if (!sorted.length) {
    container.innerHTML = '<p style="color:var(--gray-500);font-size:13px;padding:4px">No hay unidades creadas.</p>';
    return;
  }
  container.innerHTML = sorted.map(u => `
    <label style="display:flex;align-items:center;gap:8px;padding:5px 6px;cursor:pointer;border-radius:6px"
      onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'">
      <input type="checkbox" value="${u.id}" ${selectedIds.includes(u.id) ? 'checked' : ''}
        style="width:15px;height:15px;accent-color:var(--primary);cursor:pointer;flex-shrink:0" />
      <span style="font-size:13px"><strong>U${u.id}</strong> — ${u.title}</span>
    </label>`).join('');
}

function getSelectedUnitIds() {
  return [...document.querySelectorAll('#examUnitsCheckboxes input[type="checkbox"]:checked')]
    .map(cb => parseInt(cb.value));
}

async function saveExam() {
  const title    = document.getElementById('fExamTitle').value.trim();
  const unit_ids = getSelectedUnitIds();
  const unit_id  = unit_ids[0] || null;
  const time_lim = parseInt(document.getElementById('fExamTime').value) || 60;
  const instr    = document.getElementById('fExamInstr').value.trim();

  if (!title) { showAlert('examFormAlert', 'El título es obligatorio.', 'danger'); return; }

  const is_practice = document.getElementById('fExamPractice').checked;
  const payload = { title, unit_id, unit_ids: JSON.stringify(unit_ids), time_limit: time_lim, instructions: instr, is_practice };

  if (currentExamId) {
    const { error } = await db.from('exams').update(payload).eq('id', currentExamId);
    if (error) { showAlert('examFormAlert', error.message, 'danger'); return; }
  } else {
    const { data, error } = await db.from('exams').insert([payload]).select().single();
    if (error) { showAlert('examFormAlert', error.message, 'danger'); return; }
    currentExamId = data.id;
  }

  document.getElementById('examQSection').style.display = 'block';
  await loadExamQuestionsAdmin(currentExamId);
  showAlert('examFormAlert', 'Examen guardado. Ahora agregá las preguntas.', 'success');
  loadAdminExams();
}

async function toggleExamActive(examId, current) {
  const { error } = await db.from('exams').update({ is_active: !current }).eq('id', examId);
  if (error) { toast(`Error: ${error.message}`); return; }
  toast(!current ? '¡Examen habilitado! Los alumnos ya pueden rendirlo.' : 'Examen deshabilitado.');
  loadAdminExams();
}

async function deleteCurrentExam() {
  if (!currentExamId) return;
  if (!confirm('¿Eliminar este examen y todas sus preguntas?')) return;
  const { error } = await db.from('exams').delete().eq('id', currentExamId);
  if (error) { toast(`Error: ${error.message}`); return; }
  closeModal('modalExam');
  loadAdminExams();
  toast('Examen eliminado.');
}

// ── ADMIN: PREGUNTAS ──────────────────────────────────────────
async function loadExamQuestionsAdmin(examId) {
  const { data } = await db
    .from('exam_questions').select('*')
    .eq('exam_id', examId).order('order_num');
  examQCache = data || [];
  renderAdminQuestions(examQCache);
}

function renderAdminQuestions(list) {
  const el = document.getElementById('examQList');
  if (!list.length) {
    el.innerHTML = '<p style="color:var(--gray-500);font-size:13px;text-align:center;padding:16px 0">Sin preguntas todavía.</p>';
    return;
  }
  el.innerHTML = list.map((q, i) => {
    const typeLabel = { multiple_choice: 'Múltiple opción', true_false: 'V / F', short_answer: 'Respuesta corta' }[q.type];
    return `
    <div style="background:var(--gray-100);border-radius:8px;padding:12px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start">
      <div style="flex:1">
        <span style="font-size:11px;color:var(--primary);font-weight:700;text-transform:uppercase">
          ${typeLabel} · ${q.points} pt</span>
        <p style="font-size:14px;margin-top:3px">${i+1}. ${q.question_text}</p>
      </div>
      <div style="display:flex;gap:4px;margin-left:12px;flex-shrink:0">
        <button class="btn btn-ghost btn-sm" onclick="openEditQuestion('${q.id}')">
          <i class="fas fa-edit"></i></button>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteQuestion('${q.id}')">
          <i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

function openAddQuestion() {
  if (!currentExamId) { toast('Guardá el examen primero.'); return; }
  currentQuestionId = null;
  document.getElementById('qFormTitle').textContent    = 'Agregar pregunta';
  document.getElementById('fQText').value              = '';
  document.getElementById('fQType').value              = 'multiple_choice';
  document.getElementById('fQPoints').value            = 1;
  document.getElementById('fOptA').value               = '';
  document.getElementById('fOptB').value               = '';
  document.getElementById('fOptC').value               = '';
  document.getElementById('fOptD').value               = '';
  document.getElementById('fCorrectMC').value          = 'A';
  document.getElementById('fCorrectTF').value          = 'Verdadero';
  document.getElementById('questionAlert').innerHTML   = '';
  onQuestionTypeChange();
  openModal('modalQuestion');
}

async function openEditQuestion(qId) {
  const q = examQCache.find(x => x.id === qId);
  if (!q) return;
  currentQuestionId = qId;
  document.getElementById('qFormTitle').textContent = 'Editar pregunta';
  document.getElementById('fQText').value   = q.question_text;
  document.getElementById('fQType').value   = q.type;
  document.getElementById('fQPoints').value = q.points;

  if (q.type === 'multiple_choice') {
    const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
    document.getElementById('fOptA').value = opts[0] || '';
    document.getElementById('fOptB').value = opts[1] || '';
    document.getElementById('fOptC').value = opts[2] || '';
    document.getElementById('fOptD').value = opts[3] || '';
    // Determine which letter matches correct_answer
    const letter = ['A','B','C','D'][opts.indexOf(q.correct_answer)] || 'A';
    document.getElementById('fCorrectMC').value = letter;
  }
  if (q.type === 'true_false') {
    document.getElementById('fCorrectTF').value = q.correct_answer;
  }
  document.getElementById('questionAlert').innerHTML = '';
  onQuestionTypeChange();
  openModal('modalQuestion');
}

function onQuestionTypeChange() {
  const t = document.getElementById('fQType').value;
  document.getElementById('mcBlock').style.display    = t === 'multiple_choice' ? 'block' : 'none';
  document.getElementById('tfBlock').style.display    = t === 'true_false'       ? 'block' : 'none';
  document.getElementById('shortBlock').style.display = t === 'short_answer'     ? 'block' : 'none';
}

async function saveQuestion() {
  const text   = document.getElementById('fQText').value.trim();
  const type   = document.getElementById('fQType').value;
  const points = parseFloat(document.getElementById('fQPoints').value) || 1;
  if (!text) { showAlert('questionAlert', 'El texto es obligatorio.', 'danger'); return; }

  let options = null, correct_answer = '';

  if (type === 'multiple_choice') {
    const opts = [
      document.getElementById('fOptA').value.trim(),
      document.getElementById('fOptB').value.trim(),
      document.getElementById('fOptC').value.trim(),
      document.getElementById('fOptD').value.trim(),
    ];
    if (opts.some(o => !o)) { showAlert('questionAlert', 'Completá las 4 opciones.', 'danger'); return; }
    options = JSON.stringify(opts);
    const letter = document.getElementById('fCorrectMC').value;
    correct_answer = opts['ABCD'.indexOf(letter)];
  } else if (type === 'true_false') {
    options = JSON.stringify(['Verdadero', 'Falso']);
    correct_answer = document.getElementById('fCorrectTF').value;
  } else {
    correct_answer = 'REVISAR';
  }

  const order_num = currentQuestionId
    ? (examQCache.find(q => q.id === currentQuestionId)?.order_num ?? 0)
    : examQCache.length;

  const payload = {
    exam_id: currentExamId, question_text: text,
    type, options, correct_answer, points, order_num
  };

  if (currentQuestionId) {
    const { error } = await db.from('exam_questions').update(payload).eq('id', currentQuestionId);
    if (error) { showAlert('questionAlert', error.message, 'danger'); return; }
  } else {
    const { error } = await db.from('exam_questions').insert([payload]);
    if (error) { showAlert('questionAlert', error.message, 'danger'); return; }
  }

  closeModal('modalQuestion');
  await loadExamQuestionsAdmin(currentExamId);
  loadAdminExams();
  toast('Pregunta guardada.');
}

async function deleteQuestion(qId) {
  if (!confirm('¿Eliminar esta pregunta?')) return;
  await db.from('exam_questions').delete().eq('id', qId);
  await loadExamQuestionsAdmin(currentExamId);
  loadAdminExams();
  toast('Pregunta eliminada.');
}

// ── ADMIN: RESULTADOS Y CORRECCIÓN ───────────────────────────
let adminResultsCache = [];
let currentResultId   = null;
let reviewData        = { autoScore: 0, totalPts: 0, shortQIds: [] };

async function loadAdminResults() {
  const { data } = await db
    .from('exam_results')
    .select('*, students(full_name, dni), exams(title)')
    .order('taken_at', { ascending: false })
    .limit(200);
  adminResultsCache = data || [];
  renderAdminResults(adminResultsCache);
}

function renderAdminResults(list) {
  const el = document.getElementById('adminResultsList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<p style="color:var(--gray-500);font-size:14px;text-align:center;padding:32px">
      Todavía no hay evaluaciones entregadas.
    </p>`;
    return;
  }

  const pending = list.filter(r => r.score === null);
  const graded  = list.filter(r => r.score !== null);
  const ordered = [...pending, ...graded];

  let html = '';
  if (pending.length) {
    html += `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;
      padding:10px 16px;margin-bottom:16px;font-size:13px;color:#92400e">
      <i class="fas fa-clock"></i>
      <strong> ${pending.length} evaluación${pending.length > 1 ? 'es' : ''} pendiente${pending.length > 1 ? 's' : ''} de corrección</strong>
    </div>`;
  }

  html += `<div class="table-wrap"><table>
    <thead><tr>
      <th>Alumno</th><th>Evaluación</th><th>Fecha</th><th>Nota</th><th>Estado</th><th></th>
    </tr></thead>
    <tbody>${ordered.map(r => {
      const s   = r.score;
      const cls = s === null ? 'score-mid' : s >= 7 ? 'score-high' : s >= 5 ? 'score-mid' : 'score-low';
      const lbl = s === null ? 'Pendiente' : s >= 7 ? 'Aprobado' : s >= 5 ? 'Regular' : 'Desaprobado';
      return `<tr>
        <td>
          <strong>${r.students?.full_name || '—'}</strong>
          <br><span style="font-size:11px;color:var(--gray-500)">DNI: ${r.students?.dni || '—'}</span>
        </td>
        <td>${r.exams?.title || '—'}</td>
        <td>${new Date(r.taken_at).toLocaleDateString('es-AR')}</td>
        <td><strong>${s !== null ? s + '/10' : '—'}</strong></td>
        <td><span class="score-badge ${cls}">${lbl}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openReviewExam('${r.id}')">
            <i class="fas fa-eye"></i> Ver
          </button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;

  el.innerHTML = html;
}

async function openReviewExam(resultId) {
  currentResultId = resultId;
  const result = adminResultsCache.find(r => r.id === resultId);
  if (!result) return;

  const { data: questions } = await db
    .from('exam_questions').select('*')
    .eq('exam_id', result.exam_id).order('order_num');

  const answers = result.answers
    ? (typeof result.answers === 'string' ? JSON.parse(result.answers) : result.answers)
    : {};

  document.getElementById('reviewExamStudentName').textContent =
    result.students?.full_name || '—';
  document.getElementById('reviewExamTitle').textContent =
    result.exams?.title || '—';
  document.getElementById('reviewExamDate').textContent =
    new Date(result.taken_at).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' });

  let autoScore = 0, totalPts = 0;
  const shortQIds = [];

  const body = document.getElementById('reviewExamBody');
  body.innerHTML = (questions || []).map((q, i) => {
    const pts  = parseFloat(q.points) || 1;
    totalPts  += pts;
    const opts = q.options
      ? (Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'))
      : [];
    const studentAnswer = answers[q.id] || '';
    let answersHtml = '';

    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      const isCorrect = studentAnswer === q.correct_answer;
      if (isCorrect) autoScore += pts;

      answersHtml = opts.map(opt => {
        const isStudent  = opt === studentAnswer;
        const isCorrectO = opt === q.correct_answer;
        let bg = 'var(--gray-100)', border = 'var(--gray-200)', color = 'var(--gray-700)';
        if (isStudent && isCorrect)  { bg = '#d1fae5'; border = '#10b981'; color = '#065f46'; }
        if (isStudent && !isCorrect) { bg = '#fee2e2'; border = '#ef4444'; color = '#991b1b'; }
        if (!isStudent && isCorrectO){ bg = '#d1fae5'; border = '#10b981'; color = '#065f46'; }
        const icon = isStudent ? (isCorrect ? '✓' : '✗') : (isCorrectO && !isStudent ? '✓' : '○');
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:6px;
          margin-bottom:4px;border:1.5px solid ${border};background:${bg};color:${color};font-size:13px">
          <strong style="min-width:14px">${icon}</strong> ${opt}
          ${!isStudent && isCorrectO ? '<span style="margin-left:auto;font-size:11px;font-weight:700">← Correcta</span>' : ''}
        </div>`;
      }).join('');
      answersHtml += `<p style="font-size:12px;font-weight:700;margin-top:6px;color:${isCorrect ? 'var(--success)' : 'var(--danger)'}">
        ${isCorrect ? `✓ Correcto — ${pts} punto${pts !== 1 ? 's' : ''}` : `✗ Incorrecto — 0 puntos`}
      </p>`;

    } else {
      shortQIds.push(q.id);
      answersHtml = `
        <div style="background:var(--gray-100);border-left:3px solid var(--primary);
          border-radius:0 8px 8px 0;padding:12px 14px;margin-bottom:10px">
          <p style="font-size:11px;font-weight:700;color:var(--gray-500);margin-bottom:4px">RESPUESTA DEL ALUMNO</p>
          ${studentAnswer
            ? `<p style="font-size:14px;line-height:1.7;white-space:pre-line">${studentAnswer}</p>`
            : '<p style="color:var(--gray-400);font-style:italic">Sin respuesta</p>'}
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <label style="font-size:13px;font-weight:600;white-space:nowrap">Puntaje (0–${pts}):</label>
          <input type="number" id="short_pts_${q.id}" class="form-control"
            min="0" max="${pts}" step="0.5" value="0" style="width:80px"
            oninput="recalcReviewScore()" />
          <span style="font-size:12px;color:var(--gray-500)">de ${pts} punto${pts !== 1 ? 's' : ''}</span>
        </div>`;
    }

    return `
    <div style="background:white;border-radius:10px;padding:16px 18px;margin-bottom:12px;box-shadow:var(--shadow)">
      <p style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;
        letter-spacing:.04em;margin-bottom:6px">
        Pregunta ${i + 1} &nbsp;·&nbsp; ${pts} punto${pts !== 1 ? 's' : ''}
      </p>
      <p style="font-size:15px;font-weight:600;margin-bottom:12px">${q.question_text}</p>
      ${answersHtml}
    </div>`;
  }).join('');

  reviewData = { autoScore, totalPts, shortQIds };
  document.getElementById('reviewAutoScore').textContent = autoScore.toFixed(1);
  document.getElementById('reviewTotalPts').textContent  = totalPts.toFixed(1);
  document.getElementById('reviewShortAnswerNote').style.display = shortQIds.length ? 'block' : 'none';

  recalcReviewScore();
  openModal('modalReviewExam');
}

function recalcReviewScore() {
  const { autoScore, totalPts, shortQIds } = reviewData;
  let shortPts = 0;
  shortQIds.forEach(qId => {
    shortPts += parseFloat(document.getElementById(`short_pts_${qId}`)?.value) || 0;
  });
  const score = totalPts > 0
    ? Math.min(10, parseFloat(((autoScore + shortPts) / totalPts * 10).toFixed(1)))
    : 0;
  document.getElementById('reviewFinalScore').value = score;
}

async function saveExamGrade() {
  const score = parseFloat(document.getElementById('reviewFinalScore').value);
  if (isNaN(score) || score < 0 || score > 10) {
    toast('La nota debe estar entre 0 y 10.'); return;
  }
  const { error } = await db
    .from('exam_results').update({ score }).eq('id', currentResultId);
  if (error) { toast(`Error: ${error.message}`); return; }
  closeModal('modalReviewExam');
  await loadAdminResults();
  if (typeof loadStudentExams === 'function') loadStudentExams();
  toast('Nota guardada correctamente.');
}

// ── ADMIN: GENERACIÓN CON IA ──────────────────────────────────
let aiGeneratedQuestions = [];

async function generateExamWithAI() {
  if (!currentExamId) { toast('Guardá el examen primero.'); return; }

  const mcCount    = parseInt(document.getElementById('aiMcCount').value)    || 0;
  const tfCount    = parseInt(document.getElementById('aiTfCount').value)    || 0;
  const shortCount = parseInt(document.getElementById('aiShortCount').value) || 0;

  if (mcCount + tfCount + shortCount === 0) {
    showAlert('examFormAlert', 'Especificá al menos 1 pregunta.', 'danger'); return;
  }

  const statusEl  = document.getElementById('aiGenerationStatus');
  const previewEl = document.getElementById('aiPreview');
  statusEl.innerHTML = '<span style="color:var(--primary)"><i class="fas fa-circle-notch fa-spin"></i> Generando preguntas con IA…</span>';
  previewEl.innerHTML = '';
  aiGeneratedQuestions = [];

  const unitIds     = getSelectedUnitIds();
  const units       = unitIds.map(id => liveUnits.find(u => u.id === id)).filter(Boolean);
  const unitTitle   = units.length
    ? units.map(u => `Unidad ${u.id}: ${u.title}`).join(' + ')
    : document.getElementById('fExamTitle').value;
  const unitTopics  = units.flatMap(u => u.topics || []);
  const unitContent = units.map(u => u.content || '').filter(Boolean).join('\n\n');

  try {
    const resp = await fetch('/api/generate-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitTitle, unitTopics, unitContent,
        mcCount, tfCount, shortCount,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Error desconocido');

    aiGeneratedQuestions = data.questions || [];
    const n = aiGeneratedQuestions.length;

    statusEl.innerHTML = `<span style="color:var(--success)"><i class="fas fa-check-circle"></i>
      ${n} pregunta${n !== 1 ? 's' : ''} generada${n !== 1 ? 's' : ''}.
      Revisalas y luego importá.</span>`;

    const typeLabel = { multiple_choice: 'Múltiple opción', true_false: 'V / F', short_answer: 'Respuesta corta' };

    previewEl.innerHTML = aiGeneratedQuestions.map((q, i) => {
      let opts = '';
      if (q.type === 'multiple_choice' && q.options) {
        opts = `<ul style="font-size:12px;color:var(--gray-500);margin:6px 0 0;padding-left:16px">
          ${q.options.map((o, oi) =>
            `<li><strong>${'ABCD'[oi]}.</strong> ${o}${o === q.correct_answer ? ' <span style="color:var(--success)">✓</span>' : ''}</li>`
          ).join('')}
        </ul>`;
      } else if (q.type === 'true_false') {
        opts = `<p style="font-size:12px;color:var(--gray-500);margin-top:4px">Correcto: <strong>${q.correct_answer}</strong></p>`;
      }
      return `<div style="background:white;border-radius:8px;padding:12px;margin-bottom:8px;border:1px solid var(--gray-300)">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="font-size:11px;color:var(--primary);font-weight:700">${typeLabel[q.type]} · ${q.points} pt</span>
          <span style="font-size:11px;color:var(--gray-500)">#${i + 1}</span>
        </div>
        <p style="font-size:14px;font-weight:500">${q.question_text}</p>
        ${opts}
      </div>`;
    }).join('') + `
    <button class="btn btn-success btn-sm" style="margin-top:4px" onclick="importGeneratedQuestions()">
      <i class="fas fa-file-import"></i> Importar todas al examen
    </button>`;

  } catch (e) {
    statusEl.innerHTML = `<span style="color:var(--danger)"><i class="fas fa-times-circle"></i> Error: ${e.message}</span>`;
  }
}

async function importGeneratedQuestions() {
  if (!currentExamId || !aiGeneratedQuestions.length) return;

  const statusEl = document.getElementById('aiGenerationStatus');
  statusEl.innerHTML = '<span style="color:var(--primary)"><i class="fas fa-circle-notch fa-spin"></i> Guardando preguntas…</span>';

  const baseOrder = examQCache.length;
  const rows = aiGeneratedQuestions.map((q, i) => ({
    exam_id:        currentExamId,
    question_text:  q.question_text,
    type:           q.type,
    options:        q.options ? JSON.stringify(q.options) : null,
    correct_answer: q.correct_answer,
    points:         parseFloat(q.points) || 1,
    order_num:      baseOrder + i,
  }));

  const { error } = await db.from('exam_questions').insert(rows);
  if (error) {
    statusEl.innerHTML = `<span style="color:var(--danger)"><i class="fas fa-times-circle"></i> Error al guardar: ${error.message}</span>`;
    return;
  }

  const n = rows.length;
  statusEl.innerHTML = `<span style="color:var(--success)"><i class="fas fa-check-circle"></i> ¡${n} pregunta${n !== 1 ? 's' : ''} importada${n !== 1 ? 's' : ''}!</span>`;
  document.getElementById('aiPreview').innerHTML = '';
  aiGeneratedQuestions = [];
  await loadExamQuestionsAdmin(currentExamId);
  loadAdminExams();
  toast(`${n} preguntas importadas al examen.`);
}

// ── ALUMNO: EVALUACIONES DISPONIBLES ─────────────────────────
async function loadStudentExams() {
  if (!currentUser || currentUser.is_admin) return;

  const [{ data: activeExams }, { data: results }] = await Promise.all([
    db.from('exams').select('*, exam_questions(count)').eq('is_active', true).order('created_at'),
    db.from('exam_results').select('*, exams(title)').eq('student_id', currentUser.id).order('taken_at', { ascending: false })
  ]);

  // Separar práctica de evaluaciones formales
  const allActive   = activeExams || [];
  const practiceList = allActive.filter(e => e.is_practice);
  const formalList   = allActive.filter(e => !e.is_practice);

  const buildExamCard = (exam, isPractice) => {
    const examUnitIds = exam.unit_ids
      ? (Array.isArray(exam.unit_ids) ? exam.unit_ids : JSON.parse(exam.unit_ids || '[]'))
      : (exam.unit_id ? [exam.unit_id] : []);
    const unitLabel = examUnitIds.map(uid => `U${uid}`).join(' + ');
    const qCount    = exam.exam_questions?.[0]?.count || 0;
    const btnColor  = isPractice ? 'btn-success' : 'btn-primary';
    const btnLabel  = isPractice ? '📝 Practicar' : '<i class="fas fa-play-circle"></i> Iniciar';
    return `
    <div style="background:white;border-radius:12px;padding:18px 20px;margin-bottom:10px;
      box-shadow:var(--shadow);display:flex;justify-content:space-between;align-items:center;
      ${isPractice ? 'border-left:4px solid var(--success)' : ''}">
      <div>
        <strong>${exam.title}</strong>
        <p style="font-size:13px;color:var(--gray-500);margin-top:3px">
          ${unitLabel ? unitLabel + ' &nbsp;·&nbsp;' : ''}
          ${exam.time_limit} min &nbsp;·&nbsp; ${qCount} preguntas
          ${isPractice ? ' &nbsp;·&nbsp; <span style="color:var(--success);font-weight:600">sin nota · repetible</span>' : ''}
        </p>
      </div>
      <button class="btn ${btnColor} btn-sm" onclick="startExam('${exam.id}')">
        ${btnLabel}
      </button>
    </div>`;
  };

  // Práctica
  const prEl = document.getElementById('practiceExams');
  if (prEl) {
    prEl.innerHTML = practiceList.length
      ? practiceList.map(e => buildExamCard(e, true)).join('')
      : '<p style="color:var(--gray-500);font-size:14px;padding:8px 0">No hay ejercicios de práctica disponibles.</p>';
  }
  document.getElementById('practiceSection').style.display = practiceList.length ? 'block' : 'none';

  // Formales
  const avEl = document.getElementById('availableExams');
  avEl.innerHTML = formalList.length
    ? formalList.map(e => buildExamCard(e, false)).join('')
    : '<p style="color:var(--gray-500);font-size:14px;padding:8px 0">No hay evaluaciones habilitadas en este momento.</p>';

  // Historial
  const container = document.getElementById('examResults');
  const empty     = document.getElementById('examEmpty');
  const resList   = results || [];
  if (!resList.length) { empty.style.display = 'block'; container.innerHTML = ''; return; }
  empty.style.display = 'none';
  container.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Evaluación</th><th>Fecha</th><th>Nota</th><th>Estado</th></tr></thead>
    <tbody>${resList.map(r => {
      const s = r.score;
      const cls = s === null ? '' : s >= 7 ? 'score-high' : s >= 5 ? 'score-mid' : 'score-low';
      return `<tr>
        <td>${r.exams?.title || '—'}</td>
        <td>${new Date(r.taken_at).toLocaleDateString('es-AR')}</td>
        <td>${s !== null ? s + '/10' : '—'}</td>
        <td><span class="score-badge ${cls}">
          ${s === null ? 'En revisión' : s >= 7 ? 'Aprobado' : s >= 5 ? 'Regular' : 'Desaprobado'}
        </span></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

// ── ALUMNO: RENDIR EXAMEN ─────────────────────────────────────
async function startExam(examId) {
  const { data: exam } = await db.from('exams').select('*').eq('id', examId).single();
  if (!exam?.is_active) { toast('Esta evaluación ya no está disponible.'); return; }

  // Examen formal: verificar que no lo haya rendido antes
  if (!exam.is_practice && currentUser) {
    const { data: prev } = await db
      .from('exam_results')
      .select('score')
      .eq('exam_id', examId)
      .eq('student_id', currentUser.id)
      .maybeSingle();
    if (prev) {
      const nota = prev.score !== null ? `Nota: ${prev.score}/10` : 'En revisión';
      toast(`Ya rendiste esta evaluación. ${nota}`);
      return;
    }
  }

  const { data: questions } = await db
    .from('exam_questions').select('*')
    .eq('exam_id', examId).order('order_num');

  if (!questions?.length) { toast('Esta evaluación no tiene preguntas todavía.'); return; }

  takingExam  = exam;
  examQCache  = questions.map(q => ({
    ...q,
    options: q.options
      ? (Array.isArray(q.options) ? q.options : JSON.parse(q.options))
      : []
  }));

  // Render header
  document.getElementById('takeExamTitle').textContent    = exam.title;
  document.getElementById('takeExamSubtitle').textContent = exam.is_practice
    ? `${questions.length} pregunta${questions.length !== 1 ? 's' : ''} · Sin límite de tiempo`
    : `${questions.length} pregunta${questions.length !== 1 ? 's' : ''} · ${exam.time_limit} minutos`;

  // Render body
  const body = document.getElementById('takeExamBody');
  body.innerHTML = (exam.instructions
    ? `<div class="alert alert-info" style="margin-bottom:20px"><strong>Instrucciones:</strong> ${exam.instructions}</div>`
    : '') + examQCache.map((q, i) => renderStudentQuestion(q, i, examQCache.length)).join('');

  document.getElementById('takeExamProgress').textContent =
    `${questions.length} pregunta${questions.length !== 1 ? 's' : ''}`;
  document.getElementById('takeExamSubmitBtn').style.display = 'inline-flex';
  document.getElementById('takeExamTimer').style.color = 'white';

  if (exam.is_practice) {
    stopTimer();
    document.getElementById('takeExamTimer').textContent = '∞';
    document.getElementById('takeExamTimer').style.color = '#86efac';
    document.getElementById('takeExamTimer').style.fontSize = '36px';
  } else {
    startTimer(exam.time_limit * 60);
    document.getElementById('takeExamTimer').style.fontSize = '32px';
  }
  openModal('modalTakeExam');
}

function renderStudentQuestion(q, i, total) {
  let answersHtml = '';
  if (q.type === 'multiple_choice') {
    answersHtml = q.options.map((opt, idx) => `
      <label class="exam-opt" onclick="pickOption(this,'q_${q.id}','${opt.replace(/'/g,"\\'")}')">
        <input type="radio" name="q_${q.id}" value="${opt.replace(/"/g,'&quot;')}" />
        <span class="opt-letter">${'ABCD'[idx]}</span>
        <span>${opt}</span>
      </label>`).join('');
  } else if (q.type === 'true_false') {
    answersHtml = ['Verdadero','Falso'].map(opt => `
      <label class="exam-opt" onclick="pickOption(this,'q_${q.id}','${opt}')">
        <input type="radio" name="q_${q.id}" value="${opt}" />
        <span class="opt-letter">${opt[0]}</span>
        <span>${opt}</span>
      </label>`).join('');
  } else {
    answersHtml = `<textarea class="form-control" id="q_short_${q.id}" rows="4"
      placeholder="Escribí tu respuesta aquí..." style="margin-top:8px"></textarea>`;
  }
  return `
  <div class="exam-question-card">
    <p class="exam-q-meta">Pregunta ${i+1} de ${total}
      <span style="float:right">${q.points} punto${q.points != 1 ? 's' : ''}</span>
    </p>
    <p class="exam-q-text">${q.question_text}</p>
    ${answersHtml}
  </div>`;
}

function pickOption(label, name, value) {
  document.querySelectorAll(`label.exam-opt[onclick*="${name}"]`).forEach(l => {
    l.classList.remove('selected');
    l.querySelector('input').checked = false;
  });
  label.classList.add('selected');
  const input = label.querySelector('input');
  input.checked = true;
}

function startTimer(seconds) {
  examSecondsLeft = seconds;
  updateTimerDisplay();
  clearInterval(examTimerRef);
  examTimerRef = setInterval(() => {
    examSecondsLeft--;
    updateTimerDisplay();
    const timerEl = document.getElementById('takeExamTimer');
    if (examSecondsLeft <= 300 && timerEl) timerEl.style.color = '#fca5a5';
    if (examSecondsLeft <= 0) { clearInterval(examTimerRef); submitExam(true); }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('takeExamTimer');
  if (!el) return;
  const m = Math.floor(examSecondsLeft / 60).toString().padStart(2,'0');
  const s = (examSecondsLeft % 60).toString().padStart(2,'0');
  el.textContent = `${m}:${s}`;
}

function stopTimer() { clearInterval(examTimerRef); examTimerRef = null; }

// ── DESCARGAR EXAMEN EN PDF (para imprimir) ───────────────────
async function downloadExamPDF(examId) {
  toast('Generando PDF…');
  const [{ data: exam }, { data: questions }] = await Promise.all([
    db.from('exams').select('*').eq('id', examId).single(),
    db.from('exam_questions').select('*').eq('exam_id', examId).order('order_num'),
  ]);

  if (!exam) { toast('No se encontró el examen.'); return; }
  if (!questions?.length) { toast('El examen no tiene preguntas.'); return; }

  const { jsPDF } = window.jspdf;
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210, margin = 18, contentW = pageW - margin * 2;
  let y = margin;

  const addPage = () => { doc.addPage(); y = margin; };
  const checkY  = (needed) => { if (y + needed > 278) addPage(); };

  // ── ENCABEZADO ──
  doc.setFillColor(26, 86, 219);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15); doc.setFont('helvetica', 'bold');
  doc.text('ELECTROTECNIA', margin, 13);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  const titleLines = doc.splitTextToSize(exam.title, contentW - 30);
  doc.text(titleLines, margin, 22);
  doc.setFontSize(9);
  doc.text(`${exam.time_limit || 60} min`, pageW - margin, 22, { align: 'right' });
  y = 42;

  // ── DATOS DEL ALUMNO ──
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text('Apellido y Nombre: ________________________________________________   DNI: ________________   Nota: _______', margin, y);
  y += 5;
  doc.text('Fecha: _______________   Firma: ________________________________________________', margin, y);
  y += 4;
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── INSTRUCCIONES ──
  if (exam.instructions) {
    doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(60, 60, 60);
    const il = doc.splitTextToSize(`Instrucciones: ${exam.instructions}`, contentW);
    checkY(il.length * 5 + 4);
    doc.text(il, margin, y);
    y += il.length * 5 + 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  }

  // ── PREGUNTAS ──
  let totalPts = 0;
  questions.forEach((q, idx) => {
    const opts = q.options
      ? (Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'))
      : [];
    const pts  = parseFloat(q.points) || 1;
    totalPts  += pts;
    const typeMap = { multiple_choice: 'Múltiple opción', true_false: 'Verdadero / Falso', short_answer: 'Respuesta corta' };

    // Estimate height before rendering
    const qTextLines = doc.splitTextToSize(q.question_text, contentW - 6);
    let estH = 8 + qTextLines.length * 5.5;
    if (q.type === 'multiple_choice') estH += opts.length * 7 + 3;
    else if (q.type === 'true_false')  estH += 9;
    else                               estH += 24;
    checkY(estH);

    // Question header
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 86, 219);
    doc.text(`${idx + 1}.  [${typeMap[q.type]}  —  ${pts} punto${pts !== 1 ? 's' : ''}]`, margin, y);
    y += 6;

    // Question text
    doc.setFontSize(10.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 15, 15);
    doc.text(qTextLines, margin + 4, y);
    y += qTextLines.length * 5.5 + 2;

    if (q.type === 'multiple_choice') {
      opts.forEach((opt, oi) => {
        const optLines = doc.splitTextToSize(`${' ABCD'[oi + 1]})  ${opt}`, contentW - 18);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(35, 35, 35);
        // Small circle marker
        doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.4);
        doc.circle(margin + 10, y - 1, 2.5);
        doc.text(optLines, margin + 14, y);
        y += optLines.length * 5.5 + 1;
      });
      y += 3;
    } else if (q.type === 'true_false') {
      doc.setFontSize(10.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(35, 35, 35);
      doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.4);
      doc.circle(margin + 12, y - 1, 2.5);
      doc.text('Verdadero', margin + 16, y);
      doc.circle(margin + 52, y - 1, 2.5);
      doc.text('Falso', margin + 56, y);
      y += 9;
    } else {
      // Short answer — blank lines
      doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.35);
      for (let l = 0; l < 3; l++) {
        y += 7;
        doc.line(margin + 4, y, pageW - margin, y);
      }
      y += 6;
    }

    // Thin separator between questions
    doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  });

  // Total points summary at the end
  checkY(10);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 86, 219);
  doc.text(`Total: ${totalPts} punto${totalPts !== 1 ? 's' : ''}`, pageW - margin, y, { align: 'right' });

  // ── PIE DE PÁGINA ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 286, 210, 11, 'F');
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
    doc.text(
      '© 2026 Ing. Germán Golder ® | Ley 11.723 Propiedad Intelectual | Prohibida su reproducción sin autorización',
      pageW / 2, 291, { align: 'center' }
    );
    doc.text(`Página ${p}/${totalPages}`, pageW - margin, 291, { align: 'right' });
  }

  doc.save(`Examen_${exam.title.replace(/[^a-z0-9áéíóúüñ\s]/gi, '').trim().replace(/\s+/g, '_')}.pdf`);
  toast('PDF generado — listo para imprimir.');
}

function cancelExam() {
  if (!confirm('¿Salir de la evaluación? Las respuestas no se guardarán.')) return;
  stopTimer(); closeModal('modalTakeExam');
}

async function submitExam(auto = false) {
  if (!auto) {
    const unanswered = examQCache.filter(q =>
      q.type !== 'short_answer' && !document.querySelector(`input[name="q_${q.id}"]:checked`)
    ).length;
    if (unanswered && !confirm(`Tenés ${unanswered} pregunta${unanswered > 1 ? 's' : ''} sin responder. ¿Enviar igual?`)) return;
  }
  stopTimer();

  let totalPts = 0, earnedPts = 0, hasPending = false;
  const answers = {};

  examQCache.forEach(q => {
    totalPts += parseFloat(q.points) || 1;
    if (q.type === 'short_answer') {
      answers[q.id] = document.getElementById(`q_short_${q.id}`)?.value || '';
      hasPending = true;
    } else {
      const val = document.querySelector(`input[name="q_${q.id}"]:checked`)?.value || '';
      answers[q.id] = val;
      if (val === q.correct_answer) earnedPts += parseFloat(q.points) || 1;
    }
  });

  // ── MODO PRÁCTICA: mostrar respuestas correctas, no guardar nota ──
  if (takingExam.is_practice) {
    stopTimer();
    document.getElementById('takeExamSubmitBtn').style.display = 'none';
    document.getElementById('takeExamTimer').textContent = '📝';
    document.getElementById('takeExamTimer').style.color = '#86efac';

    const typeLabel = { multiple_choice: 'Múltiple opción', true_false: 'V / F', short_answer: 'Respuesta corta' };
    document.getElementById('takeExamBody').innerHTML = `
      <div style="text-align:center;padding:24px 20px 20px">
        <div style="font-size:52px;margin-bottom:10px">📖</div>
        <h3 style="margin-bottom:4px">¡Práctica completada!</h3>
        <p style="color:var(--gray-500);font-size:14px">Revisá tus respuestas y las correctas abajo.</p>
        <p style="font-size:14px;margin-top:8px">Obtuviste <strong>${earnedPts.toFixed(1)}</strong> de <strong>${totalPts}</strong> puntos automáticos.</p>
      </div>
      ${examQCache.map((q, i) => {
        const opts = q.options || [];
        const studentAnswer = answers[q.id] || '';
        let answersHtml = '';

        if (q.type === 'multiple_choice' || q.type === 'true_false') {
          const isCorrect = studentAnswer === q.correct_answer;
          answersHtml = opts.map(opt => {
            const isStudent  = opt === studentAnswer;
            const isCorrectO = opt === q.correct_answer;
            let bg = '#f9fafb', border = '#e5e7eb', color = '#374151';
            if (isStudent && isCorrect)  { bg = '#d1fae5'; border = '#10b981'; color = '#065f46'; }
            if (isStudent && !isCorrect) { bg = '#fee2e2'; border = '#ef4444'; color = '#991b1b'; }
            if (!isStudent && isCorrectO){ bg = '#d1fae5'; border = '#10b981'; color = '#065f46'; }
            const icon = isStudent ? (isCorrect ? '✓' : '✗') : (isCorrectO ? '✓' : '○');
            return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:6px;
              margin-bottom:4px;border:1.5px solid ${border};background:${bg};color:${color};font-size:13px">
              <strong style="min-width:14px">${icon}</strong> ${opt}
              ${!isStudent && isCorrectO ? '<span style="margin-left:auto;font-size:11px;font-weight:700">← Correcta</span>' : ''}
            </div>`;
          }).join('');
          answersHtml += `<p style="font-size:12px;font-weight:700;margin-top:6px;color:${isCorrect ? '#10b981' : '#ef4444'}">
            ${isCorrect ? `✓ Correcto — ${q.points} pt` : `✗ Incorrecto — Respuesta correcta: ${q.correct_answer}`}
          </p>`;
        } else {
          answersHtml = `
            <div style="background:#f0fdf4;border-left:3px solid #10b981;border-radius:0 8px 8px 0;
              padding:10px 14px;font-size:13px;margin-bottom:6px">
              <p style="font-size:11px;font-weight:700;color:#15803d;margin-bottom:2px">TU RESPUESTA</p>
              <p>${studentAnswer || '<em style="color:#9ca3af">Sin respuesta</em>'}</p>
            </div>
            <p style="font-size:12px;color:#6b7280;font-style:italic">Respuesta abierta — revisala con el profesor.</p>`;
        }

        return `
        <div style="background:white;border-radius:10px;padding:16px 18px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
          <p style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;
            letter-spacing:.04em;margin-bottom:6px">${typeLabel[q.type]} · ${q.points} pt</p>
          <p style="font-size:15px;font-weight:600;margin-bottom:10px">${i + 1}. ${q.question_text}</p>
          ${answersHtml}
        </div>`;
      }).join('')}`;
    return;
  }

  // ── EVALUACIÓN FORMAL: guardar nota ───────────────────────────
  const score = hasPending ? null : parseFloat(((earnedPts / totalPts) * 10).toFixed(1));

  const { error } = await db.from('exam_results').insert([{
    student_id: currentUser.id,
    exam_id:    takingExam.id,
    score,
    answers:    JSON.stringify(answers),
    taken_at:   new Date().toISOString(),
  }]);
  if (error) { toast(`Error al guardar: ${error.message}`); return; }

  // Mostrar resultado
  const passed = score !== null && score >= 7;
  document.getElementById('takeExamBody').innerHTML = `
    <div style="text-align:center;padding:48px 20px">
      <div style="font-size:80px;margin-bottom:16px">${score === null ? '📝' : passed ? '🎉' : '📚'}</div>
      <div style="font-size:48px;font-weight:800;color:${score === null ? 'var(--primary)' : passed ? 'var(--success)' : 'var(--danger)'};margin-bottom:8px">
        ${score !== null ? score + ' / 10' : '—'}
      </div>
      <p style="color:var(--gray-500);font-size:15px;margin-bottom:24px">
        ${score === null
          ? 'Incluye respuestas abiertas. Tu nota será publicada por el profesor.'
          : `${earnedPts.toFixed(1)} de ${totalPts} puntos correctos.`}
      </p>
      <span class="score-badge ${score === null ? 'score-mid' : passed ? 'score-high' : score >= 5 ? 'score-mid' : 'score-low'}"
        style="font-size:16px;padding:10px 28px">
        ${score === null ? 'Entregado — En revisión' : passed ? 'Aprobado ✓' : score >= 5 ? 'Regular' : 'Desaprobado'}
      </span>
    </div>`;
  document.getElementById('takeExamSubmitBtn').style.display = 'none';
  document.getElementById('takeExamTimer').textContent = '✓';
  document.getElementById('takeExamTimer').style.color = '#86efac';
  loadStudentExams();
}
