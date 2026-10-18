import { fetchText } from './util';

export function parsePageHeaders(markdown: string) {
    const result: Record<string, Record<string, string>> = {};
    const sections = markdown.split(/\n(?=## )/);

    for (const section of sections) {
        const lines = section.split('\n');
        let currentKey = null;
        let firstLine = lines[0].trim();

        if (firstLine.startsWith('## ') && !firstLine.startsWith('### ')) {
            currentKey = firstLine.replace('## ', '').trim();
        } else if (firstLine.startsWith('### ')) {
            currentKey = firstLine.replace('### ', '').trim();
        }

        if (!currentKey) continue;

        const kv: Record<string, string> = {};
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') && trimmed.includes(':')) {
                const colonIdx = trimmed.indexOf(':');
                const key = trimmed.substring(2, colonIdx).trim();
                const value = trimmed.substring(colonIdx + 1).trim();
                if (key && value) {
                    kv[key] = value;
                }
            }
        }

        if (Object.keys(kv).length > 0) {
            if (firstLine.startsWith('### ') && result[currentKey]) {
                Object.assign(result[currentKey], kv);
            } else {
                result[currentKey] = kv;
            }
        }
    }

    return result;
}

export function loadPageHeaders() {
    fetchText('content/page-headers.md')
        .then(text => {
            const allHeaders = parsePageHeaders(text);
            const pageKey = document.body.classList.contains('portfolio-programming') ? 'programming'
                : document.body.classList.contains('portfolio-3d') ? '3d'
                : document.body.classList.contains('portfolio-gamedev') ? 'gamedev'
                : 'index';
            const headers = allHeaders[pageKey];
            if (!headers) return;
            Object.entries(headers).forEach(([key, value]) => {
                if (key === 'page-title') {
                    document.title = value;
                    return;
                }
                const el = document.querySelector(`[data-header="${key}"]`);
                if (el) el.innerHTML = value;
            });
        })
        .catch(e => console.warn('Failed to load page headers:', e));
}
