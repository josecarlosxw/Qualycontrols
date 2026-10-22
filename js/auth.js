/**
 * auth.js - Versão corrigida
 */

const firebaseConfig = {
  apiKey: "AIzaSyBf7z377WJhtydEPHSFtthY0IGTnvO1-qQ",
  authDomain: "qualycontrol-c2d80.firebaseapp.com",
  projectId: "qualycontrol-c2d80",
  storageBucket: "qualycontrol-c2d80.firebasestorage.app",
  messagingSenderId: "833091843122",
  appId: "1:833091843122:web:9eafd9571345ed3906f82b",
  measurementId: "G-ZBVQXVFGZE"
};

// Inicializa Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

console.log("✅ Firebase Auth e Firestore inicializados com sucesso!");

// Protege páginas
function requireAuth() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = 'login.html';
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

// Pega Token
async function getAuthToken() {
    const user = auth.currentUser;
    if (!user) return null;
    try {
        return await user.getIdToken(true);
    } catch (error) {
        console.error("Erro ao obter token:", error);
        return null;
    }
}

// Logout
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}


// Mostra um aviso visível quando o Firestore falha (permissão, rede, banco inexistente...).
// Antes esses erros só iam para o console e a tela ficava vazia sem explicação.
function reportDataError(context, error) {
    console.error('Erro em "' + context + '":', error);
    const code = (error && error.code) || '';
    const msgs = {
        'permission-denied': 'Sem permissão para acessar o banco de dados. Publique as regras do Firestore (arquivo firestore.rules) no Console do Firebase.',
        'unavailable': 'Não foi possível conectar ao banco de dados. Verifique a conexão e tente novamente.',
        'failed-precondition': 'O banco Firestore ainda não foi criado neste projeto Firebase (Console > Firestore Database > Criar banco).',
        'unauthenticated': 'Sessão expirada. Faça login novamente.'
    };
    let text = msgs[code] || ('Erro ao carregar dados (' + (code || 'desconhecido') + ').');
    if (code === 'permission-denied') {
        // Detalhes para diagnosticar: qual coleção, qual projeto e se havia usuário logado.
        const u = auth.currentUser;
        text += ' [coleção: ' + context + ' | projeto: ' + firebaseConfig.projectId +
            ' | usuário: ' + (u ? u.email : 'nenhum (não logado)') + ']';
    }
    const show = () => {
        let box = document.getElementById('qc-data-error');
        if (!box) {
            box = document.createElement('div');
            box.id = 'qc-data-error';
            box.setAttribute('role', 'alert');
            box.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:10000;max-width:min(560px,92vw);padding:12px 16px;border-radius:10px;background:#7f1d1d;color:#fff;font:500 14px Inter,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);cursor:pointer;';
            box.title = 'Clique para fechar';
            box.addEventListener('click', () => box.remove());
            document.body.appendChild(box);
        }
        box.textContent = text;
    };
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
}
window.reportDataError = reportDataError;

// Disponibiliza globalmente
window.auth = auth;
window.db = db;
window.requireAuth = requireAuth;
window.getAuthToken = getAuthToken;
window.logout = logout;

console.log("✅ auth.js carregado com sucesso");
