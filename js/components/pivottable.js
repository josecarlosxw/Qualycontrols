/**
 * pivotTable.js
 * -------------
 * Renderiza uma matriz dinâmica (estilo tabela pivot do Power BI) cruzando
 * Fornecedor x Mês, com totais de linha/coluna e formatação condicional
 * (intensidade de cor proporcional ao valor).
 */

function renderPivotTable(data) {
    const container = document.getElementById('pivot-table-container');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Sem dados para os filtros selecionados.</p>';
        return;
    }

    // Meses presentes no recorte atual, em ordem cronológica
    const monthMap = {};
    data.forEach(item => {
        const d = new Date(item.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[key]) monthMap[key] = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
    });
    const monthKeys = Object.keys(monthMap).sort();

    // Ranking de fornecedores por volume total
    const supplierTotals = {};
    data.forEach(item => {
        supplierTotals[item.supplier] = (supplierTotals[item.supplier] || 0) + item.quantity;
    });
    const sortedSuppliers = Object.entries(supplierTotals).sort((a, b) => b[1] - a[1]);
    const TOP_N = 8;
    const topSuppliers = sortedSuppliers.slice(0, TOP_N).map(([name]) => name);
    const hasOutros = sortedSuppliers.length > TOP_N;
    const getRowKey = (supplier) => topSuppliers.includes(supplier) ? supplier : 'Outros';

    // Matriz fornecedor -> mês -> quantidade
    const matrix = {};
    data.forEach(item => {
        const d = new Date(item.date);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const rowKey = getRowKey(item.supplier);
        if (!matrix[rowKey]) matrix[rowKey] = {};
        matrix[rowKey][monthKey] = (matrix[rowKey][monthKey] || 0) + item.quantity;
    });

    const rowKeys = [...topSuppliers];
    if (hasOutros) rowKeys.push('Outros');

    let maxVal = 0;
    rowKeys.forEach(r => monthKeys.forEach(m => {
        maxVal = Math.max(maxVal, (matrix[r] && matrix[r][m]) || 0);
    }));

    const cellStyle = (val) => {
        if (!val) return '';
        const intensity = Math.min(val / (maxVal || 1), 1);
        const alpha = (0.12 + intensity * 0.6).toFixed(2);
        return `style="background-color: rgba(88, 80, 236, ${alpha});"`;
    };

    let html = '<table class="min-w-full text-sm border-collapse">';

    // Cabeçalho
    html += '<thead><tr>';
    html += '<th class="sticky left-0 z-10 bg-white dark:bg-gray-800 text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-200 border-b-2 border-gray-200 dark:border-gray-700">Fornecedor</th>';
    monthKeys.forEach(m => {
        html += `<th class="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-200 border-b-2 border-gray-200 dark:border-gray-700 whitespace-nowrap">${monthMap[m]}</th>`;
    });
    html += '<th class="px-3 py-2 text-center font-semibold text-gray-900 dark:text-white border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/60 whitespace-nowrap">Total</th>';
    html += '</tr></thead><tbody>';

    // Linhas de fornecedores
    rowKeys.forEach(row => {
        html += '<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/40">';
        html += `<td class="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-2 font-medium text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">${row}</td>`;
        let rowTotal = 0;
        monthKeys.forEach(m => {
            const val = (matrix[row] && matrix[row][m]) || 0;
            rowTotal += val;
            html += `<td class="px-3 py-2 text-center text-gray-700 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700" ${cellStyle(val)}>${val || '—'}</td>`;
        });
        html += `<td class="px-3 py-2 text-center font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/60">${rowTotal}</td>`;
        html += '</tr>';
    });

    // Linha de totais por mês
    html += '<tr class="bg-gray-50 dark:bg-gray-700/60 font-semibold">';
    html += '<td class="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700/60 px-3 py-2 text-gray-900 dark:text-white border-t-2 border-gray-200 dark:border-gray-700">Total</td>';
    let grandTotal = 0;
    monthKeys.forEach(m => {
        let colTotal = 0;
        rowKeys.forEach(row => { colTotal += (matrix[row] && matrix[row][m]) || 0; });
        grandTotal += colTotal;
        html += `<td class="px-3 py-2 text-center text-gray-900 dark:text-white border-t-2 border-gray-200 dark:border-gray-700">${colTotal}</td>`;
    });
    html += `<td class="px-3 py-2 text-center text-gray-900 dark:text-white border-t-2 border-gray-200 dark:border-gray-700">${grandTotal}</td>`;
    html += '</tr>';

    html += '</tbody></table>';
    container.innerHTML = html;
}
