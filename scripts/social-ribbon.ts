import { icon, type IconName } from './icons';
import { fetchText, parseToml } from './util';

type Value = string | boolean | string[];
interface Contacts {
    profile: Record<string, Value>;
    social: Record<string, Record<string, Value>>;
    ribbon: { order: string[] };
}
export function parseContactsToml(text: string): Contacts {
    const config: Contacts = { profile: {}, social: {}, ribbon: { order: [] } };
    for (const [section, values] of Object.entries(parseToml(text))) {
        if (section === 'profile') Object.assign(config.profile, values);
        else if (section === 'ribbon') { const order = values.order; if (Array.isArray(order)) config.ribbon.order = order; }
        else if (section.startsWith('social.')) config.social[section.slice('social.'.length)] = values;
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
        const config = parseContactsToml(await fetchText('config/contacts.toml'));
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
