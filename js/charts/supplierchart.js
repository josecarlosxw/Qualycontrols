let supplierChartInstance = null;

function renderSupplierChart(data) {
    const ctx = document.getElementById('supplierChart').getContext('2d');
    if (supplierChartInstance) supplierChartInstance.destroy();

    const supplierMap = {};
    data.forEach(item => {
        supplierMap[item.supplier] = (supplierMap[item.supplier] || 0) + item.quantity;
    });

    const top5 = Object.entries(supplierMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels = top5.map(([name]) => name);
    const values = top5.map(([, qty]) => qty);

    supplierChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Qtd de Ocorrências',
                data: values,
                backgroundColor: labels.map((l, i) => {
                    const base = chartColor(i);
                    if (crossFilters.supplier && l !== crossFilters.supplier) return base + '4D';
                    return base;
                }),
                borderRadius: 6,
                barThickness: 24
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: chartTooltipBg(), padding: 12, cornerRadius: 10 }
            },
            scales: {
                x: { beginAtZero: true, grid: { color: chartGridColor() }, ticks: { color: chartTickColor() } },
                y: { grid: { display: false }, ticks: { color: chartTickColor() } }
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    setCrossFilter('supplier', labels[idx]);
                }
            },
            onHover: (evt, elements) => {
                evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
            }
        }
    });
}
