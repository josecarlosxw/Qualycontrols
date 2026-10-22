/**
 * filters.js
 * ----------
 * Controla os filtros do dashboard: filtro de período no topo
 * e os "cross-filters" (filtros por clique nos gráficos, estilo Power BI).
 */

// Estado dos filtros aplicados por clique nos gráficos
let crossFilters = { supplier: null, reason: null, destination: null, month: null };

function initFilters(onChangeCallback) {
    document.getElementById('filter-period').addEventListener('change', () => {
        const period = document.getElementById('filter-period').value;
        const compareToggle = document.getElementById('compare-toggle');
        if (compareToggle) {
            if (period === 'all') {
                compareToggle.checked = false;
                compareToggle.disabled = true;
            } else {
                compareToggle.disabled = false;
            }
        }
        onChangeCallback();
    });

    const compareToggle = document.getElementById('compare-toggle');
    if (compareToggle) {
        compareToggle.addEventListener('change', onChangeCallback);
    }
}

function getFilteredData() {
    const period = document.getElementById('filter-period').value;

    let filteredData = allIncidents;
    const now = new Date();

    if (period !== 'all') {
        let startDate = new Date(now);
        if (period === 'last30') startDate.setDate(startDate.getDate() - 30);
        else if (period === 'last90') startDate.setDate(startDate.getDate() - 90);
        else if (period === 'thisYear') startDate = new Date(now.getFullYear(), 0, 1);

        filteredData = filteredData.filter(item => new Date(item.date) >= startDate);
    }

    filteredData = applyCrossFilters(filteredData);

    return { data: filteredData, period };
}

function applyCrossFilters(data) {
    let result = data;
    if (crossFilters.supplier) result = result.filter(item => item.supplier === crossFilters.supplier);
    if (crossFilters.reason) result = result.filter(item => item.reason === crossFilters.reason);
    if (crossFilters.destination) result = result.filter(item => item.destination === crossFilters.destination);
    if (crossFilters.month) {
        result = result.filter(item => {
            const d = new Date(item.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return key === crossFilters.month;
        });
    }
    return result;
}

/**
 * Retorna o conjunto de dados do "período anterior" equivalente ao filtro
 * de período ativo no momento, para a comparação lado a lado no gráfico
 * de Evolução Mensal. Retorna null quando não há período anterior aplicável.
 */
function getComparisonData() {
    const period = document.getElementById('filter-period').value;
    if (period === 'all') return null;

    const now = new Date();
    let start, end;

    if (period === 'last30' || period === 'last90') {
        const days = period === 'last30' ? 30 : 90;
        end = new Date(now);
        end.setDate(end.getDate() - days);
        start = new Date(end);
        start.setDate(start.getDate() - days);
    } else if (period === 'thisYear') {
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    } else {
        return null;
    }

    let data = allIncidents.filter(item => {
        const d = new Date(item.date);
        return d >= start && d <= end;
    });

    if (crossFilters.supplier) data = data.filter(item => item.supplier === crossFilters.supplier);
    if (crossFilters.reason) data = data.filter(item => item.reason === crossFilters.reason);
    if (crossFilters.destination) data = data.filter(item => item.destination === crossFilters.destination);

    return data;
}

/**
 * Aplica (ou remove, se já estiver ativo) um cross-filter vindo de um clique
 * em algum gráfico, e dispara a re-renderização do dashboard.
 */
function setCrossFilter(type, value) {
    crossFilters[type] = (crossFilters[type] === value) ? null : value;
    renderActiveFilters();
    if (typeof applyAndRender === 'function') applyAndRender();
}

function clearCrossFilter(type) {
    crossFilters[type] = null;
    renderActiveFilters();
    if (typeof applyAndRender === 'function') applyAndRender();
}

function clearAllCrossFilters() {
    crossFilters = { supplier: null, reason: null, destination: null, month: null };
    renderActiveFilters();
    if (typeof applyAndRender === 'function') applyAndRender();
}

function renderActiveFilters() {
    const container = document.getElementById('active-filters');
    if (!container) return;

    const labels = { supplier: 'Fornecedor', reason: 'Motivo', destination: 'Destino', month: 'Mês' };
    const active = Object.entries(crossFilters).filter(([, v]) => v);

    if (active.length === 0) {
        container.classList.add('hidden');
        container.classList.remove('flex');
        container.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    container.classList.add('flex');
    container.innerHTML = `
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <i class="ph ph-funnel"></i> Filtros de gráfico:
        </span>
        ${active.map(([type, value]) => `
            <span class="inline-flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200 border border-brand-200 dark:border-brand-800 px-3 py-1 rounded-full text-xs font-medium">
                ${labels[type]}: ${value}
                <button onclick="clearCrossFilter('${type}')" class="hover:text-red-500" title="Remover filtro"><i class="ph ph-x"></i></button>
            </span>
        `).join('')}
        <button onclick="clearAllCrossFilters()" class="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 underline ml-1">Limpar tudo</button>
    `;
}
