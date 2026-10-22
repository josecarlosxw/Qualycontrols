/**
 * api-m2.js
 * ---------
 * Camada de dados do MÓDULO 2 — Controle de Retrabalho e Refugo.
 * Totalmente isolada do Módulo 1: coleções, listas e cálculos próprios.
 *
 * O modelo de registro segue EXATAMENTE as colunas da planilha modelo
 * (modelo-retrabalho.xlsx), usada tanto na importação quanto na exportação.
 */

/** Campos do registro ⇄ cabeçalhos da planilha modelo (ordem oficial). */
const M2_FIELDS = [
    { key: 'date', header: 'Data de produção', type: 'date', label: 'Data' },
    { key: 'machine', header: 'Máquina', type: 'select', source: () => M2_MACHINES, label: 'Máquina' },
    { key: 'shift', header: 'Turno', type: 'select', source: () => M2_SHIFTS, label: 'Turno' },
    { key: 'operators', header: 'Operadores', type: 'text', label: 'Operadores' },
    { key: 'op', header: 'OP', type: 'text', label: 'OP' },
    { key: 'product', header: 'Produto', type: 'select', source: () => M2_PRODUCTS, label: 'Produto' },
    { key: 'sku', header: 'SKU', type: 'text', label: 'SKU' },
    { key: 'lot', header: 'Lote', type: 'text', label: 'Lote' },
    { key: 'scrap_total', header: 'Total refugo', type: 'number', label: 'Total refugo' },
    { key: 'rework_box', header: 'Ret. caixa', type: 'number', label: 'Ret. caixa' },
    { key: 'rework_box_total', header: 'Total ret. caixa', type: 'number', label: 'Total ret. caixa' },
    { key: 'rework_pack', header: 'Ret. embalagem', type: 'number', label: 'Ret. embalagem' },
    { key: 'rework_pack_total', header: 'Total ret. embalagem', type: 'number', label: 'Total ret. emb.' },
    { key: 'rework_responsible', header: 'Responsável retrabalho', type: 'select', source: () => M2_RESPONSIBLES, label: 'Resp. retrabalho' },
    { key: 'check_responsible', header: 'Responsável conferência', type: 'select', source: () => M2_RESPONSIBLES, label: 'Resp. conferência' },
    { key: 'reason', header: 'Motivo', type: 'select', source: () => M2_REASONS, label: 'Motivo' },
    { key: 'notes', header: 'Observações', type: 'text', label: 'Observações' },
];

const M2_MAINTENANCE_REASON = 'Manutenção programada';

let M2_MACHINES = [];
let M2_SHIFTS = [];
let M2_REASONS = [];
let M2_PRODUCTS = [];
let M2_RESPONSIBLES = [];

let allReworks = [];

/** Quantidade retrabalhada = Total ret. caixa + Total ret. embalagem. */
function calcReworkQty(item) {
    return (Number(item.rework_box_total) || 0) + (Number(item.rework_pack_total) || 0);
}

/** Quantidade refugada = Total refugo. */
function calcScrapQty(item) {
    return Number(item.scrap_total) || 0;
}

