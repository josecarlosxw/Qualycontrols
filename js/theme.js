/**
 * theme.js
 * --------
 * Controla o modo claro/escuro da aplicação (persistido em localStorage).
 */

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('qc-theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
    applyChartTheme(isDark);
}

// Ajusta as cores padrão do Chart.js (se presente na página) e re-renderiza
// os gráficos do dashboard para refletir o novo tema.
function applyChartTheme(isDark) {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.color = isDark ? '#b0bdd0' : '#475569';
    Chart.defaults.borderColor = isDark ? '#263247' : '#e2e8f0';
    if (typeof applyAndRender === 'function') {
        applyAndRender();
    }
}

function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    if (!icon) return;
    const isDark = document.documentElement.classList.contains('dark');
    icon.className = isDark ? 'ph ph-sun text-xl' : 'ph ph-moon text-xl';
    if (label) label.textContent = isDark ? 'Modo Claro' : 'Modo Escuro';
}

document.addEventListener('DOMContentLoaded', updateThemeIcon);

window.toggleTheme = toggleTheme;
