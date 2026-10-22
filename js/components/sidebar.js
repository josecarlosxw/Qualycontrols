/**
 * sidebar.js
 * ----------
 * Sidebar única e retrátil, compartilhada por todas as páginas do sistema.
 * Suporta múltiplos módulos industriais (Módulo 1 - Não Conformidades,
 * Módulo 2 - Retrabalho e Refugo) mantendo cada um com sua própria navegação.
 *
 * Uso: <aside id="app-sidebar"></aside> + <script src="js/components/sidebar.js"></script>
 */

const APP_MODULES = [
    {
        id: 'm1',
        label: 'Não Conformidades',
        short: 'Módulo 1',
        icon: 'ph-shield-check',
        items: [
            { href: 'index.html', icon: 'ph-squares-four', label: 'Dashboard' },
            { href: 'lancamentos.html', icon: 'ph-plus-circle', label: 'Lançamentos' },
            { href: 'planilha.html', icon: 'ph-table', label: 'Planilha' },
            { href: 'configuracoes.html', icon: 'ph-gear', label: 'Configurações' },
        ],
    },
    {
        id: 'm2',
        label: 'Retrabalho e Refugo',
        short: 'Módulo 2',
        icon: 'ph-recycle',
        items: [
            { href: 'retrabalho.html', icon: 'ph-chart-donut', label: 'Dashboard' },
            { href: 'retrabalho-lancamentos.html', icon: 'ph-plus-circle', label: 'Lançamentos' },
            { href: 'retrabalho-planilha.html', icon: 'ph-table', label: 'Registros' },
            { href: 'retrabalho-importar.html', icon: 'ph-upload-simple', label: 'Importar' },
            { href: 'retrabalho-cadastros.html', icon: 'ph-gear', label: 'Cadastros' },
        ],
    },
];

const SIDEBAR_STORAGE_KEY = 'qc-sidebar-collapsed-v2';

function getCurrentPage() {
    const file = window.location.pathname.split('/').pop();
    return file && file.length ? file : 'index.html';
}

function getCurrentModule() {
    const page = getCurrentPage();
    const found = APP_MODULES.find((m) => m.items.some((i) => i.href === page));
    return found || APP_MODULES[0];
}

function isSidebarCollapsed() {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
}

function setSidebarCollapsed(collapsed) {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    const icon = document.getElementById('sidebar-toggle-icon');
    if (icon) icon.className = collapsed ? 'ph ph-caret-right' : 'ph ph-caret-left';
    const toggle = document.querySelector('.sidebar-collapse-btn');
    if (toggle) { toggle.setAttribute('aria-expanded', String(!collapsed)); toggle.setAttribute('aria-label', collapsed ? 'Expandir menu' : 'Recolher menu'); }
    // Chart.js precisa recalcular o tamanho após a animação de largura
    setTimeout(() => window.dispatchEvent(new Event('resize')), 280);
}

function toggleSidebar() {
    setSidebarCollapsed(!isSidebarCollapsed());
}

function toggleMobileSidebar(force) {
    const open = typeof force === 'boolean' ? force : !document.body.classList.contains('sidebar-mobile-open');
    document.body.classList.toggle('sidebar-mobile-open', open);
    const trigger = document.getElementById('sidebar-mobile-toggle');
    if (trigger) { trigger.setAttribute('aria-expanded', String(open)); trigger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu'); }
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar && window.innerWidth < 768) sidebar.inert = !open;
    if (open) sidebar?.querySelector('a')?.focus();
    else trigger?.focus();
}