function m2FormatNumber(value) {
    return (Number(value) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function m2FormatPercent(value) {
    return `${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/** Converte qualquer entrada de data (Date, serial Excel, dd/mm/aaaa, ISO) em 'aaaa-mm-dd'. */
function m2NormalizeDate(value) {
    if (value === null || value === undefined || value === '') return '';
    if (value instanceof Date && !isNaN(value)) {
        return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }
    if (typeof value === 'number') {
        const d = new Date(Math.round((value - 25569) * 864e5));
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }
    const str = String(value).trim();
    let m = str.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
    if (m) {
        const year = m[3].length === 2 ? `20${m[3]}` : m[3];
        return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const d = new Date(str);
    return isNaN(d) ? '' : m2NormalizeDate(d);
}

function m2FormatDateBR(iso) {
    if (!iso) return '';
    const [y, m, d] = String(iso).split('-');
    return d && m && y ? `${d}/${m}/${y}` : iso;
}

async function m2FetchCollection(name) {
    try {
        const snapshot = await window.db.collection(name).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name }));
    } catch (error) {
        reportDataError(name, error);
        return [];
    }
}

/** Carrega os cadastros do Módulo 2 (máquinas, turnos, motivos, produtos, responsáveis). */
async function loadReworkSettings() {
    const [machines, shifts, reasons, products, responsibles] = await Promise.all([
        m2FetchCollection('m2_machines'),
        m2FetchCollection('m2_shifts'),
        m2FetchCollection('m2_reasons'),
        m2FetchCollection('m2_products'),
        m2FetchCollection('m2_responsibles'),
    ]);

    M2_MACHINES = machines.map((x) => x.name);
    M2_SHIFTS = shifts.map((x) => x.name);
    M2_REASONS = reasons.map((x) => x.name);
    M2_PRODUCTS = products.map((x) => x.name);
    M2_RESPONSIBLES = responsibles.map((x) => x.name);

    return { machines, shifts, reasons, products, responsibles };
}

/** Carrega todos os registros, do mais recente ao mais antigo. */
async function loadReworks() {
    try {
        const snapshot = await window.db.collection('rework_entries').get();
        allReworks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        allReworks.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        return allReworks;
    } catch (error) {
        reportDataError('rework_entries', error);
        allReworks = [];
        return [];
    }
}

function m2EmptyRecord() {
    const rec = {};
    M2_FIELDS.forEach((f) => { rec[f.key] = f.type === 'number' ? 0 : ''; });
    rec.date = new Date().toISOString().slice(0, 10);
    return rec;
}

async function addRework(data) {
    await window.db.collection('rework_entries').add({
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return true;
}

async function addMultipleReworks(list, importId) {
    const CHUNK = 450;
    let total = 0;
    for (let i = 0; i < list.length; i += CHUNK) {
        const chunk = list.slice(i, i + CHUNK);
        const batch = window.db.batch();
        chunk.forEach((data) => {
            const ref = window.db.collection('rework_entries').doc();
            batch.set(ref, { ...data, ...(importId ? { importId } : {}), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        });
        await batch.commit();
        total += chunk.length;
    }
    return total;
}

async function updateRework(id, data) {
    await window.db.collection('rework_entries').doc(id).update(data);
    return true;
}

async function deleteRework(id) {
    await window.db.collection('rework_entries').doc(id).delete();
    return true;
}

async function m2AddSetting(type, name) {
    await window.db.collection(type).add({ name });
}

async function m2DeleteSetting(type, id) {
    await window.db.collection(type).doc(id).delete();
}

/* ---------- Histórico de importações ---------- */

/**
 * Apaga uma importação inteira: todos os registros gerados por ela e o log.
 * Importações antigas (sem importId) são identificadas pelos registros
 * criados até 10 min antes do log, limitados à quantidade importada.
 */
async function m2DeleteImport(log) {
    const col = window.db.collection('rework_entries');
    let refs = (await col.where('importId', '==', log.id).get()).docs.map((d) => d.ref);
    if (!refs.length && log.createdAt && log.imported) {
        const end = log.createdAt.toMillis();
        const start = end - 10 * 60 * 1000;
        const snap = await col.get();
        refs = snap.docs
            .filter((d) => { const x = d.data(); const t = x.createdAt?.toMillis?.(); return !x.importId && t && t >= start && t <= end + 5000; })
            .sort((a, b) => b.data().createdAt.toMillis() - a.data().createdAt.toMillis())
            .slice(0, log.imported)
            .map((d) => d.ref);
    }
    for (let i = 0; i < refs.length; i += 450) {
        const batch = window.db.batch();
        refs.slice(i, i + 450).forEach((r) => batch.delete(r));
        await batch.commit();
    }
    await window.db.collection('m2_imports').doc(log.id).delete();
    return refs.length;
}

function m2NewImportId() {
    return window.db.collection('m2_imports').doc().id;
}

async function m2AddImportLog(entry, id) {
    const col = window.db.collection('m2_imports');
    await (id ? col.doc(id) : col.doc()).set({
        ...entry,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
}

async function m2LoadImportLogs() {
    try {
        const snapshot = await window.db.collection('m2_imports').get();
        const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        return rows;
    } catch (error) {
        reportDataError('import_logs', error);
        return [];
    }
}

/** Aplica o filtro de período. */
function getFilteredReworks(period) {
    const now = new Date();
    let start = null;
    if (period === 'last30') start = new Date(now.getTime() - 30 * 864e5);
    else if (period === 'last90') start = new Date(now.getTime() - 90 * 864e5);
    else if (period === 'thisMonth') start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'thisYear') start = new Date(now.getFullYear(), 0, 1);

    const startIso = start ? m2NormalizeDate(start) : null;
    return allReworks.filter((item) => {
        if (!item.date) return false;
        if (!startIso) return true;
        return String(item.date) >= startIso;
    });
}

/* ---------- Planilha: exportar / modelo ---------- */

function m2RowToSheet(r) {
    const row = {};
    M2_FIELDS.forEach((f) => {
        if (f.type === 'number') row[f.header] = Number(r[f.key]) || 0;
        else if (f.type === 'date') row[f.header] = m2FormatDateBR(r[f.key]);
        else row[f.header] = r[f.key] ?? '';
    });
    return row;
}

function exportReworksToExcel(list) {
    if (typeof XLSX === 'undefined') {
        alert('A biblioteca XLSX não está carregada.');
        return;
    }
    const source = Array.isArray(list) ? list : allReworks;
    const rows = source.map(m2RowToSheet);
    const ws = XLSX.utils.json_to_sheet(rows, { header: M2_FIELDS.map((f) => f.header) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Retrabalho');
    const dataStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Retrabalho_Refugo_${dataStr}.xlsx`);
}

/** Baixa a planilha modelo (somente cabeçalhos + linha de exemplo zerada). */
function downloadReworkTemplate() {
    if (typeof XLSX === 'undefined') {
        alert('A biblioteca XLSX não está carregada.');
        return;
    }
    const headers = M2_FIELDS.map((f) => f.header);
    const example = M2_FIELDS.map((f) => (f.type === 'number' ? 0 : ''));
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo-retrabalho.xlsx');
}

/* ---------- Planilha: importar ---------- */

function m2NormalizeHeader(value) {
    return String(value ?? '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Lê um arquivo .xlsx/.xls/.csv no formato do modelo e devolve
 * { records, errors, total, missingHeaders }.
 */
async function parseReworkSpreadsheet(file) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

    if (!matrix.length) return { records: [], errors: [], total: 0, missingHeaders: M2_FIELDS.map((f) => f.header) };

    const headerRow = matrix[0].map(m2NormalizeHeader);
    const colIndex = {};
    const missingHeaders = [];
    M2_FIELDS.forEach((f) => {
        const idx = headerRow.indexOf(m2NormalizeHeader(f.header));
        if (idx === -1) missingHeaders.push(f.header);
        else colIndex[f.key] = idx;
    });

    const records = [];
    const errors = [];
    let total = 0;

    matrix.slice(1).forEach((row, i) => {
        const line = i + 2;
        if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === '')) return;
        total += 1;

        const rec = {};
        M2_FIELDS.forEach((f) => {
            const raw = colIndex[f.key] !== undefined ? row[colIndex[f.key]] : null;
            if (f.type === 'number') {
                const n = typeof raw === 'string' ? Number(raw.replace(/\./g, '').replace(',', '.')) : Number(raw);
                rec[f.key] = isNaN(n) ? 0 : n;
            } else if (f.type === 'date') {
                rec[f.key] = m2NormalizeDate(raw);
            } else {
                rec[f.key] = raw === null || raw === undefined ? '' : String(raw).trim();
            }
        });

        if (!rec.date) { errors.push({ line, message: 'Data de produção inválida ou vazia.' }); return; }
        if (!rec.machine) { errors.push({ line, message: 'Máquina não informada.' }); return; }
        records.push(rec);
    });

    return { records, errors, total, missingHeaders };
}

