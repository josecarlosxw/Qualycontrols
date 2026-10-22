function updateKPIs(data, period) {
    // Total de Não Conformidades = número de lançamentos (linhas) da planilha,
    // não a soma das quantidades registradas em cada linha.
    const totalNC = data.length;
    const uniqueSuppliers = new Set(data.map(item => item.supplier)).size;

    animateCounter('kpi-total', totalNC);
    animateCounter('kpi-suppliers', uniqueSuppliers);

    // Card "RNC": usa a mesma lógica do card "Avarias Internas" (filterInternalData,
    // definida em internalchart.js) para separar o que é RNC de fornecedor do que é
    // avaria interna, e mostra quantidade + valor no mesmo formato.
    // Valor financeiro = Quantidade × Valor Unitário (calcIncidentValue, api.js),
    // fonte única também usada pelo card de Avarias Internas.
    // Considera apenas os lançamentos cuja coluna "Tipo de Processo" (process_type)
    // é RNC, excluindo avarias internas.
    const rncData = data.filter(item => {
        const proc = (item.process_type || '').toUpperCase();
        return proc.includes('RNC') && !proc.includes('INTERNA');
    });

    // Contagem = número de lançamentos (linhas) com Tipo de Processo = RNC.
    const rncQty = rncData.length;
    const rncValue = rncData.reduce((sum, item) => sum + calcIncidentValue(item), 0);

    animateCounter('kpi-rnc-qty', rncQty);
    const rncValueEl = document.getElementById('kpi-rnc-value');
    if (rncValueEl) {
        rncValueEl.textContent = 'R$ ' + rncValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

function animateCounter(id, end, duration = 1000) {
    const el = document.getElementById(id);
    if (!el) return;
    if (end === 0) { el.textContent = '0'; return; }

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        el.textContent = Math.floor(progress * end).toLocaleString('pt-BR');
        if (progress < 1) window.requestAnimationFrame(step);
        else el.textContent = end.toLocaleString('pt-BR');
    };
    window.requestAnimationFrame(step);
}
