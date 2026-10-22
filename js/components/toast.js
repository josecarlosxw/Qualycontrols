/**
 * toast.js
 * --------
 * Sistema de notificações toast moderno para substituir alert().
 */

function showToast(message, type = 'info', duration = 4000) {
    // Create container if not exists
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:12px;pointer-events:none;max-width:420px;width:100%;';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'ph-check-circle',
        error: 'ph-x-circle',
        warning: 'ph-warning',
        info: 'ph-info'
    };

    const colors = {
        success: { bg: 'linear-gradient(135deg, #10b981, #059669)', glow: 'rgba(16,185,129,0.3)' },
        error: { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', glow: 'rgba(239,68,68,0.3)' },
        warning: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', glow: 'rgba(245,158,11,0.3)' },
        info: { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', glow: 'rgba(59,130,246,0.3)' }
    };

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.style.cssText = `
        pointer-events:auto;
        display:flex;
        align-items:flex-start;
        gap:12px;
        padding:16px 20px;
        border-radius:16px;
        background:var(--surface-1, #ffffff);
        border:1px solid var(--border-color, #e2e8f0);
        box-shadow:0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02);
        animation:toastSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
        position:relative;
        overflow:hidden;
        min-width:320px;
        backdrop-filter:blur(20px) saturate(180%);
    `;

    const iconEl = document.createElement('div');
    iconEl.style.cssText = `
        width:36px;height:36px;border-radius:10px;
        display:flex;align-items:center;justify-content:center;
        background:${colors[type].bg};
        box-shadow:0 4px 12px ${colors[type].glow};
        flex-shrink:0;
        color:white;font-size:1.2rem;
    `;
    iconEl.innerHTML = `<i class="ph ${icons[type]}"></i>`;

    const content = document.createElement('div');
    content.style.cssText = 'flex:1;min-width:0;';
    
    const title = document.createElement('p');
    title.style.cssText = 'font-weight:700;font-size:0.875rem;margin:0 0 2px 0;color:var(--text-primary, #0f172a);';
    title.textContent = type === 'success' ? 'Sucesso!' : type === 'error' ? 'Erro!' : type === 'warning' ? 'Atenção!' : 'Informação';

    const msg = document.createElement('p');
    msg.style.cssText = 'font-size:0.8125rem;margin:0;color:var(--text-secondary, #64748b);line-height:1.4;';
    msg.textContent = message;

    content.appendChild(title);
    content.appendChild(msg);

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
        background:none;border:none;cursor:pointer;color:var(--text-secondary, #64748b);
        font-size:1.1rem;padding:2px;border-radius:8px;
        transition:all 0.2s;flex-shrink:0;
        display:flex;align-items:center;justify-content:center;
        width:28px;height:28px;
    `;
    closeBtn.innerHTML = '<i class="ph ph-x"></i>';
    closeBtn.onmouseover = () => { closeBtn.style.background = 'rgba(0,0,0,0.05)'; };
    closeBtn.onmouseout = () => { closeBtn.style.background = 'none'; };
    closeBtn.onclick = () => dismissToast(toast);

    // Progress bar
    const progress = document.createElement('div');
    progress.style.cssText = `
        position:absolute;bottom:0;left:0;height:3px;
        background:${colors[type].bg};
        width:100%;transform-origin:left;
        animation:toastProgress ${duration}ms linear both;
        border-radius:0 0 16px 16px;
    `;

    toast.appendChild(iconEl);
    toast.appendChild(content);
    toast.appendChild(closeBtn);
    toast.appendChild(progress);
    container.appendChild(toast);

    // Auto dismiss
    const timer = setTimeout(() => dismissToast(toast), duration);
    toast.dataset.timer = timer;

    // Inject keyframes if not already done
    if (!document.getElementById('toast-keyframes')) {
        const style = document.createElement('style');
        style.id = 'toast-keyframes';
        style.textContent = `
            @keyframes toastSlideIn {
                from { opacity:0; transform:translateX(100%) scale(0.8); }
                to { opacity:1; transform:translateX(0) scale(1); }
            }
            @keyframes toastSlideOut {
                from { opacity:1; transform:translateX(0) scale(1); max-height:200px; margin-bottom:0; }
                to { opacity:0; transform:translateX(100%) scale(0.8); max-height:0; margin-bottom:-12px; }
            }
            @keyframes toastProgress {
                from { transform:scaleX(1); }
                to { transform:scaleX(0); }
            }
        `;
        document.head.appendChild(style);
    }
}

function dismissToast(toast) {
    if (toast.dataset.dismissed) return;
    toast.dataset.dismissed = 'true';
    clearTimeout(parseInt(toast.dataset.timer));
    toast.style.animation = 'toastSlideOut 0.4s cubic-bezier(0.4,0,0.2,1) both';
    setTimeout(() => toast.remove(), 400);
}