/* ---------- Manutenção programada ---------- */

function m2NormText(v) {
    return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Registro é manutenção programada? Lê a coluna Produto (ignora acentos, maiúsculas e espaços extras). */
function m2IsMaintenance(r) {
    return m2NormText(r && r.product) === m2NormText(M2_MAINTENANCE_REASON);
}

/** Datas (aaaa-mm-dd) de todas as linhas de manutenção programada (cada linha conta). */
function m2MaintenanceDates(records) {
    const out = [];
    (records || []).forEach((r) => {
        if (!m2IsMaintenance(r)) return;
        const date = m2NormalizeDate(r.date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
        out.push(date);
    });
    return out;
}

/** Semana (segunda a domingo) que contém a data ISO informada. */
function m2WeekRange(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const base = new Date(Date.UTC(y, m - 1, d));
    const start = new Date(base); start.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
    const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
    const f = (x) => x.toISOString().slice(0, 10);
    return { start: f(start), end: f(end) };
}

/**
 * Contagem para o mês selecionado ('aaaa-mm').
 * Semana = semana atual se o mês é o atual; senão, a última semana do mês.
 */
function m2MaintenanceStats(records, monthKey, todayIso) {
    const dates = m2MaintenanceDates(records);
    const [y, m] = monthKey.split('-').map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const ref = todayIso && todayIso.slice(0, 7) === monthKey ? todayIso : lastDay;
    const week = m2WeekRange(ref);
    return {
        week: dates.filter((d) => d >= week.start && d <= week.end).length,
        month: dates.filter((d) => d.slice(0, 7) === monthKey).length,
        year: dates.filter((d) => d.slice(0, 4) === String(y)).length,
        weekRange: week,
        total: dates.length,
    };
}

/** Meses ('aaaa-mm') com manutenção nos dados + mês atual, do mais recente ao mais antigo. */
function m2MaintenanceMonths(records, todayIso) {
    const set = new Set(m2MaintenanceDates(records).map((d) => d.slice(0, 7)));
    if (todayIso) set.add(todayIso.slice(0, 7));
    return Array.from(set).sort().reverse();
}

if (typeof module !== 'undefined') module.exports = { m2NormalizeDate, m2IsMaintenance, m2MaintenanceDates, m2MaintenanceStats, m2MaintenanceMonths, m2WeekRange };
