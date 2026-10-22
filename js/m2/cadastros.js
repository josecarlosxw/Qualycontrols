/**
 * m2/cadastros.js
 * ---------------
 * Cadastros do MÓDULO 2: máquinas, turnos, motivos, produtos e responsáveis.
 * Coleções isoladas do Módulo 1 (prefixo m2_).
 */

const M2_SETTINGS = [
    { collection: 'm2_machines', host: 'm2-list-machines', input: 'm2-input-machines', label: 'Máquina' },
    { collection: 'm2_shifts', host: 'm2-list-shifts', input: 'm2-input-shifts', label: 'Turno' },
    { collection: 'm2_reasons', host: 'm2-list-reasons', input: 'm2-input-reasons', label: 'Motivo' },
    { collection: 'm2_products', host: 'm2-list-products', input: 'm2-input-products', label: 'Produto' },
    { collection: 'm2_responsibles', host: 'm2-list-responsibles', input: 'm2-input-responsibles', label: 'Responsável' },
];

let m2SettingsData = {};

function m2EscapeSetting(value) {
    return String(value ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function m2RenderSettingList(config) {
    const host = document.getElementById(config.host);
    if (!host) return;
    const items = (m2SettingsData[config.collection] || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));

    if (!items.length) {
        host.innerHTML = '<p class="text-sm text-gray-500 py-6 text-center">Nenhum item cadastrado.</p>';
        return;
    }

    host.innerHTML = items.map((item) => `
        <div class="config-item flex items-center justify-between gap-3">
            <span class="text-sm truncate">${m2EscapeSetting(item.name)}</span>
            <button class="text-gray-400 hover:text-red-500 transition-colors" data-collection="${config.collection}" data-id="${item.id}" title="Remover">
                <i class="ph ph-trash"></i>
            </button>
        </div>`).join('');
}

function m2RenderAllSettings() {
    M2_SETTINGS.forEach(m2RenderSettingList);
}

async function m2ReloadSettings() {
    const entries = await Promise.all(
        M2_SETTINGS.map(async (c) => [c.collection, await m2FetchCollection(c.collection)])
    );
    m2SettingsData = Object.fromEntries(entries);
    await loadReworkSettings();
    m2RenderAllSettings();
}

async function m2HandleAdd(config) {
    const input = document.getElementById(config.input);
    if (!input) return;
    const name = input.value.trim();
    if (!name) {
        showToast(`Informe o nome d${config.label === 'Máquina' ? 'a' : 'o'} ${config.label.toLowerCase()}.`, 'error');
        return;
    }
    const exists = (m2SettingsData[config.collection] || []).some((i) => String(i.name).toLowerCase() === name.toLowerCase());
    if (exists) {
        showToast('Este item já está cadastrado.', 'error');
        return;
    }

    try {
        await m2AddSetting(config.collection, name);
        input.value = '';
        showToast(`${config.label} adicionad${config.label === 'Máquina' ? 'a' : 'o'}.`, 'success');
        await m2ReloadSettings();
    } catch (error) {
        console.error(error);
        showToast('Erro ao salvar o cadastro.', 'error');
    }
}

async function m2HandleDelete(collection, id) {
    if (!confirm('Remover este item do cadastro?')) return;
    try {
        await m2DeleteSetting(collection, id);
        showToast('Item removido.', 'success');
        await m2ReloadSettings();
    } catch (error) {
        console.error(error);
        showToast('Erro ao remover o item.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    M2_SETTINGS.forEach((config) => {
        document.querySelector(`[data-add="${config.collection}"]`)?.addEventListener('click', () => m2HandleAdd(config));
        document.getElementById(config.input)?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); m2HandleAdd(config); }
        });
        document.getElementById(config.host)?.addEventListener('click', (event) => {
            const btn = event.target.closest('button[data-id]');
            if (btn) m2HandleDelete(btn.dataset.collection, btn.dataset.id);
        });
    });

    auth.onAuthStateChanged(async (user) => {
        if (!user) return;
        await m2ReloadSettings();
    });
});
