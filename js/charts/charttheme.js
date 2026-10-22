/**
 * chartTheme.js
 * -------------
 * Paleta de cores e helpers de tema compartilhados por todos os gráficos
 * (Chart.js) do dashboard. Centraliza um padrão visual moderno, com cores
 * distintas por categoria/série e suporte a modo claro/escuro, para que
 * todos os gráficos do sistema sigam o mesmo estilo.
 */

const CHART_PALETTE = [
    '#3B82F6', // azul elétrico
    '#06B6D4', // ciano
    '#8B5CF6', // violeta
    '#10B981', // verde esmeralda
    '#F59E0B', // âmbar
    '#F43F5E', // vermelho coral
    '#64748B'  // azul acinzentado
];

function chartColor(index) {
    return CHART_PALETTE[index % CHART_PALETTE.length];
}

function isDarkMode() {
    return document.documentElement.classList.contains('dark');
}

function chartGridColor() {
    return isDarkMode() ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)';
}

function chartTickColor() {
    return isDarkMode() ? '#b0bdd0' : '#475569';
}

function chartTooltipBg() {
    return isDarkMode() ? '#1e293b' : '#0f172a';
}

function chartCardBorderColor() {
    return isDarkMode() ? '#111827' : '#ffffff';
}
