/**
 * api.js
 * ------
 * Realiza as chamadas ao Firebase Firestore.
 */

// Variáveis globais para armazenar as listas após carregar
let SUPPLIERS = [];
let PRODUCTS = [];
let REASONS = [];
let DESTINATIONS = [];
let STATUSES = [];
let PROCESS_TYPES = [];
let MEASURE_UNITS = [];
let RESPONSIBLES = [];

// Base de incidentes
let allIncidents = [];
const TOTAL_ITEMS_RECEIVED_LAST_YEAR = 150000;

/**
 * Calcula o valor financeiro de um lançamento: Qtd (KG) × Valor Unitário.
 * Esta é a fonte única usada por todos os cards, tabelas e gráficos do
 * sistema para evitar divergência entre os valores exibidos.
 */
function calcIncidentValue(item) {
    const quantityKg = Number(item.quantity_kg) || 0;
    const unitValue = Number(item.unit_value) || 0;
    return quantityKg * unitValue;
}


/**
 * Carrega as listas de configurações (Fornecedores, Produtos, etc) do Firestore.
 */
async function loadSettings() {
    // Busca cada coleção de forma independente: se uma falhar (permissão,
    // coleção inexistente, etc.) as demais continuam funcionando normalmente
    // em vez de derrubar todos os selects de uma vez.
    const fetchCollection = async (collectionName) => {
        try {
            const snapshot = await window.db.collection(collectionName).get();
            return snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        } catch (error) {
            reportDataError(collectionName, error);
            return [];
        }
    };

    try {
        const [
            suppliersData,
            productsData,
            reasonsData,
            destinationsData,
            statusesData,
            processTypesData,
            measureUnitsData,
            responsiblesData
        ] = await Promise.all([
            fetchCollection('suppliers'),
            fetchCollection('products'),
            fetchCollection('reasons'),
            fetchCollection('destinations'),
            fetchCollection('statuses'),
            fetchCollection('process_types'),
            fetchCollection('measure_units'),
            fetchCollection('responsibles')
        ]);

        SUPPLIERS = suppliersData.map(s => s.name);
        PRODUCTS = productsData.map(p => p.name);
        REASONS = reasonsData.map(r => r.name);
        DESTINATIONS = destinationsData.map(d => d.name);
        STATUSES = statusesData.map(x => x.name);
        PROCESS_TYPES = processTypesData.map(x => x.name);
        MEASURE_UNITS = measureUnitsData.map(x => x.name);
        RESPONSIBLES = responsiblesData.map(x => x.name);

        return {
            suppliers: suppliersData,
            products: productsData,
            reasons: reasonsData,
            destinations: destinationsData,
            statuses: statusesData,
            process_types: processTypesData,
            measure_units: measureUnitsData,
            responsibles: responsiblesData
        };
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        return null;
    }
}

/**
 * Carrega todos os incidentes (Não Conformidades) do Firestore.
 */
async function loadIncidents() {
    try {
        const snapshot = await window.db.collection('incidents').get();
        allIncidents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Ordena sempre por Data de Entrada, do mais recente para o mais antigo.
        // Como este array é a fonte única de dados (dashboard, planilha,
        // exportações), a ordenação fica automaticamente consistente em
        // qualquer lugar que a utilize.
        allIncidents.sort((a, b) => new Date(b.date) - new Date(a.date));
        return allIncidents;
    } catch (error) {
        reportDataError('incidents', error);
        return [];
    }
}

/**
 * Adiciona um novo incidente no Firestore
 */
async function addIncident(data) {
    try {
        await window.db.collection('incidents').add({
            ...data,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao adicionar incidente:', error);
        throw error;
    }
}

/**
 * Adiciona múltiplos incidentes (Importação Excel)
 */
async function addMultipleIncidents(dataList) {
    try {
        const CHUNK_SIZE = 499;
        let totalImported = 0;

        for (let i = 0; i < dataList.length; i += CHUNK_SIZE) {
            const chunk = dataList.slice(i, i + CHUNK_SIZE);
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
        }

        return totalImported;
    } catch (error) {
        console.error('Erro ao adicionar incidentes em lote:', error);
        throw error;
    }
}

/**
 * Atualiza um incidente existente (usado pela Planilha)
 */
async function updateIncident(id, data) {
    try {
        await window.db.collection('incidents').doc(id).update(data);
        return true;
    } catch (error) {
        console.error('Erro ao atualizar incidente:', error);
        throw error;
    }
}

/**
 * Remove um incidente (usado pela Planilha)
 */
async function deleteIncident(id) {
    try {
        await window.db.collection('incidents').doc(id).delete();
        return true;
    } catch (error) {
        console.error('Erro ao remover incidente:', error);
        throw error;
    }
}

/**
 * Adiciona configuração
 */
async function apiAddSetting(type, name) {
    try {
        await window.db.collection(type).add({ name });
    } catch (error) {
        console.error(`Erro ao adicionar ${type}:`, error);
        throw error;
    }
}

/**
 * Remove configuração
 */
async function apiDeleteSetting(type, id) {
    try {
        await window.db.collection(type).doc(id).delete();
    } catch (error) {
        console.error(`Erro ao remover ${type}:`, error);
        throw error;
    }
}

/**
 * Baixa o relatório em Excel utilizando SheetJS.
 */
async function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        alert('A biblioteca XLSX não está carregada no index.html.');
        return;
    }
    try {
        const ws = XLSX.utils.json_to_sheet(allIncidents);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Nao_Conformidades");
        XLSX.writeFile(wb, "Nao_Conformidades.xlsx");
    } catch (error) {
        console.error('Erro ao exportar:', error);
        alert('Erro ao exportar dados.');
    }
}
