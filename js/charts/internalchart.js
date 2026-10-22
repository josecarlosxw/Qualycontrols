/**
 * internalchart.js
 * ----------------
 * Renderiza DOIS gráficos separados para Avarias Internas:
 *   1. Gráfico de barras: Quantidade por mês
 *   2. Gráfico de área: Valor (R$) por mês
 * Inclui filtro de ano e resumo com totais.
 */

let internalQtyChartInstance = null;
let internalValueChartInstance = null;
let _internalYearFilter = null; // null = todos

function initInternalYearFilter(data, onChangeCallback) {
    const select = document.getElementById('internal-year-filter');
    if (!select) return;

    // Extract unique years from internal data
    const internalData = filterInternalData(data);
    const years = [...new Set(internalData.map(item => {
        const d = new Date(item.date);
        return d.getFullYear();
    }))].sort((a, b) => b - a);

    // Populate select
    select.innerHTML = '<option value="all">Todos os Anos</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    });

    // Default to current year if available
    const currentYear = new Date().getFullYear();
    if (years.includes(currentYear)) {
        select.value = currentYear;
        _internalYearFilter = currentYear;
    }

    select.addEventListener('change', () => {
        _internalYearFilter = select.value === 'all' ? null : parseInt(select.value);
        onChangeCallback();
    });
}

function filterInternalData(data) {
    return data.filter(item => {
        const rnc = (item.rnc_number || '').toUpperCase();
        const proc = (item.process_type || '').toUpperCase();
        return rnc.includes('INTERNA') || proc.includes('INTERNA');
    });
}

function renderInternalCharts(data) {
    let internalData = filterInternalData(data);

    // KPI do dashboard: conta TODOS os lançamentos internos do período filtrado
    // globalmente, sem aplicar o filtro de ano específico dos gráficos.
    const kpiQty = internalData.length;
    const kpiValue = internalData.reduce((sum, item) => sum + calcIncidentValue(item), 0);
    const kpiQtyEl0 = document.getElementById('kpi-internal-qty');
    const kpiValEl0 = document.getElementById('kpi-internal-value');
    if (kpiQtyEl0) {
        if (typeof animateCounter === 'function') animateCounter('kpi-internal-qty', kpiQty);
        else kpiQtyEl0.textContent = kpiQty.toLocaleString('pt-BR');
    }
    if (kpiValEl0) {
        kpiValEl0.textContent = 'R$ ' + kpiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Apply year filter
    if (_internalYearFilter) {
        internalData = internalData.filter(item => {
            const d = new Date(item.date);
            return d.getFullYear() === _internalYearFilter;
        });
    }

    // Group by month
    const monthly = {};
    internalData.forEach(item => {
        const d = new Date(item.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
        if (!monthly[key]) monthly[key] = { label, qty: 0, value: 0 };
        // Conta lançamentos (linhas da planilha), não a soma das quantidades.
        monthly[key].qty += 1;
        monthly[key].value += calcIncidentValue(item);
    });

    const sortedKeys = Object.keys(monthly).sort();
    const labels = sortedKeys.map(k => monthly[k].label);
    const quantities = sortedKeys.map(k => monthly[k].qty);
    const values = sortedKeys.map(k => monthly[k].value);

    // Calculate totals
    const totalQty = quantities.reduce((a, b) => a + b, 0);
    const totalValue = values.reduce((a, b) => a + b, 0);
    const avgMonthlyQty = sortedKeys.length > 0 ? Math.round(totalQty / sortedKeys.length) : 0;
    const avgMonthlyValue = sortedKeys.length > 0 ? totalValue / sortedKeys.length : 0;

    // Update summary bar
    updateInternalSummary(totalQty, totalValue, avgMonthlyQty, avgMonthlyValue);




    // Render both charts
    renderInternalQtyChart(labels, quantities, sortedKeys);
    renderInternalValueChart(labels, values, sortedKeys);
}

function updateInternalSummary(totalQty, totalValue, avgQty, avgValue) {
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('internal-total-qty', totalQty.toLocaleString('pt-BR'));
    el('internal-total-value', 'R$ ' + totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    el('internal-avg-qty', '~' + avgQty.toLocaleString('pt-BR') + '/mês');
    el('internal-avg-value', 'R$ ' + avgValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '/mês');
}

function renderInternalQtyChart(labels, quantities, sortedKeys) {
    const ctx = document.getElementById('internalQtyChart');
    if (!ctx) return;
    if (internalQtyChartInstance) internalQtyChartInstance.destroy();

    const context = ctx.getContext('2d');

    // Gradient for bars
    const barGradient = context.createLinearGradient(0, 0, 0, 300);
    barGradient.addColorStop(0, '#3B82F6');
    barGradient.addColorStop(1, '#06B6D4');

    internalQtyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Quantidade de Avarias',
                data: quantities,
                backgroundColor: barGradient,
                borderRadius: 8,
                barThickness: 24,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: chartTooltipBg(),
                    padding: 12,
                    cornerRadius: 10,
                    titleFont: { weight: '700' },
                    callbacks: {
                        label: function(context) {
                            return `Quantidade: ${context.parsed.y.toLocaleString('pt-BR')}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11, weight: '500' }, color: chartTickColor() }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: chartGridColor() },
                    ticks: { font: { size: 11 }, color: chartTickColor() }
                }
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    if (sortedKeys[idx]) setCrossFilter('month', sortedKeys[idx]);
                }
            },
            onHover: (evt, elements) => {
                evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
            }
        }
    });
}

function renderInternalValueChart(labels, values, sortedKeys) {
    const ctx = document.getElementById('internalValueChart');
    if (!ctx) return;
    if (internalValueChartInstance) internalValueChartInstance.destroy();

    const context = ctx.getContext('2d');

    // Gradient fill
    const gradient = context.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.02)');

    internalValueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Valor Total (R$)',
                data: values,
                borderColor: '#F43F5E',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#F43F5E',
                pointBorderWidth: 2.5,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: chartTooltipBg(),
                    padding: 12,
                    cornerRadius: 10,
                    titleFont: { weight: '700' },
                    callbacks: {
                        label: function(context) {
                            return `Valor: R$ ${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11, weight: '500' }, color: chartTickColor() }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: chartGridColor() },
                    ticks: {
                        font: { size: 11 },
                        color: chartTickColor(),
                        callback: function(value) {
                            if (value >= 1000) return 'R$ ' + (value / 1000).toLocaleString('pt-BR') + 'k';
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    if (sortedKeys[idx]) setCrossFilter('month', sortedKeys[idx]);
                }
            },
            onHover: (evt, elements) => {
                evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
            }
        }
    });
}

// Backward compatibility: old function name still works
function renderInternalChart(data) {
    renderInternalCharts(data);
}
