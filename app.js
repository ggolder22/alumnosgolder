// ── SUPABASE INIT ─────────────────────────────────────────────
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── STATE ─────────────────────────────────────────────────────
let currentUser = null;   // { id, full_name, email, dni, is_admin }
let currentUnitId = null;
let liveUnits = [...UNITS]; // se sobreescribe con datos de Supabase si existen

// ── BOOT ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await loadUnitsFromDB();
  renderUnitsGrid('unitsGrid');
  loadStoredSession();
  document.getElementById('notifTarget').addEventListener('change', e => {
    document.getElementById('notifStudentRow').style.display =
      e.target.value === 'one' ? 'block' : 'none';
  });
});

// ── UNITS — carga desde Supabase (si la tabla existe) ─────────
async function loadUnitsFromDB() {
  try {
    const { data, error } = await db
      .from('units')
      .select('*')
      .order('unit_id');
    if (!error && data && data.length > 0) {
      liveUnits = data.map(row => ({
        id:      row.unit_id,
        title:   row.title,
        topics:  Array.isArray(row.topics) ? row.topics : JSON.parse(row.topics || '[]'),
        tag:     row.tag,
        content: row.content,
      }));
    }
  } catch (_) {
    // tabla no existe aún → usa datos estáticos
  }
}

// ── SESSION ───────────────────────────────────────────────────
function loadStoredSession() {
  const saved = localStorage.getItem('electro_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      applySession();
    } catch { localStorage.removeItem('electro_user'); }
  }
}

function applySession() {
  updateNav();
  if (currentUser.is_admin) {
    showPage('admin');
    loadAdminData();
  } else {
    showPage('student');
    renderUnitsGrid('unitsGridStudent');
    loadStudentExams();
  }
}

// ── AUTH ──────────────────────────────────────────────────────
async function doLogin() {
  const dni = document.getElementById('loginDni').value.trim();
  if (!dni) { showAlert('loginAlert', 'Ingresá tu DNI.', 'danger'); return; }

  // Admin check
  if (dni === ADMIN_DNI) {
    currentUser = { id: 'admin', full_name: 'Profesor', email: '', dni: ADMIN_DNI, is_admin: true };
    saveSession();
    closeModal('modalLogin');
    showPage('admin');
    loadAdminData();
    return;
  }

  const { data, error } = await db
    .from('students')
    .select('*')
    .eq('dni', dni)
    .single();

  if (error || !data) {
    showAlert('loginAlert', 'DNI no encontrado. ¿Ya te registraste?', 'danger');
    return;
  }

  currentUser = { ...data, is_admin: false };
  saveSession();
  closeModal('modalLogin');
  showPage('student');
  renderUnitsGrid('unitsGridStudent');
  loadStudentExams();
  toast(`¡Bienvenido/a, ${data.full_name.split(' ')[0]}!`);
}

