let destinationChartInstance = null;

function renderDestinationChart(data) {
    const ctx = document.getElementById('destinationChart').getContext('2d');
    if (destinationChartInstance) destinationChartInstance.destroy();

    const destMap = {};
    data.forEach(item => {
        destMap[item.destination] = (destMap[item.destination] || 0) + item.quantity;
    });

    const labels = Object.keys(destMap);
    const values = Object.values(destMap);

    destinationChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Qtd Destinada',
                data: values,
                backgroundColor: labels.map((l, i) => {
                    const base = chartColor(i);
                    if (crossFilters.destination && l !== crossFilters.destination) return base + '4D';
                    return base;
                }),
                borderRadius: 6, barThickness: 32
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: chartTooltipBg(), padding: 12, cornerRadius: 10 }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: chartGridColor() }, ticks: { color: chartTickColor() } },
                x: { grid: { display: false }, ticks: { color: chartTickColor() } }
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    setCrossFilter('destination', labels[idx]);
                }
            },
            onHover: (evt, elements) => {
                evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
            }
        }
    });
}
