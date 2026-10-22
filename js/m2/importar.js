/**
 * m2/importar.js
 * --------------
 * Importação de planilhas (Excel/CSV) no formato do modelo oficial.
 */

let m2ImportPending = null;
let m2ImportFileName = '';

function m2ImpEscape(value) {
    return String(value ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function m2StatusBadge(status) {
    const map = {
        'Concluída': 'badge-success',
        'Concluída com avisos': 'badge-warning',
        'Falhou': 'badge-danger',
    };
    return `<span class="badge-premium ${map[status] || 'badge-brand'}">${m2ImpEscape(status)}</span>`;
}

async function m2RenderImportHistory() {
    const host = document.getElementById('m2-import-history');
    if (!host) return;
    const logs = await m2LoadImportLogs();
    if (!logs.length) {
        host.innerHTML = '<p class="text-sm text-gray-500 py-6 text-center">Nenhuma importação realizada ainda.</p>';
        return;
    }
    host.innerHTML = `
        <table class="table-premium w-full">
            <thead><tr>
                <th>Arquivo</th><th>Data</th><th class="text-right">Linhas</th>
                <th class="text-right">Importados</th><th class="text-right">Erros</th><th>Status</th><th class="text-right">Ações</th>
            </tr></thead>
            <tbody>
                ${logs.map((l) => `
                    <tr>
                        <td class="font-medium">${m2ImpEscape(l.fileName)}</td>
                        <td>${m2FormatDateBR(l.date)}</td>
                        <td class="text-right">${m2FormatNumber(l.total)}</td>
                        <td class="text-right font-semibold" style="color:var(--accent)">${m2FormatNumber(l.imported)}</td>
                        <td class="text-right font-semibold" style="color:${l.errors ? 'var(--danger)' : 'inherit'}">${m2FormatNumber(l.errors)}</td>
                        <td>${m2StatusBadge(l.status)}</td>
                        <td class="text-right"><button type="button" class="btn-premium m2-import-del inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium" style="color:var(--danger)" data-id="${m2ImpEscape(l.id)}" title="Excluir importação e todos os seus registros"><i class="ph ph-trash"></i> Excluir</button></td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
    host.querySelectorAll('.m2-import-del').forEach((btn) => btn.addEventListener('click', async () => {
        const log = logs.find((l) => l.id === btn.dataset.id);
        if (!log) return;
        if (!confirm(`Excluir a importação "${log.fileName}" e todos os ${log.imported || 0} registro(s) dela? Esta ação não pode ser desfeita.`)) return;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Excluindo…';
        try {
            const n = await m2DeleteImport(log);
            showToast(`Importação excluída (${n} registro(s) apagado(s)).`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Erro ao excluir a importação.', 'error');
        }
        await m2RenderImportHistory();
    }));
}

function m2RenderPreview(result) {
    const card = document.getElementById('m2-import-preview');
    const body = document.getElementById('m2-import-preview-body');
    const summary = document.getElementById('m2-import-summary');
    const confirmBtn = document.getElementById('m2-import-confirm');
    if (!card || !body || !summary) return;

    card.classList.remove('hidden');

    const parts = [
        `<strong>${m2ImpEscape(m2ImportFileName)}</strong>`,
        `${m2FormatNumber(result.total)} linha(s) lidas`,
        `<span style="color:var(--accent)">${m2FormatNumber(result.records.length)} válida(s)</span>`,
    ];
    if (result.errors.length) parts.push(`<span style="color:var(--danger)">${m2FormatNumber(result.errors.length)} com erro</span>`);
    summary.innerHTML = parts.join(' · ');

    let html = '';
    if (result.missingHeaders.length) {
        html += `<div class="m2-import-alert danger"><i class="ph ph-warning"></i>
            Colunas ausentes na planilha: <strong>${result.missingHeaders.map(m2ImpEscape).join(', ')}</strong>.
            Baixe o modelo e confira os cabeçalhos.</div>`;
    }
    if (result.errors.length) {
        html += `<div class="m2-import-alert warning"><i class="ph ph-info"></i>
            ${result.errors.length} linha(s) serão ignoradas:
            <ul>${result.errors.slice(0, 8).map((e) => `<li>Linha ${e.line}: ${m2ImpEscape(e.message)}</li>`).join('')}
            ${result.errors.length > 8 ? `<li>… e mais ${result.errors.length - 8}</li>` : ''}</ul></div>`;
    }

    const preview = result.records.slice(0, 6);
    const cols = M2_FIELDS.slice(0, 9);
    html += preview.length ? `
        <div class="overflow-x-auto">
            <table class="table-premium w-full text-xs">
                <thead><tr>${cols.map((c) => `<th class="whitespace-nowrap">${c.header}</th>`).join('')}<th>Retrabalho</th></tr></thead>
                <tbody>${preview.map((r) => `<tr>
                    ${cols.map((c) => `<td class="whitespace-nowrap">${m2ImpEscape(c.type === 'date' ? m2FormatDateBR(r[c.key]) : c.type === 'number' ? m2FormatNumber(r[c.key]) : r[c.key])}</td>`).join('')}
                    <td>${m2FormatNumber(calcReworkQty(r))}</td>
                </tr>`).join('')}</tbody>
            </table>
        </div>
        <p class="text-xs text-gray-500 mt-2">Prévia das ${preview.length} primeiras linhas válidas.</p>` :
        '<p class="text-sm text-gray-500 py-4 text-center">Nenhuma linha válida para importar.</p>';

    body.innerHTML = html;
    if (confirmBtn) confirmBtn.disabled = !result.records.length;
}

async function m2HandleFile(file) {
    if (!file) return;
    m2ImportFileName = file.name;
    try {
        const result = await parseReworkSpreadsheet(file);
        m2ImportPending = result;
        m2RenderPreview(result);
        if (!result.records.length && !result.missingHeaders.length) showToast('A planilha não possui linhas válidas.', 'error');
    } catch (error) {
        console.error(error);
        m2ImportPending = null;
        showToast('Não foi possível ler o arquivo. Use .xlsx, .xls ou .csv.', 'error');
    }
}

function m2CancelImport() {
    m2ImportPending = null;
    document.getElementById('m2-import-preview')?.classList.add('hidden');
    const input = document.getElementById('m2-import-file');
    if (input) input.value = '';
}

async function m2ConfirmImport() {
    if (!m2ImportPending || !m2ImportPending.records.length) return;
    const btn = document.getElementById('m2-import-confirm');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Importando…'; }

    const { records, errors, total } = m2ImportPending;
    let imported = 0;
    let status = 'Falhou';
    const importId = m2NewImportId();
    try {
        imported = await addMultipleReworks(records, importId);
        status = errors.length ? 'Concluída com avisos' : 'Concluída';
        showToast(`${imported} registro(s) importado(s).`, 'success');
    } catch (error) {
        console.error(error);
        showToast('Erro ao gravar os registros.', 'error');
    }

    try {
        await m2AddImportLog({
            fileName: m2ImportFileName,
            date: new Date().toISOString().slice(0, 10),
            total, imported, errors: errors.length + (total - errors.length - imported), status,
        }, importId);
    } catch (error) {
        console.error(error);
    }

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check"></i> Confirmar importação'; }
    m2CancelImport();
    await m2RenderImportHistory();
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('m2-import-file');
    document.getElementById('m2-import-select')?.addEventListener('click', () => input?.click());
    input?.addEventListener('change', () => m2HandleFile(input.files?.[0]));
    document.getElementById('m2-import-template')?.addEventListener('click', downloadReworkTemplate);
    document.getElementById('m2-import-confirm')?.addEventListener('click', m2ConfirmImport);
    document.getElementById('m2-import-cancel')?.addEventListener('click', m2CancelImport);

    const drop = document.getElementById('m2-import-drop');
    if (drop) {
        ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('dragging'); }));
        ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('dragging'); }));
        drop.addEventListener('drop', (e) => m2HandleFile(e.dataTransfer?.files?.[0]));
    }

    auth.onAuthStateChanged(async (user) => {
        if (!user) return;
        await m2RenderImportHistory();
    });
});
