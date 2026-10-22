/**
 * planilha.js
 * -----------
 * Ferramenta "Planilha": exibe todos os lançamentos (incidentes) salvos no
 * Firestore em formato de planilha editável (estilo Excel), permitindo
 * editar células diretamente, adicionar/remover linhas e exportar tudo
 * para um arquivo .xlsx no modelo padrão da empresa.
 */

// Definição das colunas exibidas na planilha: campo salvo -> rótulo exibido
const PLANILHA_COLUMNS = [
    { field: 'date', label: 'Data de Entrada', type: 'date' },
    { field: 'rnc_number', label: 'Nº da RNC', type: 'text' },
    { field: 'process_type', label: 'Tipo de Processo', type: 'text' },
    { field: 'status', label: 'Status', type: 'text' },
    { field: 'material_code', label: 'Cód. Material', type: 'text' },
    { field: 'product', label: 'Produto', type: 'text' },
    { field: 'supplier', label: 'Fornecedor', type: 'text' },
    { field: 'batch', label: 'Lote', type: 'text' },
    { field: 'quantity_kg', label: 'Qtd (KG)', type: 'number' },
    { field: 'quantity', label: 'Qtd', type: 'number' },
    { field: 'measure_unit', label: 'Und Med.', type: 'text' },
    { field: 'reason', label: 'Motivo', type: 'text' },
    { field: 'destination', label: 'Destino', type: 'text' },
    { field: 'responsible', label: 'Responsável', type: 'text' },
    { field: 'nfd_issue_date', label: 'Data Emissão NFD', type: 'text' },
    { field: 'nfd_number', label: 'Nº da NFD', type: 'text' },
    { field: 'unit_value', label: 'Valor Uni (R$)', type: 'number' },
    { field: 'nf_value', label: 'Valor da NF (R$)', type: 'number' },
    { field: 'anc_departure_date', label: 'Data Saída ANC.', type: 'date' },
    { field: 'notes', label: 'Observações', type: 'text' }
];

let planilhaSearchTerm = '';

document.addEventListener('DOMContentLoaded', async () => {
    auth.onAuthStateChanged(async (user) => {
        if (!user) return;
        await loadIncidents();
        renderPlanilhaHeader();
        renderPlanilha();

        document.getElementById('planilha-search').addEventListener('input', (e) => {
            planilhaSearchTerm = e.target.value.trim().toLowerCase();
            renderPlanilha();
        });

        document.getElementById('btn-nova-linha').addEventListener('click', addPlanilhaRow);
        document.getElementById('btn-exportar-planilha').addEventListener('click', exportPlanilhaModel);
    });
});

function renderPlanilhaHeader() {
    const theadRow = document.getElementById('planilha-thead-row');
    theadRow.innerHTML = '';
    PLANILHA_COLUMNS.forEach(col => {
        const th = document.createElement('th');
        th.className = 'sticky top-0 bg-brand-900 dark:bg-gray-800 text-white text-xs font-semibold uppercase tracking-wide px-3 py-3 text-left whitespace-nowrap border-b border-brand-800 dark:border-gray-700';
        th.textContent = col.label;
        theadRow.appendChild(th);
    });
    const thAction = document.createElement('th');
    thAction.className = 'sticky top-0 bg-brand-900 dark:bg-gray-800 text-white text-xs font-semibold uppercase tracking-wide px-3 py-3 text-center whitespace-nowrap border-b border-brand-800 dark:border-gray-700';
    thAction.textContent = 'Ações';
    theadRow.appendChild(thAction);
}

