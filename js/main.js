Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#64748b';
Chart.defaults.plugins.tooltip.backgroundColor = '#1a1f36';
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.displayColors = false;

function applyAndRender() {
    const { data, period } = getFilteredData();
    updateKPIs(data, period);

    const compareToggle = document.getElementById('compare-toggle');
    const compareEnabled = compareToggle ? compareToggle.checked : false;
    const comparisonData = compareEnabled ? getComparisonData() : null;

    renderEvolutionChart(data, comparisonData, period);
    renderReasonChart(data);
    renderSupplierChart(data);
    renderDestinationChart(data);
    if (typeof renderInternalChart === 'function') renderInternalChart(data);
    if (typeof renderPivotTable === 'function') renderPivotTable(data);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Aguarda o auth carregar e verificar o usuário atual
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            document.getElementById('user-email').textContent = user.email;
            
            // Carrega dados da API
            await loadSettings();
            await loadIncidents();
            
            // Se for a primeira vez e não houver configurações criadas, o banco estará vazio.
            // Poderíamos injetar valores padrão no banco. Mas deixaremos vazio para o admin preencher.
            
            if (typeof initInternalYearFilter === 'function') initInternalYearFilter(allIncidents, applyAndRender);
            initFilters(applyAndRender);
            applyAndRender();
        }
    });
});
