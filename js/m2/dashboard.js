/**
 * m2/dashboard.js
 * ---------------
 * Painel do MÓDULO 2 — Retrabalho e Refugo.
 * Métricas em QUANTIDADE, com painéis por máquina e ranking de motivos.
 * Retrabalho = Total ret. caixa + Total ret. embalagem · Refugo = Total refugo.
 */

let m2Charts = {};

/** Filtros dinâmicos: id do <select> -> campo do registro. */
const M2_FILTER_FIELDS = [
    { id: 'm2-filter-machine', field: 'machine', label: 'Todas as Máquinas', source: () => M2_MACHINES },
    { id: 'm2-filter-shift', field: 'shift', label: 'Todos os Turnos', source: () => M2_SHIFTS },
    { id: 'm2-filter-reason', field: 'reason', label: 'Todos os Motivos', source: () => M2_REASONS },
    { id: 'm2-filter-product', field: 'product', label: 'Todos os Produtos', source: () => M2_PRODUCTS },
    { id: 'm2-filter-responsible', field: 'rework_responsible', label: 'Todos os Responsáveis', source: () => M2_RESPONSIBLES },
];

function m2ChartColors() {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => (styles.getPropertyValue(name) || '').trim() || fallback;
    return {
        accent: '#3B82F6',
        info: '#06B6D4',
        success: '#10B981',
        scrap: '#F43F5E',
        danger: '#F43F5E',
        warning: '#F59E0B',
        violet: '#8B5CF6',
        grid: read('--border-color', '#22242B'),
        text: read('--text-secondary', '#9ca3af'),
    };
}

function m2DestroyChart(key) {
    if (m2Charts[key]) {
        m2Charts[key].destroy();
        delete m2Charts[key];
    }
}

function m2Val(id, fallback = 'all') {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
}

/** Métrica ativa: retrabalho, refugo ou total (retrabalho + refugo). */
function m2Metric() {
    return m2Val('m2-filter-metric', 'total');
}

function m2MetricLabel() {
    return { rework: 'Retrabalho', scrap: 'Refugo' }[m2Metric()] || 'Total (retrab. + refugo)';
}

function m2MetricValue(item) {
    const metric = m2Metric();
    if (metric === 'rework') return calcReworkQty(item);
    if (metric === 'scrap') return calcScrapQty(item);
    return calcReworkQty(item) + calcScrapQty(item);
}

function m2GetData() {
    let data = getFilteredReworks(m2Val('m2-filter-period'));

    const from = m2Val('m2-filter-from', '');
    const to = m2Val('m2-filter-to', '');
    if (from) data = data.filter((i) => String(i.date || '') >= from);
    if (to) data = data.filter((i) => String(i.date || '') <= to);

    M2_FILTER_FIELDS.forEach(({ id, field }) => {
        const value = m2Val(id);
        if (value && value !== 'all') data = data.filter((i) => (i[field] || '') === value);
    });

    return data;
}

const m2Sum = (list, fn) => list.reduce((acc, i) => acc + fn(i), 0);

function m2RenderKpis(data) {
    const set = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    const rework = m2Sum(data, calcReworkQty);
    const scrap = m2Sum(data, calcScrapQty);
    const total = rework + scrap;

    set('m2-kpi-total', m2FormatNumber(total));
    set('m2-kpi-total-sub', `${m2FormatNumber(data.length)} registro(s)`);

    set('m2-kpi-rework', m2FormatNumber(rework));
    set('m2-kpi-rework-sub', total ? `${m2FormatPercent((rework / total) * 100)} do total` : '0,0% do total');

    set('m2-kpi-scrap', m2FormatNumber(scrap));
    set('m2-kpi-scrap-sub', total ? `${m2FormatPercent((scrap / total) * 100)} do total` : '0,0% do total');
}

function m2GroupByMonth(data) {
    const map = {};
    data.forEach((item) => {
        if (!item.date) return;
        const key = String(item.date).slice(0, 7);
        if (!map[key]) map[key] = { rework: 0, scrap: 0 };
        map[key].rework += calcReworkQty(item);
        map[key].scrap += calcScrapQty(item);
    });
    return Object.keys(map).sort().map((key) => ({ key, ...map[key] }));
}

