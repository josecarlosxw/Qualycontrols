/**
 * m2/planilha.js
 * --------------
 * Registros do MÓDULO 2 — tabela com busca, edição inline e exclusão.
 * As colunas são exatamente as da planilha modelo (M2_FIELDS).
 */

function m2PlanilhaRows() {
    const term = (document.getElementById('m2-planilha-search')?.value || '').toLowerCase().trim();
    if (!term) return allReworks;
    return allReworks.filter((r) =>
        M2_FIELDS.some((c) => String(r[c.key] ?? '').toLowerCase().includes(term))
    );
}

function m2EscapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function m2CellText(column, value) {
    if (column.type === 'date') return m2FormatDateBR(value);
    if (column.type === 'number') return m2FormatNumber(value);
    return value ?? '';
}

function m2RenderPlanilha() {
    const head = document.getElementById('m2-planilha-thead-row');
    const body = document.getElementById('m2-planilha-tbody');
    const count = document.getElementById('m2-planilha-count');
    if (!head || !body) return;

    head.innerHTML = M2_FIELDS.map((c) => `<th class="whitespace-nowrap">${c.header}</th>`).join('') +
        '<th class="text-right whitespace-nowrap">Retrabalho</th><th class="text-right whitespace-nowrap">Refugo</th><th></th>';

    const rows = m2PlanilhaRows();
    if (count) count.textContent = `${rows.length} registro(s)`;

    if (!rows.length) {
        body.innerHTML = `<tr><td colspan="${M2_FIELDS.length + 3}" class="text-center text-sm text-gray-500 py-8">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    body.innerHTML = rows.map((r) => `
        <tr data-id="${r.id}">
            ${M2_FIELDS.map((c) => `<td class="editable whitespace-nowrap" data-key="${c.key}">${m2EscapeHtml(m2CellText(c, r[c.key]))}</td>`).join('')}
            <td class="text-right font-semibold" style="color:var(--accent)">${m2FormatNumber(calcReworkQty(r))}</td>
            <td class="text-right font-semibold" style="color:var(--danger)">${m2FormatNumber(calcScrapQty(r))}</td>
            <td class="text-right">
                <button class="m2-row-delete text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                    <i class="ph ph-trash text-lg"></i>
                </button>
            </td>
        </tr>`).join('');
}

function m2BuildEditor(column, value) {
    if (column.type === 'select') {
        const options = column.source() || [];
        const list = options.includes(value) || !value ? options : [value, ...options];
        return `<select class="input-premium w-full text-sm">
            <option value=""></option>
            ${list.map((o) => `<option value="${m2EscapeHtml(o)}" ${o === value ? 'selected' : ''}>${m2EscapeHtml(o)}</option>`).join('')}
        </select>`;
    }
    const type = column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text';
    const step = column.type === 'number' ? ' step="any"' : '';
    return `<input type="${type}"${step} class="input-premium w-full text-sm" value="${m2EscapeHtml(value)}">`;
}

async function m2CommitCell(cell, column, id, rawValue) {
    const value = column.type === 'number' ? Number(rawValue) || 0 : rawValue;
    const record = allReworks.find((r) => r.id === id);
    const previous = record ? record[column.key] : '';

    cell.classList.remove('editing');
    cell.textContent = m2CellText(column, value);

    if (String(previous ?? '') === String(value ?? '')) {
        m2RenderPlanilha();
        return;
    }

    try {
        await updateRework(id, { [column.key]: value });
        if (record) record[column.key] = value;
        showToast('Registro atualizado.', 'success');
    } catch (error) {
        console.error(error);
        showToast('Erro ao atualizar registro.', 'error');
    }
    m2RenderPlanilha();
}

function m2StartEdit(cell) {
    if (cell.classList.contains('editing')) return;
    const key = cell.dataset.key;
    const column = M2_FIELDS.find((c) => c.key === key);
    const id = cell.closest('tr')?.dataset.id;
    if (!column || !id) return;

    const record = allReworks.find((r) => r.id === id);
    const value = record ? record[key] ?? '' : '';

    cell.classList.add('editing');
    cell.innerHTML = m2BuildEditor(column, value);
    const field = cell.querySelector('input, select');
    if (!field) return;
    field.focus();

    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        m2CommitCell(cell, column, id, field.value);
    };

    field.addEventListener('blur', finish);
    field.addEventListener('change', () => { if (field.tagName === 'SELECT') finish(); });
    field.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); finish(); }
        if (e.key === 'Escape') { done = true; m2RenderPlanilha(); }
    });
}

async function m2AddRow() {
    try {
        await addRework(m2EmptyRecord());
        await loadReworks();
        m2RenderPlanilha();
        showToast('Nova linha criada.', 'success');
    } catch (error) {
        console.error(error);
        showToast('Erro ao criar nova linha.', 'error');
    }
}

async function m2DeleteRow(id) {
    if (!confirm('Excluir este registro? Esta ação não pode ser desfeita.')) return;
    try {
        await deleteRework(id);
        allReworks = allReworks.filter((r) => r.id !== id);
        showToast('Registro excluído.', 'success');
        m2RenderPlanilha();
    } catch (error) {
        console.error(error);
        showToast('Erro ao excluir registro.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('m2-planilha-search')?.addEventListener('input', m2RenderPlanilha);
    document.getElementById('m2-btn-exportar')?.addEventListener('click', () => exportReworksToExcel(m2PlanilhaRows()));
    document.getElementById('m2-btn-nova-linha')?.addEventListener('click', m2AddRow);

    document.getElementById('m2-planilha-tbody')?.addEventListener('click', (event) => {
        const del = event.target.closest('.m2-row-delete');
        if (del) {
            m2DeleteRow(del.closest('tr').dataset.id);
            return;
        }
        const cell = event.target.closest('td.editable');
        if (cell) m2StartEdit(cell);
    });

    auth.onAuthStateChanged(async (user) => {
        if (!user) return;
        await loadReworkSettings();
        await loadReworks();
        m2RenderPlanilha();
    });
});
