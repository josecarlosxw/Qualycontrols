let reasonChartInstance = null;

function renderReasonChart(data) {
    const ctx = document.getElementById('reasonChart').getContext('2d');
    if (reasonChartInstance) reasonChartInstance.destroy();

    const reasonMap = {};
    data.forEach(item => {
        reasonMap[item.reason] = (reasonMap[item.reason] || 0) + item.quantity;
    });

    const labels = Object.keys(reasonMap);
    const values = Object.values(reasonMap);

    reasonChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map((l, i) => {
                    const base = chartColor(i);
                    if (crossFilters.reason && l !== crossFilters.reason) return base + '4D'; // esmaece os não selecionados
                    return base;
                }),
                borderColor: chartCardBorderColor(),
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '70%',
            plugins: {
                legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 16, color: chartTickColor() } },
                tooltip: { backgroundColor: chartTooltipBg(), padding: 12, cornerRadius: 10 }
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    setCrossFilter('reason', labels[idx]);
                }
            },
            onHover: (evt, elements) => {
                evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
            }
        }
    });
}
