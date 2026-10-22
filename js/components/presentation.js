/** Presentation only: no queries, transformations or metric calculations. */
(function () {
    const page = window.location.pathname.split('/').pop();
    if (page === 'index.html' || page === 'retrabalho.html') {
        document.body.classList.add('qc-dashboard');
        if (page === 'retrabalho.html') document.body.classList.add('qc-dashboard-m2');
    }
    function token(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
    function chartDefaults() {
        if (typeof Chart === 'undefined') return;
        const dark = document.documentElement.classList.contains('dark');
        const defaults = Chart.defaults;
        defaults.color = token('--text-secondary');
        defaults.borderColor = token('--chart-grid');
        defaults.font.family = "'Inter', sans-serif";
        defaults.font.size = 12;
        defaults.animation.duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
        Object.assign(defaults.plugins.tooltip, {
            backgroundColor: token('--chart-tooltip'),
            titleColor: token('--chart-tooltip-text'), bodyColor: token('--chart-tooltip-text'),
            borderColor: token('--border-strong'), borderWidth: 1,
            padding: 10, cornerRadius: 5, displayColors: true,
        });
        Object.assign(defaults.plugins.legend.labels, { padding: 12, usePointStyle: true, boxWidth: 6, boxHeight: 6 });
    }
    chartDefaults();
    if (typeof Chart !== 'undefined') {
        Chart.register({
            id: 'qcPresentation',
            beforeInit: function (chart) {
                chartDefaults();
                if (chart.config.type === 'doughnut' && window.innerWidth < 768) {
                    chart.options.plugins.legend.position = 'bottom';
                }
            },
            beforeUpdate: function (chart) {
                if (document.body.classList.contains('qc-dashboard')) {
                    const primary = token('--chart-primary');
                    const secondary = token('--chart-secondary');
                    const comparison = token('--chart-comparison');
                    chart.data.datasets.forEach(function (series, index) {
                        const color = index === 0 ? primary : chart.canvas.id === 'm2EvolutionChart' ? secondary : comparison;
                        if (chart.config.type === 'line') {
                            Object.assign(series, { borderColor: color, backgroundColor: color, borderWidth: 1.5, fill: false, pointRadius: 0, pointHoverRadius: 4, pointHitRadius: 12, pointBackgroundColor: color, pointBorderColor: color, tension: 0.25 });
                        } else if (chart.config.type === 'bar') {
                            Object.assign(series, { backgroundColor: color, borderColor: color, borderWidth: 0, borderRadius: 3, maxBarThickness: 16 });
                        } else if (chart.config.type === 'doughnut') {
                            series.backgroundColor = series.data.map(function (_, i) { return [primary, secondary, comparison, '#10B981', '#F59E0B', '#F43F5E'][i % 6]; });
                            series.borderWidth = 0;
                        }
                    });
                    chart.options.plugins.legend.labels.color = token('--text-secondary');
                    Object.assign(chart.options.plugins.tooltip, { backgroundColor: token('--chart-tooltip'), titleColor: token('--chart-tooltip-text'), bodyColor: token('--chart-tooltip-text'), cornerRadius: 5 });
                }
                if (chart.config.type === 'doughnut') chart.options.plugins.legend.position = window.innerWidth < 768 ? 'bottom' : 'right';
                const scales = chart.options.scales;
                Object.keys(scales || {}).forEach(function (key) {
                    scales[key].border.display = false;
                    scales[key].grid.color = token('--chart-grid');
                    scales[key].grid.lineWidth = 0.5;
                    scales[key].ticks.color = token('--text-secondary');
                    scales[key].ticks.font = { size: 12 };
                    scales[key].ticks.padding = 6;
                    scales[key].ticks.maxRotation = 0;
                });
            },
            afterDraw: function (chart) {
                const hasData = chart.data.datasets.some(function (series) { return series.data.length > 0; });
                if (hasData || !chart.chartArea) return;
                const area = chart.chartArea;
                const ctx = chart.ctx;
                ctx.save();
                ctx.fillStyle = Chart.defaults.color;
                ctx.font = "13px Inter, sans-serif";
                ctx.textAlign = 'center';
                ctx.fillText('Nenhum dado para os filtros selecionados', (area.left + area.right) / 2, (area.top + area.bottom) / 2);
                ctx.restore();
            },
        });
    }
    document.addEventListener('DOMContentLoaded', function () {
        const main = document.querySelector('main');
        if (main) {
            main.id = 'qc-main';
            main.setAttribute('tabindex', '-1');
            const skip = document.createElement('a');
            skip.href = '#qc-main'; skip.className = 'qc-skip-link'; skip.textContent = 'Ir para o conteúdo';
            document.body.prepend(skip);
        }
        document.querySelectorAll('canvas').forEach(function (canvas) {
            canvas.setAttribute('role', 'img');
            const title = canvas.closest('.chart-card')?.querySelector('h3, h4');
            canvas.setAttribute('aria-label', title ? title.textContent.trim() : 'Gráfico de indicadores');
        });
        document.querySelectorAll('input, select, textarea').forEach(function (control) {
            if (control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby') || !control.id) return;
            const label = Array.from(document.querySelectorAll('label')).find(function (item) { return item.htmlFor === control.id || item.contains(control); });
            if (!label) control.setAttribute('aria-label', control.title || control.placeholder || control.selectedOptions?.[0]?.textContent || 'Campo de formulário');
        });
    });
})();
