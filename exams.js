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
    const unit   = liveUnits.find(u => u.id === exam.unit_id);
    const qCount = exam.exam_questions?.[0]?.count || 0;
    return `
    <div style="background:white;border-radius:12px;padding:20px;margin-bottom:12px;box-shadow:var(--shadow)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
            <span class="score-badge ${exam.is_active ? 'score-high' : 'score-low'}" style="font-size:11px">
              ${exam.is_active ? '● ACTIVO' : '○ INACTIVO'}
            </span>
            <strong>${exam.title}</strong>
          </div>
          <p style="font-size:13px;color:var(--gray-500)">
            ${unit ? `Unidad ${unit.id}: ${unit.title}` : '—'} &nbsp;·&nbsp;
            ${exam.time_limit || 60} min &nbsp;·&nbsp;
            ${qCount} pregunta${qCount != 1 ? 's' : ''}
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
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
  document.getElementById('fExamTitle').value        = '';
  document.getElementById('fExamUnit').value         = '';
  document.getElementById('fExamTime').value         = 60;
  document.getElementById('fExamInstr').value        = '';
  document.getElementById('examFormAlert').innerHTML = '';
  document.getElementById('examQSection').style.display = 'none';
  document.getElementById('examQList').innerHTML     = '';
  fillUnitSelector('fExamUnit');
  openModal('modalExam');
}

async function openEditExam(examId) {
  const { data: exam } = await db.from('exams').select('*').eq('id', examId).single();
  if (!exam) return;
  currentExamId = examId;
  document.getElementById('examFormTitle').textContent = 'Editar examen';
  document.getElementById('fExamTitle').value  = exam.title;
  document.getElementById('fExamUnit').value   = exam.unit_id || '';
  document.getElementById('fExamTime').value   = exam.time_limit || 60;
  document.getElementById('fExamInstr').value  = exam.instructions || '';
  document.getElementById('examFormAlert').innerHTML = '';
  document.getElementById('examQSection').style.display = 'block';
  fillUnitSelector('fExamUnit', exam.unit_id);
  await loadExamQuestionsAdmin(examId);
  openModal('modalExam');
}

function fillUnitSelector(selId, selected) {
  const sel = document.getElementById(selId);
  sel.innerHTML = '<option value="">— Unidad (opcional) —</option>' +
    [...liveUnits].sort((a,b) => a.id - b.id).map(u =>
      `<option value="${u.id}" ${u.id == selected ? 'selected' : ''}>
        Unidad ${u.id}: ${u.title}</option>`).join('');
}

async function saveExam() {
  const title    = document.getElementById('fExamTitle').value.trim();
  const unit_id  = parseInt(document.getElementById('fExamUnit').value) || null;
  const time_lim = parseInt(document.getElementById('fExamTime').value) || 60;
  const instr    = document.getElementById('fExamInstr').value.trim();

  if (!title) { showAlert('examFormAlert', 'El título es obligatorio.', 'danger'); return; }

  const payload = { title, unit_id, time_limit: time_lim, instructions: instr };

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

// ── ALUMNO: EVALUACIONES DISPONIBLES ─────────────────────────
async function loadStudentExams() {
  if (!currentUser || currentUser.is_admin) return;

  const [{ data: activeExams }, { data: results }] = await Promise.all([
    db.from('exams').select('*, exam_questions(count)').eq('is_active', true).order('created_at'),
    db.from('exam_results').select('*, exams(title)').eq('student_id', currentUser.id).order('taken_at', { ascending: false })
  ]);

  // Disponibles
  const avEl = document.getElementById('availableExams');
  const avList = activeExams || [];
  if (!avList.length) {
    avEl.innerHTML = '<p style="color:var(--gray-500);font-size:14px;padding:8px 0">No hay evaluaciones habilitadas en este momento.</p>';
  } else {
    avEl.innerHTML = avList.map(exam => {
      const unit   = liveUnits.find(u => u.id === exam.unit_id);
      const qCount = exam.exam_questions?.[0]?.count || 0;
      return `
      <div style="background:white;border-radius:12px;padding:18px 20px;margin-bottom:10px;box-shadow:var(--shadow);display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>${exam.title}</strong>
          <p style="font-size:13px;color:var(--gray-500);margin-top:3px">
            ${unit ? `Unidad ${unit.id}` : ''} &nbsp;·&nbsp;
            ${exam.time_limit} min &nbsp;·&nbsp; ${qCount} preguntas
          </p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="startExam('${exam.id}')">
          <i class="fas fa-play-circle"></i> Iniciar
        </button>
      </div>`;
    }).join('');
  }

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
  document.getElementById('takeExamSubtitle').textContent =
    `${questions.length} pregunta${questions.length !== 1 ? 's' : ''} · ${exam.time_limit} minutos`;

  // Render body
  const body = document.getElementById('takeExamBody');
  body.innerHTML = (exam.instructions
    ? `<div class="alert alert-info" style="margin-bottom:20px"><strong>Instrucciones:</strong> ${exam.instructions}</div>`
    : '') + examQCache.map((q, i) => renderStudentQuestion(q, i, examQCache.length)).join('');

  document.getElementById('takeExamProgress').textContent =
    `${questions.length} pregunta${questions.length !== 1 ? 's' : ''}`;
  document.getElementById('takeExamSubmitBtn').style.display = 'inline-flex';
  document.getElementById('takeExamTimer').style.color = 'white';

  startTimer(exam.time_limit * 60);
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