function m2RenderEvolution(data) {
    const canvas = document.getElementById('m2EvolutionChart');
    if (!canvas) return;
    const c = m2ChartColors();
    const rows = m2GroupByMonth(data);
    const labels = rows.map((r) => {
        const [y, m] = r.key.split('-');
        return `${m}/${y.slice(2)}`;
    });

    m2DestroyChart('evolution');
    m2Charts.evolution = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Retrabalho', data: rows.map((r) => r.rework), borderColor: c.success, backgroundColor: `${c.success}22`, fill: true, tension: 0.35, borderWidth: 2, pointRadius: 3 },
                { label: 'Refugo', data: rows.map((r) => r.scrap), borderColor: c.scrap, backgroundColor: `${c.scrap}22`, fill: true, tension: 0.35, borderWidth: 2, pointRadius: 3 },
            ],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
            scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: c.grid } } },
        },
    });
}

function m2RankBy(data, field) {
    const map = {};
    data.forEach((item) => {
        const key = item[field] || 'Não informado';
        map[key] = (map[key] || 0) + m2MetricValue(item);
    });
    return Object.entries(map).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
}

function m2RenderReasons(data) {
    const canvas = document.getElementById('m2ReasonChart');
    if (!canvas) return;
    const c = m2ChartColors();
    const rows = m2RankBy(data, 'reason').slice(0, 6);
    m2DestroyChart('reason');
    m2Charts.reason = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: rows.map((r) => r[0]),
            datasets: [{ data: rows.map((r) => r[1]), backgroundColor: ['#3B82F6', '#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#64748B'], borderWidth: 0 }],
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } } } },
    });
}

/** Valor de um registro conforme a métrica escolhida no filtro próprio do gráfico. */
function m2ChartMetricValue(item, metric) {
    if (metric === 'rework') return calcReworkQty(item);
    if (metric === 'scrap') return calcScrapQty(item);
    return calcReworkQty(item) + calcScrapQty(item);
}

function m2ChartMetricLabel(metric) {
    return { rework: 'Retrabalho', scrap: 'Refugo' }[metric] || 'Retrabalho + Refugo';
}

/** Gráfico de não conformidades por máquina, com filtro de métrica próprio. */
function m2RenderMachines(data) {
    const canvas = document.getElementById('m2MachineChart');
    if (!canvas) return;
    const c = m2ChartColors();
    const metric = m2Val('m2-chart-machine-metric', 'total');
    const map = {};
    data.forEach((item) => {
        const key = item.machine || 'Não informado';
        map[key] = (map[key] || 0) + m2ChartMetricValue(item, metric);
    });
    const rows = Object.entries(map).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);

    m2DestroyChart('machine');
    m2Charts.machine = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: rows.map((r) => r[0]),
            datasets: [
                { label: m2ChartMetricLabel(metric), data: rows.map((r) => r[1]), backgroundColor: c.accent, borderRadius: 6, maxBarThickness: 26 },
            ],
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, grid: { color: c.grid } }, y: { grid: { display: false } } },
        },
    });
}

/** Gráfico de não conformidades por turno, com filtro de métrica próprio. */
function m2RenderShifts(data) {
    const canvas = document.getElementById('m2ShiftChart');
    if (!canvas) return;
    const c = m2ChartColors();
    const metric = m2Val('m2-chart-shift-metric', 'total');
    const map = {};
    data.forEach((item) => {
        const key = item.shift || 'Não informado';
        map[key] = (map[key] || 0) + m2ChartMetricValue(item, metric);
    });
    const rows = Object.entries(map).filter(([, v]) => v > 0).sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'pt-BR'));

    m2DestroyChart('shift');
    m2Charts.shift = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: rows.map((r) => r[0]),
            datasets: [
                { label: m2ChartMetricLabel(metric), data: rows.map((r) => r[1]), backgroundColor: c.info, borderRadius: 6, maxBarThickness: 48 },
            ],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: c.grid } } },
        },
    });
}

