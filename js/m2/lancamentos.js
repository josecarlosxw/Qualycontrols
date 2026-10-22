/**
 * m2/lancamentos.js
 * -----------------
 * Formulário de lançamento manual seguindo exatamente os campos da planilha
 * modelo (M2_FIELDS) do Módulo 2 — Retrabalho e Refugo.
 */

function m2LancEscape(value) {
    return String(value ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

const M2_REQUIRED = ['date', 'machine'];

function m2RenderFormFields() {
    const host = document.getElementById('m2-form-fields');
    if (!host) return;

    host.innerHTML = M2_FIELDS.map((f) => {
        const req = M2_REQUIRED.includes(f.key) ? ' *' : '';
        const id = `m2-f-${f.key}`;
        let control;
        if (f.type === 'select') {
            const options = (f.source() || []).map((v) => `<option value="${m2LancEscape(v)}">${m2LancEscape(v)}</option>`).join('');
            control = `<select id="${id}" class="input-premium w-full"><option value="">Selecione</option>${options}</select>`;
        } else if (f.type === 'number') {
            control = `<input type="number" step="any" id="${id}" class="input-premium w-full" placeholder="0">`;
        } else if (f.type === 'date') {
            control = `<input type="date" id="${id}" class="input-premium w-full">`;
        } else if (f.key === 'notes') {
            control = `<textarea id="${id}" rows="3" class="input-premium w-full" placeholder="Detalhes adicionais"></textarea>`;
        } else {
            control = `<input type="text" id="${id}" class="input-premium w-full">`;
        }
        const span = f.key === 'notes' ? ' md:col-span-3' : '';
        return `<div class="${span}"><label class="block text-sm font-medium mb-1">${m2LancEscape(f.label)}${req}</label>${control}</div>`;
    }).join('');

    const dateEl = document.getElementById('m2-f-date');
    if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
}

function m2UpdateTotals() {
    const num = (key) => Number(document.getElementById(`m2-f-${key}`)?.value) || 0;
    const rework = num('rework_box_total') + num('rework_pack_total');
    const scrap = num('scrap_total');
    const rw = document.getElementById('m2-total-rework');
    const sc = document.getElementById('m2-total-scrap');
    if (rw) rw.textContent = m2FormatNumber(rework);
    if (sc) sc.textContent = m2FormatNumber(scrap);
}

function m2RenderRecent() {
    const host = document.getElementById('m2-recent-list');
    if (!host) return;
    const rows = allReworks.slice(0, 8);
    if (!rows.length) {
        host.innerHTML = '<p class="text-sm text-gray-500 py-6 text-center">Nenhum lançamento ainda.</p>';
        return;
    }
    host.innerHTML = rows.map((r) => `
        <div class="config-item flex items-center justify-between gap-3">
            <div class="min-w-0">
                <p class="text-sm font-medium truncate">${m2LancEscape(r.machine || '—')} · ${m2LancEscape(r.product || '—')}</p>
                <p class="text-xs text-gray-500">${m2FormatDateBR(r.date)} · ${m2LancEscape(r.reason || 'Sem motivo')}</p>
            </div>
            <div class="text-right shrink-0">
                <p class="text-xs"><span class="badge-premium badge-info">Ret. ${m2FormatNumber(calcReworkQty(r))}</span></p>
                <p class="text-xs mt-1"><span class="badge-premium badge-danger">Ref. ${m2FormatNumber(calcScrapQty(r))}</span></p>
            </div>
        </div>`).join('');
}

async function m2HandleSubmit(event) {
    event.preventDefault();

    const payload = {};
    M2_FIELDS.forEach((f) => {
        const el = document.getElementById(`m2-f-${f.key}`);
        const raw = el?.value ?? '';
        payload[f.key] = f.type === 'number' ? (Number(raw) || 0) : String(raw).trim();
    });

    if (!payload.date || !payload.machine) {
        showToast('Informe ao menos a Data de produção e a Máquina.', 'error');
        return;
    }

    const btn = document.getElementById('m2-submit-btn');
    if (btn) { btn.disabled = true; btn.classList.add('opacity-60'); }

    try {
        await addRework(payload);
        showToast('Lançamento registrado com sucesso!', 'success');
        document.getElementById('m2-form')?.reset();
        m2RenderFormFields();
        m2UpdateTotals();
        await loadReworks();
        m2RenderRecent();
    } catch (error) {
        console.error(error);
        showToast('Erro ao salvar lançamento.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.classList.remove('opacity-60'); }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    m2RenderFormFields();
    document.getElementById('m2-form')?.addEventListener('input', m2UpdateTotals);
    document.getElementById('m2-form')?.addEventListener('submit', m2HandleSubmit);

    auth.onAuthStateChanged(async (user) => {
        if (!user) return;
        await loadReworkSettings();
        m2RenderFormFields();
        m2UpdateTotals();
        await loadReworks();
        m2RenderRecent();
    });
});
