document.addEventListener('DOMContentLoaded', async () => {

function excelDateToString(value) {
    if (!value) return '';
    if (typeof value === 'number') {
        // Excel serial date
        const date = new Date((value - 25569) * 86400000);
        return date.toISOString().split('T')[0];
    }
    // Already a string
    const str = String(value).trim();
    // Handle dd/mm/yyyy format
    const brDate = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brDate) {
        return `${brDate[3]}-${brDate[2].padStart(2,'0')}-${brDate[1].padStart(2,'0')}`;
    }
    return str;
}

function normalizeStr(str) {
    if (!str) return '';
    return str.toString()
        .trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

    // Carregar opções dos selects
    // Carregar opções dos selects
    if (window.auth) {
        window.auth.onAuthStateChanged(async (user) => {
            if (user) {
                const data = await loadSettings();
                if (data) {
                    populateSelect('fornecedor', data.suppliers);
                    populateSelect('produto', data.products);
                    populateSelect('motivo', data.reasons);
                    populateSelect('destino', data.destinations);
                    populateSelect('status', data.statuses);
                    populateSelect('process_type', data.process_types);
                    populateSelect('measure_unit', data.measure_units);
                    populateSelect('responsible', data.responsibles);
                }
            }
        });
    } else {
        // Fallback for when auth might not be fully initialized or exposed the same way
        const data = await loadSettings();
        if (data) {
            populateSelect('fornecedor', data.suppliers);
            populateSelect('produto', data.products);
            populateSelect('motivo', data.reasons);
            populateSelect('destino', data.destinations);
            populateSelect('status', data.statuses);
            populateSelect('process_type', data.process_types);
            populateSelect('measure_unit', data.measure_units);
            populateSelect('responsible', data.responsibles);
        }
    }

    // Formulário manual
    const form = document.getElementById('form-lancamento');
    const btnSubmit = document.getElementById('btn-submit');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Salvando...';

        const incidente = {
            date: document.getElementById('data').value, // YYYY-MM-DD
            rnc_number: document.getElementById('rnc_number').value || '',
            process_type: document.getElementById('process_type').options[document.getElementById('process_type').selectedIndex]?.text || '',
            status: document.getElementById('status').options[document.getElementById('status').selectedIndex]?.text || '',
            material_code: document.getElementById('material_code').value || '',
            product: document.getElementById('produto').options[document.getElementById('produto').selectedIndex]?.text || '',
            supplier: document.getElementById('fornecedor').options[document.getElementById('fornecedor').selectedIndex]?.text || '',
            batch: document.getElementById('batch').value || '',
            quantity_kg: parseFloat(document.getElementById('quantity_kg').value) || 0,
            quantity: parseInt(document.getElementById('quantidade').value, 10) || 0,
            measure_unit: document.getElementById('measure_unit').options[document.getElementById('measure_unit').selectedIndex]?.text || '',
            reason: document.getElementById('motivo').options[document.getElementById('motivo').selectedIndex]?.text || '',
            destination: document.getElementById('destino').options[document.getElementById('destino').selectedIndex]?.text || '',
            responsible: document.getElementById('responsible').options[document.getElementById('responsible').selectedIndex]?.text || '',
            nfd_issue_date: document.getElementById('nfd_issue_date').value.trim() || '',
            nfd_number: document.getElementById('nfd_number').value || '',
            unit_value: parseFloat(document.getElementById('unit_value').value) || 0,
            nf_value: parseFloat(document.getElementById('nf_value').value) || 0,
            anc_departure_date: document.getElementById('anc_departure_date').value || '',
            notes: document.getElementById('observacoes').value || ''
        };

        try {
            await addIncident(incidente);
            if (typeof showToast === 'function') showToast('Lançamento salvo com sucesso!', 'success');
            else alert('Lançamento salvo com sucesso!');
            form.reset();
        } catch (error) {
            if (typeof showToast === 'function') showToast('Erro ao salvar lançamento.', 'error');
            else alert('Erro ao salvar lançamento.');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Salvar Lançamento';
        }
    });

    // Importação Excel
    const fileInput = document.getElementById('excel-file');
    const dropzone = document.getElementById('dropzone');
    const fileNameDisplay = document.getElementById('file-name');
    const btnImport = document.getElementById('btn-import');
    const previewArea = document.getElementById('import-preview-area');
    const progressArea = document.getElementById('import-progress-area');
    const progressBar = document.getElementById('import-progress-bar');
    const progressText = document.getElementById('import-progress-text');
    let excelData = null;
    let formattedDataCache = null;

    // Drag and Drop
    if (dropzone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, preventDefaults, false);
        });
        function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
        });
        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files.length > 0) {
                fileInput.files = files;
                handleFileSelect(files[0]);
            }
        }, false);
    }

    fileInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files[0]);
    });

    function handleFileSelect(file) {
        if (!file) {
            fileNameDisplay.innerText = 'Nenhum arquivo selecionado';
            fileNameDisplay.classList.add('hidden');
            btnImport.disabled = true;
            previewArea.classList.add('hidden');
            return;
        }
        fileNameDisplay.innerText = 'Selecionado: ' + file.name;
        fileNameDisplay.classList.remove('hidden');
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawData = XLSX.utils.sheet_to_json(ws, { defval: "" });
                excelData = rawData;
                processPreviewData(rawData);
            } catch (error) {
                console.error("Erro ao ler Excel", error);
                if (typeof showToast === 'function') showToast('Erro ao ler a planilha. Verifique o formato.', 'error');
                else alert('Erro ao ler a planilha. Verifique o formato.');
                btnImport.disabled = true;
            }
        };
        reader.readAsBinaryString(file);
    }

    function processPreviewData(rawData) {
        if (!rawData || rawData.length === 0) return;

        formattedDataCache = rawData.map(originalRow => {
            const row = {};
            for (let key in originalRow) {
                if (originalRow.hasOwnProperty(key)) {
                    // map normalized key to value
                    row[normalizeStr(key)] = originalRow[key];
                }
            }

            return {
                date: excelDateToString(row['data de entrada'] || row['data'] || row['date']) || new Date().toISOString().split('T')[0],
                rnc_number: row['n da rnc'] || row['rnc'] || row['nº da rnc'] || '',
                process_type: row['tipo de processo'] || row['process_type'] || '',
                status: row['status'] || 'CONCLUIDA',
                material_code: row['cod. do material'] || row['cod do material'] || row['material_code'] || '',
                product: row['descricao do material'] || row['produto'] || row['product'] || '',
                supplier: row['fornecedor'] || row['supplier'] || '',
                batch: row['lote'] || '',
                quantity_kg: parseFloat(row['qtd (kg)'] || row['qtd(kg)']) || 0,
                quantity: parseInt(row['qtd'] || row['qtd (und)'] || row['quantidade'] || 1, 10),
                measure_unit: row['und med.'] || row['und med'] || 'UND',
                reason: row['motivo p/ segregar'] || row['motivo p/ segregrar'] || row['motivo'] || row['reason'] || '',
                destination: row['destino'] || row['destination'] || '',
                responsible: row['responsavel'] || row['responsible'] || '',
                nfd_issue_date: (row['data de emissao nfd'] || row['data emissao nfd'] || '').toString().trim(),
                nfd_number: row['n da nfd'] || row['nº da nfd'] || '',
                unit_value: parseFloat(row['valor uni'] || row['valor uni.']) || 0,
                nf_value: parseFloat(row['valor da nf'] || row['valor nf']) || 0,
                anc_departure_date: excelDateToString(row['data de saida anc.'] || row['data de saida anc'] || row['data saida anc']) || '',
                notes: row['observacoes'] || row['obs'] || ''
            };
        });

        const validCount = formattedDataCache.length;
        const invalidCount = 0; // We accept all rows now

        btnImport.disabled = false;
        
        // Render stats
        const statsEl = document.getElementById('import-stats');
        statsEl.innerHTML = `
            <div class="import-stat stat-total"><i class="ph ph-list-numbers"></i> Total: ${formattedDataCache.length}</div>
            <div class="import-stat stat-mapped"><i class="ph ph-check-circle"></i> Válidos: ${validCount}</div>
        `;

        // Render preview table
        const thead = document.querySelector('#preview-table thead tr');
        const tbody = document.querySelector('#preview-table tbody');
        thead.innerHTML = '';
        tbody.innerHTML = '';

        const previewCols = ['Data', 'RNC', 'Material', 'Fornecedor', 'Qtd', 'Motivo'];
        const colKeys = ['date', 'rnc_number', 'product', 'supplier', 'quantity', 'reason'];

        previewCols.forEach(c => {
            const th = document.createElement('th');
            th.textContent = c;
            thead.appendChild(th);
        });

        const previewData = formattedDataCache.slice(0, 5);
        previewData.forEach(item => {
            const tr = document.createElement('tr');
            colKeys.forEach(k => {
                const td = document.createElement('td');
                td.textContent = item[k];
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        if (formattedDataCache.length > 5) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="${previewCols.length}" class="text-center text-brand-500 font-medium py-2">+ ${formattedDataCache.length - 5} registros</td>`;
            tbody.appendChild(tr);
        }

        previewArea.classList.remove('hidden');
    }

    btnImport.addEventListener('click', async () => {
        if (!formattedDataCache || formattedDataCache.length === 0) return;
        
        btnImport.disabled = true;
        previewArea.classList.add('hidden');
        progressArea.classList.remove('hidden');
        btnImport.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Importando...';
        progressBar.style.width = '0%';

        try {
            // Batch import logic with progress
            const CHUNK_SIZE = 499;
            let totalImported = 0;
            const total = formattedDataCache.length;

            for (let i = 0; i < total; i += CHUNK_SIZE) {
                const chunk = formattedDataCache.slice(i, i + CHUNK_SIZE);
                const batch = window.db.batch();
                chunk.forEach(data => {
                    const docRef = window.db.collection('incidents').doc();
                    batch.set(docRef, {
                        ...data,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                await batch.commit();
                
                totalImported += chunk.length;
                const percent = Math.round((totalImported / total) * 100);
                progressBar.style.width = percent + '%';
                progressText.innerText = percent + '$';
            }

            btnImport.innerHTML = '<i class="ph ph-check-circle"></i> Concluído!';
            if (typeof showToast === 'function') showToast(`Importação concluída! ${totalImported} registros importados com sucesso.`, 'success', 5000);
            else alert(`Importação concluída!\n\n✅ ${totalImported} registros importados com sucesso.`);
            
            // Reset state
            setTimeout(() => {
                fileInput.value = '';
                fileNameDisplay.innerText = '';
                fileNameDisplay.classList.add('hidden');
                excelData = null;
                formattedDataCache = null;
                progressArea.classList.add('hidden');
                btnImport.innerText = 'Confirmar Importação';
            }, 3000);

        } catch (error) {
            console.error(error);
            if (typeof showToast === 'function') showToast('Erro ao importar os dados.', 'error');
            else alert('Erro ao importar os dados.');
            btnImport.disabled = false;
            btnImport.innerText = 'Confirmar Importação';
        }
    });
});

function populateSelect(id, items) {
    const select = document.getElementById(id);
    if (!select || !items) return;
    
    // Reset para evitar duplicatas e preservar o placeholder
    select.innerHTML = '<option value="">Selecione...</option>';
    
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.name; // Usar o nome como value
        option.text = item.name;
        select.appendChild(option);
    });
}