function renderSidebar() {
    const host = document.getElementById('app-sidebar');
    if (!host) return;

    const page = getCurrentPage();
    const current = getCurrentModule();

    host.className = 'sidebar-premium text-white flex flex-col z-30';

    const modulesHtml = APP_MODULES.map((m) => `
        <a href="${m.items[0].href}" class="module-chip ${m.id === current.id ? 'active' : ''}" title="${m.short} · ${m.label}">
            <i class="ph ${m.icon}"></i>
            <span class="module-chip-text">
                <strong>${m.short}</strong>
                <small>${m.label}</small>
            </span>
        </a>`).join('');

    const navHtml = current.items.map((i) => `
        <a href="${i.href}" class="sidebar-nav-item flex items-center gap-3 ${i.href === page ? 'active' : ''}" title="${i.label}" ${i.href === page ? 'aria-current="page"' : ''}>
            <i class="ph ${i.icon}"></i><span class="font-medium nav-text">${i.label}</span>
        </a>`).join('');

    host.innerHTML = `
        <div class="p-4 flex items-center gap-3 border-b border-white/5 sidebar-head">
            <div class="sidebar-logo"><img src="assets/favicon-192.png" alt="QualiControl"></div>
            <div class="sidebar-brand-text flex-1 min-w-0">
                <h1 class="font-bold leading-tight truncate">QualiControl</h1>
                <p class="truncate">${current.short}</p>
            </div>
            <button type="button" class="sidebar-collapse-btn" onclick="toggleSidebar()" title="Recolher / expandir menu" aria-label="Recolher menu">
                <i class="ph ph-caret-left" id="sidebar-toggle-icon"></i>
            </button>
        </div>

        <div class="p-3 pb-1 space-y-1 sidebar-modules">
            <p class="sidebar-section-label nav-text">Módulos</p>
            ${modulesHtml}
        </div>

        <nav aria-label="Navegação do módulo" class="flex-1 p-3 space-y-1 overflow-y-auto">
            <p class="sidebar-section-label nav-text">${current.label}</p>
            ${navHtml}
        </nav>

        <div class="p-3 border-t border-white/5 space-y-1">
            <button onclick="toggleTheme()" class="sidebar-nav-item w-full flex items-center gap-3" title="Alternar tema">
                <i class="ph ph-moon" id="theme-icon"></i><span class="font-medium text-sm nav-text" id="theme-label">Modo Escuro</span>
            </button>
            <div class="sidebar-user flex items-center justify-between px-3 py-2 gap-2">
                <div class="min-w-0 nav-text">
                    <p class="text-sm truncate" id="user-email">Admin</p>
                </div>
                <button onclick="logout()" class="text-gray-400 hover:text-white transition-colors" title="Sair" aria-label="Sair da conta">
                    <i class="ph ph-sign-out text-lg"></i>
                </button>
            </div>
        </div>`;

    if (!document.getElementById('sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.addEventListener('click', () => toggleMobileSidebar(false));
        document.body.appendChild(overlay);

        const fab = document.createElement('button');
        fab.id = 'sidebar-mobile-toggle';
        fab.type = 'button';
        fab.setAttribute('aria-label', 'Abrir menu');
        fab.innerHTML = '<i class="ph ph-list"></i>';
        fab.addEventListener('click', () => toggleMobileSidebar());
        document.body.appendChild(fab);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && document.body.classList.contains('sidebar-mobile-open')) toggleMobileSidebar(false);
        if (event.key === 'Tab' && window.innerWidth < 768 && document.body.classList.contains('sidebar-mobile-open')) {
            const nodes = [...host.querySelectorAll('a, button')].filter((el) => el.getClientRects().length);
            const trigger = document.getElementById('sidebar-mobile-toggle');
            nodes.push(trigger);
            const first = nodes[0], last = nodes[nodes.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    });
    const syncMobile = () => { host.inert = window.innerWidth < 768 && !document.body.classList.contains('sidebar-mobile-open'); };
    window.addEventListener('resize', syncMobile);
    syncMobile();
    setSidebarCollapsed(isSidebarCollapsed());
    if (typeof updateThemeIcon === 'function') updateThemeIcon();

    // Exibe o e-mail do usuário assim que o Firebase resolver a sessão
    if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
        window.auth.onAuthStateChanged((user) => {
            const el = document.getElementById('user-email');
            if (el && user) el.textContent = user.email;
        });
    }
}

window.toggleSidebar = toggleSidebar;
window.toggleMobileSidebar = toggleMobileSidebar;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSidebar);
} else {
    renderSidebar();
}
