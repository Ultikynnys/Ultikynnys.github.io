type TomlValue = string | boolean | string[];

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
}

export async function fetchText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
}

// Deliberately small: `[section]`/`[section.sub]` headers with string, boolean or array values,
// which covers every config file this site reads.
export function parseToml(text: string): Record<string, Record<string, TomlValue>> {
    const result: Record<string, Record<string, TomlValue>> = {};
    let current = '';
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        const section = line.match(/^\[([^\]]+)\]$/);
        if (section) { current = section[1]; if (!result[current]) result[current] = {}; continue; }
        const pair = line.match(/^(\w+)\s*=\s*(.+)$/);
        if (pair && current) result[current][pair[1]] = parseTomlValue(pair[2]);
    }
    return result;
}

function parseTomlValue(raw: string): TomlValue {
    if (raw.startsWith('[')) return raw.slice(1, -1).split(',').map(part => part.trim().replace(/"/g, ''));
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return raw.replace(/^"|"$/g, '');
}
