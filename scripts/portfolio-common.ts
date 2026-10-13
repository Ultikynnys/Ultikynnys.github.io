import { element } from './dom';
import { icon } from './icons';

export interface Project {
    title: string;
    description: string;
    media: string | string[];
    github?: string;
    artstation?: string;
    store?: string;
    demo?: string;
    engine?: string;
    private?: boolean;
    comparison?: boolean;
    steam?: boolean;
    workshop?: boolean;
    languages?: string[];
    priority?: number;
}
export interface CardOptions {
    badgeOrder?: ('private' | 'demo' | 'github' | 'artstation')[];
    fallbackBadge?: string;
    multiBadge?: boolean;
    showLanguageNotches?: boolean;
    alwaysShowEngineTag?: boolean;
}
export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
function safeUrl(value: string): string {
    return /^(?:https?:\/\/|(?:images|audio|content)\/)/i.test(value) ? escapeHtml(value) : '';
}
export function parseMarkdown(markdown: string): { projects: Project[]; intro: string } {
    const sections = markdown.split(/^## /m);
    const projects: Project[] = [];
    for (const section of sections.slice(1)) {
        const project: Project = { title: '', description: '', media: '' };
        for (const line of section.split(/\r?\n/)) {
            const match = line.match(/^- (\w+):\s*(.*)$/);
            if (!match) continue;
            const [, field, value] = match;
            switch (field.toLowerCase()) {
                case 'title': project.title = value; break;
                case 'description': project.description = value; break;
                case 'media': project.media = value.startsWith('[') ? value.slice(1, -1).split(',').map(s => s.trim()) : value; break;
                case 'github': project.github = value; break;
                case 'artstation': project.artstation = value; break;
                case 'store': project.store = value; break;
                case 'demo': project.demo = value; break;
                case 'engine': project.engine = value; break;
                case 'private': project.private = value.toLowerCase() === 'true'; break;
                case 'comparison': project.comparison = value.toLowerCase() === 'true'; break;
                case 'steam': project.steam = value.toLowerCase() === 'true'; break;
                case 'workshop': project.workshop = value.toLowerCase() === 'true'; break;
                case 'languages': project.languages = value.split(',').map(s => s.trim()).filter(Boolean); break;
                case 'priority': { const priority = Number(value); if (Number.isFinite(priority)) project.priority = priority; break; }
            }
        }
        if (project.title) projects.push(project);
    }
    return { projects, intro: sections[0].split('\n').slice(1).join('\n').trim() };
}
export function parseSimpleToml(text: string): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {};
    let current = '';
    for (const raw of text.split(/\r?\n/)) {
        const section = raw.trim().match(/^\[([^\]]+)\]$/);
        if (section) { current = section[1]; result[current] = {}; continue; }
        const pair = raw.match(/^\s*(\w+)\s*=\s*"([^"]*)"/);
        if (pair && current) result[current][pair[1]] = pair[2];
    }
    return result;
}
function createCarousel(images: string[], id: number): string {
    return `<div class="carousel-container" id="carousel-${id}">${images.map((image, i) => `<img src="${safeUrl(image)}" alt="Project view ${i + 1}" class="carousel-image ${i === 0 ? 'active' : ''}">`).join('')}
        <button class="carousel-nav carousel-prev" data-carousel-step="-1" aria-label="Previous image">&lt;</button>
        <button class="carousel-nav carousel-next" data-carousel-step="1" aria-label="Next image">&gt;</button>
        <div class="carousel-dots">${images.map((_, i) => `<button class="carousel-dot ${i === 0 ? 'active' : ''}" data-carousel-index="${i}" aria-label="Show image ${i + 1}"></button>`).join('')}</div></div>`;
}
function renderMedia(project: Project, id: number): string {
    const media = project.media;
    if (!media) return `<div class="media-placeholder" role="img" aria-label="${escapeHtml(project.title)}"></div>`;
    if (Array.isArray(media)) return createCarousel(media, id);
    const title = escapeHtml(project.title);
    if (/\.(mp4|webm|mov|ogv)(\?.*)?$/i.test(media)) return `<video src="${safeUrl(media)}" aria-label="${title}" autoplay muted loop playsinline controls></video>`;
    const youtube = media.match(/(?:youtu\.be\/|[?&]v=|youtube\.com\/embed\/)([\w-]+)/);
    if (youtube) return `<iframe title="${title}" src="https://www.youtube.com/embed/${youtube[1]}" allowfullscreen></iframe>`;
    const sketchfab = media.match(/sketchfab\.com\/models\/([\w-]+)/);
    if (sketchfab) return `<iframe title="${title}" src="https://sketchfab.com/models/${sketchfab[1]}/embed?autostart=0" data-autoplay-url="https://sketchfab.com/models/${sketchfab[1]}/embed?autostart=1" allowfullscreen></iframe>`;
    return `<img src="${safeUrl(media)}" alt="${title}" loading="lazy">`;
}
export function createUnifiedProjectCard(project: Project, id: number, options: CardOptions = {}): string {
    const hasStore = Boolean(project.store);
    const links = (options.badgeOrder ?? ['private', 'demo', 'github']).flatMap(key => {
        if (key === 'private') return [];
        const url = project[key];
        return url ? [`<a class="${key}-link" href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${key === 'github' ? 'GitHub' : key === 'artstation' ? 'ArtStation' : 'Demo'}</a>`] : [];
    });
    // A project offered through a public store is not private, so the two badges never co-occur.
    const privateTag = project.private && !hasStore ? '<span class="private-tag">Private</span>' : '';
    // Clickable badges lead the row; the non-clickable Private tag trails the action links.
    const orderedBadges = [...links, privateTag].filter(Boolean);
    const primary = options.multiBadge ? orderedBadges : orderedBadges.slice(0, 1);
    const badgeHtml = primary.join('') || (!hasStore && options.fallbackBadge === 'private' ? '<span class="private-tag">Private</span>' : '');
    const languages = options.showLanguageNotches ? (project.languages ?? []).slice(0, 3).map(language => `<span class="language-notch language-${escapeHtml(language.toLowerCase().replace('c++', 'cpp').replace('c#', 'csharp'))}">${escapeHtml(language)}</span>`).join('') : '';
    const engine = options.alwaysShowEngineTag ? `<div class="game-tag">${escapeHtml(project.engine ?? 'Game')}</div>` : '';
    const store = project.store ? `<a class="store-link" href="${safeUrl(project.store)}" target="_blank" rel="noopener noreferrer">Store</a>` : '';
    return `<article class="project-card" data-project-id="${id}" tabindex="0" aria-label="Open ${escapeHtml(project.title)}">
        <div class="xp-titlebar xp-focus-bar" aria-hidden="true">${icon('folder', 16)}<span class="xp-title">${escapeHtml(project.title)}</span><div class="xp-window-controls"><button class="xp-focus-min" type="button" aria-label="Minimize" tabindex="-1"><span class="xp-glyph-min"></span></button><button class="xp-focus-max" type="button" aria-label="Maximize" tabindex="-1"><span class="xp-glyph-max"></span></button><button class="xp-focus-close xp-close" type="button" aria-label="Close" tabindex="-1"><span class="xp-glyph-close"></span></button></div></div>
        <div class="project-badges">${badgeHtml}${store}${languages}${engine}</div>
        <div class="project-media">${renderMedia(project, id)}</div>
        <div class="project-info"><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.description)}</p></div></article>`;
}
export function initNameAnimation(): void {
    const heading = document.querySelector<HTMLElement>('#name-display h1');
    const indicator = document.querySelector<HTMLElement>('.name-indicator');
    if (!heading || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const names = ['Ubeid Hussein', 'Ultikynnys', 'R60D'];
    let index = 0;
    window.setInterval(() => {
        index = (index + 1) % names.length;
        const target = names[index];
        let position = 0;
        const timer = window.setInterval(() => {
            heading.textContent = target.slice(0, position) + Array.from({ length: target.length - position }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
            if (++position > target.length) { clearInterval(timer); heading.textContent = target; }
        }, 50);
        if (indicator) indicator.textContent = index === 0 ? 'Full name' : 'Also known as';
    }, 8000);
}
export function setupProjectExpansion(): void {
    const container = document.getElementById('projects-container');
    if (!container) return;
    const TASKBAR = 30;
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));
    let expanded: HTMLElement | null = null;
    const close = () => {
        if (expanded) {
            expanded.classList.remove('expanded', 'win-maximized');
            expanded.style.left = ''; expanded.style.top = ''; expanded.style.width = ''; expanded.style.height = '';
        }
        expanded = null;
        container.classList.remove('has-expanded');
        document.getElementById('overlay')?.classList.remove('active');
        document.body.classList.remove('body-no-scroll');
    };
    const open = (event: Event) => {
        const target = event.target;
        if (!(target instanceof Element) || target.closest('a, button, video, iframe') || document.body.classList.contains('yasuo-mode-active')) return;
        const card = target.closest<HTMLElement>('.project-card');
        if (!card || card === expanded) return;
        close(); expanded = card;
        card.classList.add('expanded'); container.classList.add('has-expanded');
        // Open as a floating window centred over the desktop, above the taskbar.
        const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
        const w = Math.min(1000, Math.max(340, vw - 96));
        const h = Math.min(680, Math.max(240, vh - 120));
        card.style.width = `${w}px`; card.style.height = `${h}px`;
        card.style.left = `${Math.max(0, Math.round((vw - w) / 2))}px`;
        card.style.top = `${Math.max(0, Math.round((vh - h) / 2))}px`;
        document.getElementById('overlay')?.classList.add('active');
        document.body.classList.add('body-no-scroll');
    };
    container.addEventListener('click', open);
    container.addEventListener('keydown', event => { if (event.key === 'Enter') open(event); });
    // Title-bar window controls on the focused card (delegated: cards mount after this runs).
    container.addEventListener('click', event => {
        const target = event.target;
        if (!(target instanceof Element) || !expanded) return;
        if (target.closest('.xp-focus-close') || target.closest('.xp-focus-min')) { close(); return; }
        if (target.closest('.xp-focus-max')) {
            const maximized = expanded.classList.toggle('win-maximized');
            expanded.querySelector('.xp-focus-max span')?.setAttribute('class', maximized ? 'xp-glyph-restore' : 'xp-glyph-max');
            target.closest('.xp-focus-max')?.setAttribute('aria-label', maximized ? 'Restore window' : 'Maximize window');
        }
    });
    // Drag the focused window by its title bar, clamped inside the desktop.
    let drag: { id: number; dx: number; dy: number } | null = null;
    container.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !expanded) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const bar = target.closest('.xp-focus-bar');
        if (!bar || !expanded.contains(bar) || target.closest('.xp-window-controls') || expanded.classList.contains('win-maximized')) return;
        const rect = expanded.getBoundingClientRect();
        drag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
        (bar as HTMLElement).setPointerCapture(event.pointerId);
        document.body.classList.add('xp-dragging');
    });
    container.addEventListener('pointermove', event => {
        if (!drag || !expanded || event.pointerId !== drag.id) return;
        const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
        expanded.style.left = `${clamp(event.clientX - drag.dx, 0, vw - expanded.offsetWidth)}px`;
        expanded.style.top = `${clamp(event.clientY - drag.dy, 0, vh - TASKBAR - expanded.offsetHeight)}px`;
    });
    const endDrag = (event: PointerEvent) => {
        if (!drag || event.pointerId !== drag.id) return;
        drag = null;
        document.body.classList.remove('xp-dragging');
    };
    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', endDrag);
    // Native media controls can capture the press and retarget the click away from
    // the overlay, so collapse on any click outside the expanded card instead.
    document.addEventListener('click', event => {
        if (expanded && event.target instanceof Element && !event.target.closest('.project-card.expanded')) close();
    });
    document.getElementById('overlay')?.addEventListener('click', close);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
}
export function initCarousels(): void {
    document.addEventListener('click', event => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const button = target.closest<HTMLButtonElement>('[data-carousel-step], [data-carousel-index]');
        const carousel = button?.closest('.carousel-container');
        if (!button || !carousel) return;
        event.stopPropagation();
        const images = [...carousel.querySelectorAll('.carousel-image')];
        if (!images.length) return;
        const current = images.findIndex(image => image.classList.contains('active'));
        const index = button.dataset.carouselIndex !== undefined ? Number(button.dataset.carouselIndex) : (current + Number(button.dataset.carouselStep) + images.length) % images.length;
        images.forEach((image, i) => image.classList.toggle('active', i === index));
        carousel.querySelectorAll('.carousel-dot').forEach((dot, i) => dot.classList.toggle('active', i === index));
    });
}
export async function initPortfolio(file: string, options: CardOptions): Promise<void> {
    const container = element('projects-container');
    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const { projects } = parseMarkdown(await response.text());
        projects.sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));
        container.innerHTML = projects.map((project, index) => {
            if (project.store?.includes('steamcommunity.com') && /TF2|Team Fortress/.test(project.title + project.description)) project.private = true;
            return createUnifiedProjectCard(project, index, options);
        }).join('');
    } catch (error) {
        container.textContent = `Failed to load projects: ${error instanceof Error ? error.message : String(error)}`;
    }
    container.addEventListener('mouseover', event => {
        if (!(event.target instanceof Element)) return;
        const frame = event.target.closest('.project-card')?.querySelector<HTMLIFrameElement>('iframe[data-autoplay-url]');
        if (frame?.dataset.autoplayUrl) { frame.src = frame.dataset.autoplayUrl; delete frame.dataset.autoplayUrl; }
    });
}
export function initSecretMode(): void {
    const heading = document.querySelector('#name-display h1');
    if (!heading) return;
    let clicks = 0;
    let timer = 0;
    let slices = 0;
    let finished = 0;
    const play = (file: string) => { const clip = new Audio(file); const level = window.xpVolume?.(); if (typeof level === 'number') clip.volume = level; void clip.play().catch(() => undefined); };
    const indicator = document.createElement('img');
    indicator.id = 'yasuo-mode-indicator'; indicator.src = 'images/yasuo.png'; indicator.alt = 'Yasuo Mode Active';
    document.body.append(indicator);
    const setActive = (on: boolean) => {
        document.body.classList.toggle('yasuo-mode-active', on);
        indicator.classList.toggle('active', on);
    };
    const deactivate = () => {
        setActive(false);
        document.querySelectorAll<HTMLElement>('.project-card, .portfolio-choice').forEach(card => { card.style.visibility = ''; card.style.pointerEvents = ''; });
        play(`audio/YasuoFinished${finished++ % 2 === 0 ? 'A' : 'B'}.ogg`);
    };
    // One slash: the blade sweeps the card, then the card is cut in two and the halves fall away.
    const attack = (card: HTMLElement) => {
        if (card.style.visibility === 'hidden') return;
        play(`audio/Yasuo_Original_BasicAttack_${Math.floor(Math.random() * 4)}.ogg`);
        const rect = card.getBoundingClientRect();
        const swordX = `${rect.left + rect.width / 2 - 150}px`, swordY = `${rect.top + rect.height / 2 - 150}px`;
        // Fainter, delayed copies render first so the solid blade lands on top; a short delay keeps
        // them hugging the blade for a fast smear rather than a stretched-out trail.
        for (const trail of [{ cls: 'yasuo-ghost-3', delay: '.036s' }, { cls: 'yasuo-ghost-2', delay: '.024s' }, { cls: 'yasuo-ghost', delay: '.012s' }, { cls: '', delay: '' }]) {
            const sword = document.createElement('img');
            sword.src = 'images/YasouSword.png'; sword.alt = ''; sword.className = `yasuo-sword slash-left-to-right${trail.cls ? ` ${trail.cls}` : ''}`;
            sword.style.left = swordX; sword.style.top = swordY;
            if (trail.delay) sword.style.animationDelay = trail.delay;
            document.body.append(sword);
            sword.addEventListener('animationend', () => sword.remove(), { once: true });
        }
        card.style.visibility = 'hidden'; card.style.pointerEvents = 'none';
        window.setTimeout(() => {
            play(`audio/metal${Math.floor(Math.random() * 5) + 1}.ogg`);
            const box = card.getBoundingClientRect();
            // Append inside .xp-content so the clone inherits the XP card styling (.xp-content .project-card),
            // but position against the window: the content box is static, so that is the containing block.
            const host = document.querySelector('.xp-content') ?? document.body;
            const base = (host.closest('.xp-window') ?? document.body).getBoundingClientRect();
            const left = box.left - base.left, top = box.top - base.top;
            const flash = document.createElement('div');
            flash.className = 'flash-slice';
            flash.style.width = '1000px';
            flash.style.left = `${left - box.width / 2}px`;
            flash.style.top = `${top - box.height / 2}px`;
            flash.style.transform = `rotate(${Math.atan2(box.height, box.width) * (180 / Math.PI)}deg)`;
            host.append(flash);
            flash.addEventListener('animationend', () => flash.remove(), { once: true });
            for (const isTop of [true, false]) {
                const half = document.createElement('div');
                half.className = `card-half ${isTop ? 'card-half-top' : 'card-half-bottom'}`;
                half.style.width = `${box.width}px`; half.style.height = `${box.height}px`;
                half.style.left = `${left}px`; half.style.top = `${top}px`;
                const clone = card.cloneNode(true) as HTMLElement;
                clone.style.visibility = 'visible'; clone.style.margin = '0'; clone.style.pointerEvents = '';
                clone.classList.remove('expanded', 'win-maximized'); clone.removeAttribute('data-project-id');
                clone.style.position = 'absolute'; clone.style.left = '0'; clone.style.width = '100%'; clone.style.height = '100%';
                clone.style.top = isTop ? '0' : `-${box.height / 2}px`;
                half.append(clone);
                host.append(half);
                half.addEventListener('animationend', () => half.remove(), { once: true });
            }
        }, 150);
        if (++slices >= 7) window.setTimeout(deactivate, 700);
    };
    heading.addEventListener('click', () => {
        window.clearTimeout(timer); timer = window.setTimeout(() => { clicks = 0; }, 500);
        if (++clicks === 3) {
            clicks = 0; slices = 0;
            if (document.body.classList.contains('yasuo-mode-active')) deactivate();
            else setActive(true);
        }
    });
    document.addEventListener('click', event => {
        if (!document.body.classList.contains('yasuo-mode-active') || !(event.target instanceof Element)) return;
        const card = event.target.closest<HTMLElement>('.project-card, .portfolio-choice');
        if (!card) return;
        event.preventDefault(); event.stopPropagation();
        attack(card);
    }, true);
}
export async function loadLanguageColors(): Promise<void> {
    try {
        const response = await fetch('content/language_colors.toml');
        if (!response.ok) return;
        const colors = parseSimpleToml(await response.text());
        const style = document.createElement('style');
        style.textContent = Object.entries(colors).filter(([code, cfg]) => /^[\w-]+$/.test(code) && /^#[\da-f]{3,8}$/i.test(cfg.bg) && /^#[\da-f]{3,8}$/i.test(cfg.fg)).map(([code, cfg]) => `.language-${code}{background:${cfg.bg};color:${cfg.fg}}`).join('\n');
        document.head.append(style);
    } catch (error) { console.warn('Language colors unavailable', error); }
}