function m2EscapeText(value) {
    return String(value ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

/** Cartões individuais por máquina, com participação e principal motivo. */
function m2RenderMachinePanels(data) {
    const host = document.getElementById('m2-machine-panels');
    if (!host) return;

    const map = {};
    data.forEach((item) => {
        const key = item.machine || 'Não informado';
        if (!map[key]) map[key] = { rework: 0, scrap: 0, count: 0, reasons: {} };
        map[key].rework += calcReworkQty(item);
        map[key].scrap += calcScrapQty(item);
        map[key].count += 1;
        const reason = item.reason || 'Não informado';
        map[key].reasons[reason] = (map[key].reasons[reason] || 0) + calcReworkQty(item) + calcScrapQty(item);
    });

    const rows = Object.entries(map).sort((a, b) => (b[1].rework + b[1].scrap) - (a[1].rework + a[1].scrap));
    if (!rows.length) {
        host.innerHTML = '<p class="text-sm text-gray-500 py-6 text-center col-span-full">Nenhum lançamento no período.</p>';
        return;
    }

    const grandTotal = rows.reduce((acc, [, v]) => acc + v.rework + v.scrap, 0) || 1;

    host.innerHTML = rows.map(([name, v]) => {
        const total = v.rework + v.scrap;
        const share = (total / grandTotal) * 100;
        const reworkShare = total ? (v.rework / total) * 100 : 0;
        const topReason = Object.entries(v.reasons).sort((a, b) => b[1] - a[1])[0];
        return `
            <div class="m2-machine-card">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="m2-machine-name">${m2EscapeText(name)}</p>
                        <p class="m2-machine-meta">${m2FormatNumber(v.count)} registro(s)</p>
                    </div>
                    <span class="badge-premium badge-brand">${m2FormatPercent(share)}</span>
                </div>
                <p class="m2-machine-total">${m2FormatNumber(total)}</p>
                <div class="m2-machine-bar">
                    <div class="m2-bar-rework" style="width:${reworkShare.toFixed(1)}%"></div>
                    <div class="m2-bar-scrap" style="width:${(100 - reworkShare).toFixed(1)}%"></div>
                </div>
                <div class="m2-machine-legend">
                    <span><i class="dot dot-rework"></i> Retrab. ${m2FormatNumber(v.rework)}</span>
                    <span><i class="dot dot-scrap"></i> Refugo ${m2FormatNumber(v.scrap)}</span>
                </div>
                <p class="m2-machine-meta mt-2">Principal motivo: <strong>${m2EscapeText(topReason ? topReason[0] : '—')}</strong></p>
            </div>`;
    }).join('');
}

/** Ranking de motivos com barra de participação. */
function m2RenderTopTable(data) {
    const host = document.getElementById('m2-top-table');
    if (!host) return;
    const rows = m2RankBy(data, 'reason').slice(0, 10);
    if (!rows.length) {
        host.innerHTML = '<p class="text-sm text-gray-500 py-6 text-center">Nenhum lançamento no período.</p>';
        return;
    }
    const max = rows[0][1] || 1;
    host.innerHTML = `
        <table class="table-premium">
            <thead><tr><th>Motivo</th><th>Participação</th><th class="text-right">${m2MetricLabel()}</th></tr></thead>
            <tbody>
                ${rows.map(([name, value]) => `
                    <tr>
                        <td class="font-medium">${m2EscapeText(name)}</td>
                        <td>
                            <div style="height:6px;border-radius:99px;background:var(--surface-3);overflow:hidden;min-width:120px">
                                <div style="height:100%;width:${((value / max) * 100).toFixed(1)}%;background:var(--accent)"></div>
                            </div>
                        </td>
                        <td class="text-right font-semibold">${m2FormatNumber(value)}</td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
}

const M2_MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function m2TodayIso() { return m2NormalizeDate(new Date()); }

/** Preenche o seletor de mês do card com os meses presentes nos registros. */
function m2InitMaintenanceMonths() {
    const select = document.getElementById('m2-maint-month-select');
    if (!select) return;
    const current = select.value;
    const months = m2MaintenanceMonths(allReworks, m2TodayIso());
    select.innerHTML = months.map((k) => {
        const [y, m] = k.split('-');
        return `<option value="${k}">${M2_MONTH_NAMES[Number(m) - 1]} ${y}</option>`;
    }).join('');
    select.value = months.includes(current) ? current : m2TodayIso().slice(0, 7);

    const byMonth = {};
    m2MaintenanceDates(allReworks).forEach((d) => { byMonth[d.slice(0, 7)] = (byMonth[d.slice(0, 7)] || 0) + 1; });
    console.info('[Manutenção programada] Total encontrado:', Object.values(byMonth).reduce((a, b) => a + b, 0), byMonth);
}

/** Card de manutenção programada: semana, mês e ano do mês selecionado. */
function m2RenderMaintenance() {
    const select = document.getElementById('m2-maint-month-select');
    const monthKey = (select && select.value) || m2TodayIso().slice(0, 7);
    const s = m2MaintenanceStats(allReworks, monthKey, m2TodayIso());
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('m2-maint-week', m2FormatNumber(s.week));
    set('m2-maint-month', m2FormatNumber(s.month));
    set('m2-maint-year', m2FormatNumber(s.year));
    set('m2-maint-week-label', `Semana ${m2FormatDateBR(s.weekRange.start).slice(0, 5)} – ${m2FormatDateBR(s.weekRange.end).slice(0, 5)}`);
    set('m2-maint-month-label', M2_MONTH_NAMES[Number(monthKey.slice(5, 7)) - 1]);
    set('m2-maint-year-label', `Ano ${monthKey.slice(0, 4)}`);
}

function m2ApplyAndRender() {
    const data = m2GetData();
    m2RenderKpis(data);
    m2RenderEvolution(data);
    m2RenderMaintenance();
    m2RenderMachines(data);
    m2RenderShifts(data);
}

// Permite que o toggle de tema re-renderize os gráficos deste módulo
function applyAndRender() {
    if (typeof m2ApplyAndRender === 'function') m2ApplyAndRender();
}

/** Preenche cada filtro com os cadastros + valores já usados nos lançamentos. */
function m2InitFilters() {
    M2_FILTER_FIELDS.forEach(({ id, field, label, source }) => {
        const select = document.getElementById(id);
        if (!select) return;
        const current = select.value;
        const values = Array.from(new Set([...(source() || []), ...allReworks.map((r) => r[field]).filter(Boolean)]))
            .sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
        select.innerHTML = `<option value="all">${label}</option>` +
            values.map((v) => `<option value="${m2EscapeText(v)}">${m2EscapeText(v)}</option>`).join('');
        if (current && values.includes(current)) select.value = current;
    });
}

function m2ClearFilters() {
    const period = document.getElementById('m2-filter-period');
    if (period) period.value = 'thisYear';
    M2_FILTER_FIELDS.forEach(({ id }) => { const el = document.getElementById(id); if (el) el.value = 'all'; });
    ['m2-filter-from', 'm2-filter-to'].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });
    m2ApplyAndRender();
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.plugins.tooltip.backgroundColor = '#1a1f36';
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
        Chart.defaults.plugins.tooltip.padding = 10;
    }

    document.getElementById('m2-filter-clear')?.addEventListener('click', m2ClearFilters);
    document.getElementById('m2-export-dashboard')?.addEventListener('click', () => exportReworksToExcel(m2GetData()));

    auth.onAuthStateChanged(async (user) => {
        if (!user) return;
        await loadReworkSettings();
        await loadReworks();
        m2InitFilters();
        m2InitMaintenanceMonths();
        document.getElementById('m2-maint-month-select')?.addEventListener('change', m2RenderMaintenance);
        const ids = ['m2-filter-period', 'm2-filter-metric', 'm2-chart-machine-metric', 'm2-chart-shift-metric', 'm2-filter-from', 'm2-filter-to', ...M2_FILTER_FIELDS.map((f) => f.id)];
        ids.forEach((id) => document.getElementById(id)?.addEventListener('change', m2ApplyAndRender));
        m2ApplyAndRender();
    });
});
