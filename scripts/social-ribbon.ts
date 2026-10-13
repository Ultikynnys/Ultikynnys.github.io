import { icon, type IconName } from './icons';

type Value = string | boolean | string[];
interface Contacts {
    profile: Record<string, Value>;
    social: Record<string, Record<string, Value>>;
    ribbon: { order: string[] };
}
export function parseContactsToml(text: string): Contacts {
    const config: Contacts = { profile: {}, social: {}, ribbon: { order: [] } };
    let section = '';
    let subsection = '';
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        const header = line.match(/^\[(\w+)(?:\.(\w+))?\]$/);
        if (header) {
            section = header[1]; subsection = header[2] ?? '';
            if (section === 'social' && subsection) config.social[subsection] = {};
            continue;
        }
        const pair = line.match(/^(\w+)\s*=\s*(.+)$/);
        if (!pair) continue;
        const [, key, rawValue] = pair;
        const value: Value = rawValue.startsWith('[') ? rawValue.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, '')) : rawValue === 'true' ? true : rawValue === 'false' ? false : rawValue.replace(/^"|"$/g, '');
        if (section === 'social' && subsection) config.social[subsection][key] = value;
        else if (section === 'profile') config.profile[key] = value;
        else if (section === 'ribbon' && key === 'order' && Array.isArray(value)) config.ribbon.order = value;
    }
    return config;
}

const SOCIAL_ICONS: Record<string, IconName> = {
    discord: 'messenger',
    artstation: 'pictures',
    cv: 'document',
    email: 'mail',
    linkedin: 'contacts',
    github: 'web',
    twitter: 'web'
};

function buildContactLink(key: string, social: Record<string, Value>, size: number, extraClass: string): HTMLAnchorElement {
    const link = document.createElement('a');
    link.href = String(social.url);
    link.className = [String(social.class ?? ''), extraClass].filter(Boolean).join(' ');
    if (social.external !== false) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    const brand = typeof social.icon === 'string' ? social.icon : '';
    const svgIcon = typeof social.iconSvg === 'string' ? social.iconSvg : '';
    link.innerHTML = brand ? `<i class="xp-fav-icon ${brand}" aria-hidden="true"></i>`
        : svgIcon ? `<img class="xp-fav-icon" src="${svgIcon}" width="${size}" height="${size}" alt="">`
        : icon(SOCIAL_ICONS[key] ?? 'web', size);
    link.append(document.createTextNode(` ${String(social.label ?? key)}`));
    return link;
}

export async function loadSocialRibbon(): Promise<void> {
    try {
        const response = await fetch('config/contacts.toml');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const config = parseContactsToml(await response.text());
        const favourites = document.createElement('nav');
        favourites.className = 'xp-favourites'; favourites.setAttribute('aria-label', 'Favourite links');
        // Mirror the same contacts into the Start menu side panel, one icon size down.
        const side = document.querySelector<HTMLElement>('#xp-start-menu .xp-menu-side');
        for (const key of config.ribbon.order) {
            const social = config.social[key];
            if (!social || typeof social.url !== 'string') continue;
            favourites.append(buildContactLink(key, social, 32, ''));
            if (side) side.append(buildContactLink(key, social, 16, 'xp-menu-side-link'));
        }
        const shortcuts = document.getElementById('xp-shortcuts');
        if (shortcuts) shortcuts.after(favourites); else document.body.append(favourites);
    } catch (error) { console.warn('Contacts unavailable', error); }
}