function renderPlanilha() {
    const tbody = document.getElementById('planilha-tbody');
    tbody.innerHTML = '';

    let rows = allIncidents.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    if (planilhaSearchTerm) {
        rows = rows.filter(item =>
            PLANILHA_COLUMNS.some(col => String(item[col.field] ?? '').toLowerCase().includes(planilhaSearchTerm))
        );
    }

    document.getElementById('planilha-count').textContent = `${rows.length} lançamento(s)`;

    if (rows.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${PLANILHA_COLUMNS.length + 1}" class="text-center text-gray-400 dark:text-gray-500 py-10">Nenhum lançamento encontrado.</td>`;
        tbody.appendChild(tr);
        return;
    }

    rows.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.className = idx % 2 === 0
            ? 'bg-white dark:bg-gray-800'
            : 'bg-gray-50 dark:bg-gray-800/60';
        tr.dataset.id = item.id;

        PLANILHA_COLUMNS.forEach(col => {
            const td = document.createElement('td');
            td.className = 'px-3 py-2 text-sm border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:bg-brand-50 dark:focus:bg-gray-700 outline-none whitespace-nowrap';
            td.contentEditable = 'true';
            td.dataset.field = col.field;
            td.dataset.type = col.type;
            td.textContent = item[col.field] ?? '';
            td.addEventListener('blur', onPlanilhaCellEdit);
            td.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); td.blur(); }
            });
            tr.appendChild(td);
        });

        const tdAction = document.createElement('td');
        tdAction.className = 'px-3 py-2 text-center border-b border-gray-100 dark:border-gray-700 whitespace-nowrap';
        tdAction.innerHTML = `<button class="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded transition-colors" title="Remover linha"><i class="ph ph-trash"></i></button>`;
        tdAction.querySelector('button').addEventListener('click', () => deletePlanilhaRow(item.id));
        tr.appendChild(tdAction);

        tbody.appendChild(tr);
    });
}

async function onPlanilhaCellEdit(e) {
    const td = e.target;
    const tr = td.closest('tr');
    const id = tr.dataset.id;
    const field = td.dataset.field;
    const type = td.dataset.type;
    let value = td.textContent.trim();

    if (type === 'number') value = parseFloat(value.replace(',', '.')) || 0;

    const incident = allIncidents.find(i => i.id === id);
    if (incident && incident[field] === value) return; // nada mudou

    td.classList.add('opacity-60');
    try {
        await updateIncident(id, { [field]: value });
        if (incident) incident[field] = value;
    } catch (error) {
        alert('Erro ao salvar alteração da célula.');
    } finally {
        td.classList.remove('opacity-60');
    }
}

async function addPlanilhaRow() {
    const novo = {
        date: new Date().toISOString().split('T')[0],
        rnc_number: '', process_type: '', status: '', material_code: '',
        product: '', supplier: '', batch: '', quantity_kg: 0, quantity: 1,
        measure_unit: '', reason: '', destination: '', responsible: '',
        nfd_issue_date: '', nfd_number: '', unit_value: 0, nf_value: 0,
        anc_departure_date: '', notes: ''
    };
    try {
        await addIncident(novo);
        await loadIncidents();
        renderPlanilha();
    } catch (error) {
        alert('Erro ao criar nova linha.');
    }
}

async function deletePlanilhaRow(id) {
    if (!confirm('Tem certeza que deseja remover este lançamento? Esta ação não pode ser desfeita.')) return;
    try {
        await deleteIncident(id);
        allIncidents = allIncidents.filter(i => i.id !== id);
        renderPlanilha();
    } catch (error) {
        alert('Erro ao remover lançamento.');
    }
}

/**
 * Exporta todos os lançamentos para um arquivo .xlsx seguindo o
 * modelo padrão de planilha usado pela empresa (cabeçalhos em PT-BR).
 */
function exportPlanilhaModel() {
    if (typeof XLSX === 'undefined') {
        alert('A biblioteca XLSX não está carregada.');
        return;
    }
    try {
        const rows = allIncidents
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(item => {
                const row = {};
                PLANILHA_COLUMNS.forEach(col => { row[col.label] = item[col.field] ?? ''; });
                return row;
            });

        const ws = XLSX.utils.json_to_sheet(rows, { header: PLANILHA_COLUMNS.map(c => c.label) });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Planilha_Modelo');
        const dataStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Planilha_QualiControl_${dataStr}.xlsx`);
    } catch (error) {
        console.error('Erro ao exportar planilha:', error);
        alert('Erro ao exportar a planilha.');
    }
}