async function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const dni   = document.getElementById('regDni').value.trim();

  if (!name || !email || !dni) {
    showAlert('registerAlert', 'Completá todos los campos.', 'danger'); return;
  }
  if (!/^\d{7,8}$/.test(dni)) {
    showAlert('registerAlert', 'El DNI debe tener 7 u 8 dígitos numéricos.', 'danger'); return;
  }

  // Check duplicate
  const { data: existing } = await db.from('students').select('id').eq('dni', dni).single();
  if (existing) {
    showAlert('registerAlert', 'Ese DNI ya está registrado. Podés iniciar sesión.', 'danger'); return;
  }

  const { data, error } = await db
    .from('students')
    .insert([{ full_name: name, email, dni, created_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) {
    showAlert('registerAlert', 'Error al registrar. Intentá de nuevo.', 'danger'); return;
  }

  showAlert('registerAlert', '¡Cuenta creada! Ya podés iniciar sesión con tu DNI.', 'success');
  document.getElementById('regName').value = '';
  document.getElementById('regEmail').value = '';
  document.getElementById('regDni').value = '';
}

function logout() {
  currentUser = null;
  localStorage.removeItem('electro_user');
  updateNav();
  showPage('home');
  toast('Sesión cerrada.');
}

function saveSession() {
  localStorage.setItem('electro_user', JSON.stringify(currentUser));
}

// ── NAV ───────────────────────────────────────────────────────
function updateNav() {
  const nav = document.getElementById('navActions');
  if (!currentUser) {
    nav.innerHTML = `
      <button class="btn btn-outline btn-sm" onclick="openModal('modalLogin')">
        <i class="fas fa-sign-in-alt"></i> Ingresar
      </button>
      <button class="btn btn-primary btn-sm" onclick="openModal('modalRegister')">
        <i class="fas fa-user-plus"></i> Registrarse
      </button>`;
  } else if (currentUser.is_admin) {
    nav.innerHTML = `
      <span style="font-size:13px;color:#6b7280"><i class="fas fa-shield-alt"></i> Admin</span>
      <button class="btn btn-outline btn-sm" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Salir</button>`;
  } else {
    document.getElementById('studentAvatar').textContent = currentUser.full_name[0].toUpperCase();
    document.getElementById('studentName').textContent = currentUser.full_name;
    document.getElementById('studentDni').textContent = `DNI: ${currentUser.dni}`;
    nav.innerHTML = `
      <span style="font-size:13px;color:#6b7280">${currentUser.full_name.split(' ')[0]}</span>
      <button class="btn btn-outline btn-sm" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Salir</button>`;
  }
}

// ── UNITS GRID ────────────────────────────────────────────────
function renderUnitsGrid(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const sorted = [...liveUnits].sort((a, b) => a.id - b.id);
  if (sorted.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--gray-500)">
      <i class="fas fa-book-open" style="font-size:40px;opacity:.3;display:block;margin-bottom:16px"></i>
      El contenido estará disponible próximamente.
    </div>`;
    return;
  }
  container.innerHTML = sorted.map(u => `
    <div class="unit-card">
      <div class="unit-header">
        <div class="unit-num">U${u.id}</div>
        <div>
          <h3>${u.title}</h3>
          <p>${(u.topics || []).slice(0,2).join(' · ')}</p>
        </div>
      </div>
      <div class="unit-body">
        <ul>${(u.topics || []).map(t => `<li>${t}</li>`).join('')}</ul>
        ${u.content ? `<p style="font-size:13px;color:var(--gray-500);margin-top:8px">${u.content.substring(0,120)}${u.content.length>120?'…':''}</p>` : ''}
      </div>
      <div class="unit-footer">
        <span class="unit-tag">${u.tag || ''}</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="openUnit(${u.id})">
            <i class="fas fa-book-open"></i> Ver contenido
          </button>
          ${u.pdf_url ? `<a class="btn btn-primary btn-sm" href="${u.pdf_url}" target="_blank" download>
            <i class="fas fa-file-pdf"></i> PDF
          </a>` : ''}
        </div>
      </div>
    </div>`).join('');
}

// ── UNIT DETAIL ───────────────────────────────────────────────
function openUnit(id) {
  const unit = liveUnits.find(u => u.id === id);
  if (!unit) return;
  currentUnitId = id;
  document.getElementById('modalUnitTitle').textContent = `Unidad ${unit.id} — ${unit.title}`;

  const pdfDiv  = document.getElementById('modalUnitPdf');
  const bodyDiv = document.getElementById('modalUnitBody');
  const btnDl   = document.getElementById('btnDownloadPdf');
  const btnGen  = document.getElementById('btnDownloadGen');

  if (unit.pdf_url) {
    // Mostrar PDF en iframe
    document.getElementById('pdfIframe').src = unit.pdf_url + '?v=' + Date.now();
    pdfDiv.style.display  = 'block';
    bodyDiv.style.display = 'none';
    btnDl.href            = unit.pdf_url;
    btnDl.style.display   = 'inline-flex';
    btnGen.style.display  = 'none';
  } else {
    // Fallback: mostrar contenido HTML
    document.getElementById('pdfIframe').src = '';
    pdfDiv.style.display  = 'none';
    bodyDiv.style.display = 'block';
    bodyDiv.innerHTML     = unit.content || '<p style="color:#9ca3af;padding:20px">Esta unidad todavía no tiene contenido.</p>';
    btnDl.style.display   = 'none';
    btnGen.style.display  = unit.content ? 'inline-flex' : 'none';
  }
  openModal('modalUnit');
}

function downloadUnitPDF() {
  if (!currentUnitId) return;
  downloadUnitPDFById(currentUnitId);
}

function downloadUnitPDFById(id) {
  const unit = liveUnits.find(u => u.id === id);
  if (!unit) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = 210, margin = 20, contentW = pageW - margin * 2;
  let y = margin;

  // Header
  doc.setFillColor(26, 86, 219);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('ELECTROTECNIA', margin, 13);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Material teórico — 2026', margin, 21);
  y = 38;

  // Title
  doc.setTextColor(26, 86, 219);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(`Unidad ${unit.id}: ${unit.title}`, contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 4;

  // Separator
  doc.setDrawColor(26, 86, 219);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Parse HTML content to plain text for PDF
  const tmp = document.createElement('div');
  tmp.innerHTML = unit.content;

  const addText = (text, fontSize, bold, color, indent) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentW - (indent || 0));
    if (y + lines.length * (fontSize * 0.45) > 275) { doc.addPage(); y = margin; }
    doc.text(lines, margin + (indent || 0), y);
    y += lines.length * (fontSize * 0.45) + 3;
  };

  tmp.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) return;
    const tag = node.tagName?.toLowerCase();
    const text = node.innerText || node.textContent || '';
    if (!text.trim()) return;
    if (tag === 'h4') {
      y += 3;
      addText(text, 12, true, [26, 86, 219], 0);
    } else if (tag === 'p') {
      addText(text, 10, false, [55, 65, 81], 0);
    } else if (tag === 'div' && (node.classList.contains('formula') || node.classList.contains('nota'))) {
      y += 2;
      doc.setFillColor(248, 250, 252);
      const lines = doc.splitTextToSize(text, contentW - 10);
      const h = lines.length * 5 + 8;
      doc.rect(margin, y - 4, contentW, h, 'F');
      doc.setDrawColor(26, 86, 219);
      doc.setLineWidth(1);
      doc.line(margin, y - 4, margin, y - 4 + h);
      addText(text, 10, false, [30, 64, 175], 6);
      y += 3;
    } else if (tag === 'ul' || tag === 'ol') {
      node.querySelectorAll('li').forEach(li => {
        addText('• ' + li.textContent, 10, false, [55, 65, 81], 4);
      });
    }
  });

  // Footer legal en cada página
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 282, 210, 15, 'F');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `© 2026 Ing. Germán Golder ® | Prohibida su reproducción sin autorización | Ley 11.723 Propiedad Intelectual`,
      pageW / 2, 288, { align: 'center' }
    );
    doc.setTextColor(71, 85, 105);
    doc.text(`Unidad ${unit.id}`, margin, 292);
    doc.text(`${new Date().toLocaleDateString('es-AR')} | p. ${p}/${totalPages}`, pageW - margin, 292, { align: 'right' });
  }

  doc.save(`Electrotecnia_Unidad${unit.id}.pdf`);
  toast(`PDF de la Unidad ${unit.id} descargado.`);
}

// ── STUDENT EXAMS ─────────────────────────────────────────────
async function loadStudentExams() {
  if (!currentUser || currentUser.is_admin) return;

  const { data } = await db
    .from('exam_results')
    .select('*, exams(title, unit_id)')
    .eq('student_id', currentUser.id)
    .order('taken_at', { ascending: false });

  const container = document.getElementById('examResults');
  const empty = document.getElementById('examEmpty');

  if (!data || data.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Evaluación</th><th>Fecha</th><th>Puntaje</th><th>Estado</th></tr></thead>
        <tbody>
          ${data.map(r => `
            <tr>
              <td>${r.exams?.title || 'Evaluación'}</td>
              <td>${new Date(r.taken_at).toLocaleDateString('es-AR')}</td>
              <td>${r.score}/10</td>
              <td><span class="score-badge ${r.score >= 7 ? 'score-high' : r.score >= 5 ? 'score-mid' : 'score-low'}">
                ${r.score >= 7 ? 'Aprobado' : r.score >= 5 ? 'Regular' : 'Desaprobado'}
              </span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── ADMIN ─────────────────────────────────────────────────────
async function loadAdminData() {
  // Renderizar botones de editar siempre, sin esperar a Supabase
  renderAdminUnitsEdit();

  // Test de conexión a Supabase
  await testSupabaseConnection();

  const { data: students, error } = await db
    .from('students')
    .select('*, exam_results(score)')
    .order('full_name');

  const list = students || [];

  // Stats
  const total     = list.length;
  const withExams = list.filter(s => (s.exam_results?.length || 0) > 0).length;
  const avgScore  = withExams
    ? list.reduce((acc, s) => {
        const scores = s.exam_results?.map(r => r.score) || [];
        return acc + (scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0);
      }, 0) / withExams
    : 0;

  document.getElementById('adminStats').innerHTML = `
    <div class="stat-card"><div class="num">${total}</div><div class="label">Alumnos registrados</div></div>
    <div class="stat-card"><div class="num">${withExams}</div><div class="label">Con evaluaciones</div></div>
    <div class="stat-card"><div class="num">${withExams ? avgScore.toFixed(1) : '—'}</div><div class="label">Promedio general</div></div>
    <div class="stat-card"><div class="num">${liveUnits.length}</div><div class="label">Unidades de contenido</div></div>`;

  // Table
  const tbody = document.getElementById('studentsBody');
  if (error || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:32px">
      ${error ? 'Ejecutá el SQL en Supabase para crear las tablas.' : 'Todavía no hay alumnos registrados.'}
    </td></tr>`;
  } else {
    tbody.innerHTML = list.map(s => {
      const scores = s.exam_results?.map(r => r.score) || [];
      const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
      const cls = scores.length ? (avg >= 7 ? 'score-high' : avg >= 5 ? 'score-mid' : 'score-low') : '';
      return `<tr>
        <td><strong>${s.full_name}</strong></td>
        <td>${s.email}</td>
        <td>${s.dni}</td>
        <td>${new Date(s.created_at).toLocaleDateString('es-AR')}</td>
        <td>${scores.length ? `<span class="score-badge ${cls}">${avg}</span>` : '<span style="color:#9ca3af">Sin evaluaciones</span>'}</td>
      </tr>`;
    }).join('');
  }

  // Notif student selector
  const sel = document.getElementById('notifStudent');
  sel.innerHTML = list.map(s =>
    `<option value="${s.email}" data-wa="${s.phone || ''}">${s.full_name}</option>`
  ).join('');
}

async function testSupabaseConnection() {
  const el = document.getElementById('supabaseStatus');
  if (!el) return;
  el.innerHTML = '<span style="color:#6b7280"><i class="fas fa-circle-notch fa-spin"></i> Verificando conexión a Supabase...</span>';

  try {
    const { data, error } = await db.from('students').select('id').limit(1);
    if (error) {
      el.innerHTML = `<span style="color:#ef4444"><i class="fas fa-times-circle"></i> Error Supabase: ${error.message}</span>`;
    } else {
      el.innerHTML = '<span style="color:#10b981"><i class="fas fa-check-circle"></i> Supabase conectado correctamente</span>';
    }
  } catch (e) {
    el.innerHTML = `<span style="color:#ef4444"><i class="fas fa-times-circle"></i> Sin conexión: ${e.message}</span>`;
  }
}

function renderAdminUnitsEdit() {
  const el = document.getElementById('adminUnitsEdit');
  if (liveUnits.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:48px;color:var(--gray-500)">
      <i class="fas fa-folder-open" style="font-size:40px;margin-bottom:16px;display:block;opacity:.4"></i>
      No hay unidades creadas todavía.<br>
      <button class="btn btn-primary btn-sm" style="margin-top:16px" onclick="newUnit()">
        <i class="fas fa-plus"></i> Crear primera unidad
      </button>
    </div>`;
    return;
  }
  el.innerHTML = liveUnits
    .sort((a, b) => a.id - b.id)
    .map(u => `
    <div style="background:white;border-radius:12px;padding:20px;margin-bottom:12px;box-shadow:var(--shadow);display:flex;justify-content:space-between;align-items:center">
      <div>
        <span style="font-size:13px;color:var(--primary);font-weight:700;margin-right:8px">U${u.id}</span>
        <strong>${u.title}</strong>
        <span class="unit-tag" style="margin-left:10px">${u.tag || ''}</span>
        <p style="font-size:13px;color:#6b7280;margin-top:4px">${(u.topics || []).join(' · ')}</p>
      </div>
      <button class="btn btn-outline btn-sm" onclick="editUnit(${u.id})">
        <i class="fas fa-edit"></i> Editar
      </button>
    </div>`).join('');
}

function newUnit() {
  currentUnitId = null;
  const nextId  = liveUnits.length > 0 ? Math.max(...liveUnits.map(u => u.id)) + 1 : 1;
  document.getElementById('editUnitTitle').innerHTML =
    `<i class="fas fa-plus" style="color:var(--primary)"></i> Nueva unidad`;
  document.getElementById('editUnitId').value      = nextId;
  document.getElementById('editTitle').value        = '';
  document.getElementById('editTag').value          = '';
  document.getElementById('editTopics').value       = '';
  document.getElementById('editContent').value      = '';
  document.getElementById('editUnitAlert').innerHTML = '';
  document.getElementById('pdfFile').value          = '';
  document.getElementById('pdfUploadStatus').innerHTML = '';
  document.getElementById('currentPdfInfo').style.display = 'none';
  document.getElementById('btnDeleteUnit').style.display  = 'none';
  openModal('modalEditUnit');
}

function editUnit(id) {
  const unit = liveUnits.find(u => u.id === id);
  if (!unit) return;
  currentUnitId = id;
  document.getElementById('editUnitTitle').innerHTML =
    `<i class="fas fa-edit" style="color:var(--primary)"></i> Editar — Unidad ${unit.id}`;
  document.getElementById('editUnitId').value       = unit.id;
  document.getElementById('editTitle').value         = unit.title;
  document.getElementById('editTag').value           = unit.tag || '';
  document.getElementById('editTopics').value        = (unit.topics || []).join('\n');
  document.getElementById('editContent').value       = (unit.content || '').trim();
  document.getElementById('editUnitAlert').innerHTML = '';
  document.getElementById('pdfFile').value           = '';
  document.getElementById('pdfUploadStatus').innerHTML = '';
  document.getElementById('btnDeleteUnit').style.display = 'inline-flex';

  const pdfInfo = document.getElementById('currentPdfInfo');
  if (unit.pdf_url) {
    pdfInfo.style.display = 'block';
    document.getElementById('currentPdfLink').href = unit.pdf_url;
  } else {
    pdfInfo.style.display = 'none';
  }
  openModal('modalEditUnit');
}

async function saveUnit() {
  const unitId  = parseInt(document.getElementById('editUnitId').value);
  const title   = document.getElementById('editTitle').value.trim();
  const tag     = document.getElementById('editTag').value.trim();
  const topics  = document.getElementById('editTopics').value
                    .split('\n').map(t => t.trim()).filter(Boolean);
  const content = document.getElementById('editContent').value.trim();
  const pdfFile = document.getElementById('pdfFile').files[0];

  if (!unitId || !title) {
    showAlert('editUnitAlert', 'N° de unidad y título son obligatorios.', 'danger');
    return;
  }

  // Subir PDF si se seleccionó uno
  let pdf_url = liveUnits.find(u => u.id === unitId)?.pdf_url || null;
  if (pdfFile) {
    const statusEl = document.getElementById('pdfUploadStatus');
    statusEl.innerHTML = '<span style="color:#6b7280"><i class="fas fa-circle-notch fa-spin"></i> Subiendo PDF...</span>';

    const fileName = `unidad-${unitId}-${Date.now()}.pdf`;
    const { error: upErr } = await db.storage
      .from('unit-pdfs')
      .upload(fileName, pdfFile, { upsert: true, contentType: 'application/pdf' });

    if (upErr) {
      statusEl.innerHTML = `<span style="color:#ef4444"><i class="fas fa-times-circle"></i> Error al subir PDF: ${upErr.message}</span>`;
      return;
    }
    const { data: urlData } = db.storage.from('unit-pdfs').getPublicUrl(fileName);
    pdf_url = urlData.publicUrl;
    statusEl.innerHTML = `<span style="color:#10b981"><i class="fas fa-check-circle"></i> PDF subido correctamente.</span>`;
  }

  const payload = {
    unit_id: unitId, title, tag,
    topics:  JSON.stringify(topics),
    content, pdf_url,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from('units').upsert(payload, { onConflict: 'unit_id' });
  if (error) {
    showAlert('editUnitAlert', `Error al guardar: ${error.message}`, 'danger');
    return;
  }

  if (currentUnitId && currentUnitId !== unitId) {
    await db.from('units').delete().eq('unit_id', currentUnitId);
    liveUnits = liveUnits.filter(u => u.id !== currentUnitId);
  }

  const updated = { id: unitId, title, tag, topics, content, pdf_url };
  const idx = liveUnits.findIndex(u => u.id === unitId);
  if (idx !== -1) liveUnits[idx] = updated;
  else liveUnits.push(updated);

  closeModal('modalEditUnit');
  renderUnitsGrid('unitsGrid');
  renderUnitsGrid('unitsGridStudent');
  renderAdminUnitsEdit();
  toast(`Unidad ${unitId} guardada.`);
}

async function deleteUnit() {
  if (!currentUnitId) return;
  if (!confirm(`¿Seguro que querés eliminar la Unidad ${currentUnitId}? Esta acción no se puede deshacer.`)) return;

  const { error } = await db.from('units').delete().eq('unit_id', currentUnitId);
  if (error) { toast(`Error al eliminar: ${error.message}`); return; }

  liveUnits = liveUnits.filter(u => u.id !== currentUnitId);
  closeModal('modalEditUnit');
  renderUnitsGrid('unitsGrid');
  renderUnitsGrid('unitsGridStudent');
  renderAdminUnitsEdit();
  toast(`Unidad ${currentUnitId} eliminada.`);
}

// ── NOTIFICATIONS ─────────────────────────────────────────────
function sendNotification() {
  const target   = document.getElementById('notifTarget').value;
  const channel  = document.getElementById('notifChannel').value;
  const subject  = document.getElementById('notifSubject').value.trim();
  const message  = document.getElementById('notifMessage').value.trim();

  if (!subject || !message) { toast('Completá asunto y mensaje.'); return; }

  if (channel === 'email') {
    let to = '';
    if (target === 'all') {
      // Open mailto with all emails (comma-separated from table)
      const rows = document.querySelectorAll('#studentsBody tr td:nth-child(2)');
      to = Array.from(rows).map(td => td.textContent).join(',');
    } else {
      to = document.getElementById('notifStudent').value;
    }
    window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`);

  } else if (channel === 'whatsapp') {
    const text = `*${subject}*\n\n${message}`;
    if (target === 'all') {
      window.open(WA_GROUP_LINK);
      toast('Se abrió el grupo de WhatsApp. Pegá el mensaje manualmente.');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }

  } else if (channel === 'telegram') {
    if (target === 'all') {
      window.open(TG_GROUP_LINK);
      toast('Se abrió el grupo de Telegram. Enviá el mensaje manualmente.');
    } else {
      window.open(`https://t.me/share/url?text=${encodeURIComponent(subject + '\n\n' + message)}`);
    }
  }
}

// ── UI HELPERS ────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const map = { home: 'pageHome', student: 'pageStudent', admin: 'pageAdmin' };
  const el = document.getElementById(map[name]);
  if (el) el.classList.add('active');
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  // Clear alerts
  ['loginAlert','registerAlert'].forEach(aid => {
    const el = document.getElementById(aid);
    if (el) el.innerHTML = '';
  });
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
}

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

function switchTab(groupId, activeId) {
  // Find all tab-btn and tab-panel within the same parent section
  const allBtns = document.querySelectorAll('.tab-btn');
  const allPanels = document.querySelectorAll('.tab-panel');
  const activePanel = document.getElementById(activeId);
  if (!activePanel) return;

  // Determine which tab group this panel belongs to
  const parent = activePanel.parentElement;
  parent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  activePanel.classList.add('active');

  // Update button states
  const tabsEl = activePanel.parentElement.querySelector('.tabs');
  if (tabsEl) {
    tabsEl.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('onclick')?.includes(activeId)) btn.classList.add('active');
    });
  }
}
