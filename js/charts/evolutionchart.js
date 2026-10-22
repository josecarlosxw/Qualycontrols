let evolutionChartInstance = null;
let _evolutionMonthKeys = null; // usado para o cross-filter por mês (só quando não há comparação ativa)

let _evolutionTypeFilter = 'all'; // all | rnc | internal

/**
 * Classifica um lançamento com base na coluna "Tipo de Processo" da planilha.
 */
function evolutionItemType(item) {
    const proc = (item.process_type || '').toUpperCase();
    const rnc = (item.rnc_number || '').toUpperCase();
    if (proc.includes('INTERNA') || rnc.includes('INTERNA')) return 'internal';
    if (proc.includes('RNC')) return 'rnc';
    return 'other';
}

function filterEvolutionData(dataset) {
    if (!dataset || _evolutionTypeFilter === 'all') return dataset;
    return dataset.filter(item => evolutionItemType(item) === _evolutionTypeFilter);
}

function initEvolutionTypeFilter(onChangeCallback) {
    const select = document.getElementById('evolution-type-filter');
    if (!select || select.dataset.bound) return;
    select.dataset.bound = '1';
    select.addEventListener('change', () => {
        _evolutionTypeFilter = select.value;
        if (typeof onChangeCallback === 'function') onChangeCallback();
        else if (typeof applyAndRender === 'function') applyAndRender();
    });
}

function renderEvolutionChart(data, comparisonData, period) {
    initEvolutionTypeFilter();
    data = filterEvolutionData(data);
    comparisonData = filterEvolutionData(comparisonData);
    const ctx = document.getElementById('evolutionChart').getContext('2d');
    if (evolutionChartInstance) evolutionChartInstance.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.00)');

    let labels, currentValues, previousValues = null, prevLabel = '';
    _evolutionMonthKeys = null;

    if (comparisonData && (period === 'last30' || period === 'last90')) {
        const days = period === 'last30' ? 30 : 90;
        const now = new Date();
        const prevEnd = new Date(now);
        prevEnd.setDate(prevEnd.getDate() - days);

        currentValues = bucketByRelativeDay(data, days, now);
        previousValues = bucketByRelativeDay(comparisonData, days, prevEnd);
        labels = Array.from({ length: days }, (_, i) => `D${i + 1}`);
        prevLabel = `Período Anterior (${days} dias)`;

    } else if (comparisonData && period === 'thisYear') {
        const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        currentValues = bucketByMonthOfYear(data);
        previousValues = bucketByMonthOfYear(comparisonData);
        labels = monthLabels;
        prevLabel = 'Ano Anterior';

    } else {
        // Comportamento padrão: agrupa pela chave real ano-mês
        const monthly = {};
        data.forEach(item => {
            const d = new Date(item.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
            if (!monthly[key]) monthly[key] = { label, count: 0 };
            monthly[key].count += 1;
        });
        const sortedKeys = Object.keys(monthly).sort();
        labels = sortedKeys.map(k => monthly[k].label);
        currentValues = sortedKeys.map(k => monthly[k].count);
        _evolutionMonthKeys = sortedKeys;
    }

    const datasets = [{
        label: previousValues ? 'Lançamentos - Atual' : 'Lançamentos',
        data: currentValues,
        borderColor: chartColor(0),
        backgroundColor: gradient,
        borderWidth: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: chartColor(0),
        pointRadius: 3,
        fill: true,
        tension: 0.4
    }];

    if (previousValues) {
        datasets.push({
            label: prevLabel,
            data: previousValues,
            borderColor: chartColor(8),
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [6, 4],
            pointBackgroundColor: '#ffffff',
            pointBorderColor: chartColor(8),
            pointRadius: 2,
            fill: false,
            tension: 0.4
        });
    }

    evolutionChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: !!previousValues, position: 'top', labels: { boxWidth: 8, usePointStyle: true, color: chartTickColor() } },
                tooltip: { backgroundColor: chartTooltipBg(), padding: 12, cornerRadius: 10 }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: chartTickColor() } },
                y: { beginAtZero: true, grid: { color: chartGridColor() }, ticks: { color: chartTickColor() } }
            },
            onClick: (evt, elements) => {
                if (!previousValues && elements.length > 0 && _evolutionMonthKeys) {
                    const idx = elements[0].index;
                    setCrossFilter('month', _evolutionMonthKeys[idx]);
                }
            },
            onHover: (evt, elements) => {
                evt.native.target.style.cursor = (!previousValues && elements.length) ? 'pointer' : 'default';
            }
        }
    });
}

function bucketByRelativeDay(dataset, days, endDate) {
    const buckets = new Array(days).fill(0);
    dataset.forEach(item => {
        const d = new Date(item.date);
        const diffDays = Math.floor((endDate - d) / 86400000);
        const idx = days - 1 - diffDays;
        if (idx >= 0 && idx < days) buckets[idx] += 1;
    });
    return buckets;
}

function bucketByMonthOfYear(dataset) {
    const buckets = new Array(12).fill(0);
    dataset.forEach(item => {
        const d = new Date(item.date);
        buckets[d.getMonth()] += 1;
    });
    return buckets;
}
