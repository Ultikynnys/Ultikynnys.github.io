import { element, setMaximizeGlyph } from './dom';
import { icon, ICONS, type IconName } from './icons';
import { clamp } from './util';
import { loadSocialRibbon } from './social-ribbon';

declare global { interface Window { xpVolume?: () => number } }

// Genuine Windows XP SP2 sounds, expanded from the ISO's I386\*.WA_ files.
const XP_SOUNDS = { start: 'audio/xp-start.ogg', minimize: 'audio/xp-minimize.ogg', restore: 'audio/xp-restore.ogg', startup: 'audio/xp-startup.ogg' } as const;
type XpSound = keyof typeof XP_SOUNDS;
const soundCache = new Map<XpSound, HTMLAudioElement>();
function getClip(name: XpSound): HTMLAudioElement | null {
    try {
        let clip = soundCache.get(name);
        if (!clip) { clip = new Audio(XP_SOUNDS[name]); clip.preload = 'auto'; soundCache.set(name, clip); }
        return clip;
    } catch { return null; }
}
function playSound(name: XpSound): HTMLAudioElement | null {
    const clip = getClip(name);
    if (!clip) return null;
    try {
        clip.volume = window.xpVolume?.() ?? 1;
        clip.currentTime = 0;
        void clip.play().catch(() => { /* Blocked until the user interacts with the page. */ });
    } catch { /* Audio can be unavailable. */ }
    return clip;
}
// A real navigation unloads the document and cuts the click sound off mid-play, so hold the
// navigation until the clip ends (the timeout is a safety net if audio is blocked or muted).
function navigateAfterClick(href: string): void {
    let done = false;
    const go = (): void => { if (done) return; done = true; location.assign(href); };
    const clip = playSound('start');
    if (!clip) { go(); return; }
    clip.addEventListener('ended', go, { once: true });
    window.setTimeout(go, 700);
}
// Warm only the click clip (tiny) so the first navigation click is never silent. The startup chime
// is fetched on demand when the boot screen finishes, keeping it off the initial load path.
getClip('start');

async function playStartup(): Promise<void> {
    const clip = getClip('startup');
    if (!clip) return;
    clip.volume = (window.xpVolume?.() ?? 1) * 0.35;
    clip.currentTime = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            await clip.play();
            return;
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError' && attempt === 0) continue;
            console.warn('Startup audio could not autoplay:', error);
            return;
        }
    }
}

// `shortcut: false` keeps an entry out of the desktop column (the CV is reached from the Start
// menu and the user tile instead); every other entry is a desktop icon.
interface Destination { title: string; href: string; icon: IconName; detail: string; shortcut?: boolean }
const CV_DESTINATION: Destination = { title: 'My CV', href: 'cv_template.html', icon: 'document', detail: 'Experience & skills', shortcut: false };
const destinations: Destination[] = [
    { title: 'My Portfolio', href: 'index.html', icon: 'computer', detail: 'Welcome to my portfolio' },
    { title: 'Programming', href: 'programming-portfolio.html', icon: 'folder', detail: 'Software & engineering' },
    { title: '3D Art', href: '3d-portfolio.html', icon: 'pictures', detail: 'Models & environments' },
    { title: 'Game Development', href: 'gamedev-portfolio.html', icon: 'game', detail: 'Games & interactive worlds' },
    CV_DESTINATION
];

// One desktop/Start-menu anchor, shared by the shortcut column and the Start menu; `withDetail`
// adds the Start-menu subtitle (<strong> title + <small> description).
function destinationLink(item: Destination, size: number, withDetail = false): string {
    return `<a href="${item.href}">${icon(item.icon, size)}<span>${withDetail ? `<strong>${item.title}</strong><small>${item.detail}</small>` : item.title}</span></a>`;
}
// Up walks out of a folder to the home page, so pressing it from any page lands on the desktop.
const HOME = destinations[0].href;

// Space around the window reserved for the shortcut column, favourites column and taskbar.
const DESKTOP = { top: 26, left: 124, right: 138, bottom: 30 };
const MIN_SIZE = { width: 340, height: 240 };
const EDGE = 8;

interface Rect { x: number; y: number; w: number; h: number }
type XpCursorMode = 'arrow' | 'pointer' | 'text' | 'move' | 'resize-h' | 'resize-v' | 'resize-se' | 'resize-sw';

// Hotspots are in 48px cursor pixels, so the overlay and the CSS native fallback share exact numbers.
const XP_CURSOR_HOTSPOTS: Record<XpCursorMode, { x: number; y: number }> = {
    arrow: { x: 5, y: 6 }, pointer: { x: 11, y: 5 }, text: { x: 9, y: 15 }, move: { x: 18, y: 18 },
    'resize-h': { x: 18, y: 18 }, 'resize-v': { x: 18, y: 21 }, 'resize-se': { x: 15, y: 15 }, 'resize-sw': { x: 15, y: 15 }
};

function xpCursorMode(target: EventTarget | null): XpCursorMode {
    if (!(target instanceof Element)) return 'arrow';
    if (target.closest('.xp-edge-w, .xp-edge-e')) return 'resize-h';
    if (target.closest('.xp-edge-s')) return 'resize-v';
    if (target.closest('.xp-edge-sw')) return 'resize-sw';
    if (target.closest('.xp-resize')) return 'resize-se';
    if (document.body.classList.contains('xp-dragging')) return 'move';
    if (target.closest('.xp-tb:disabled')) return 'arrow';
    if (target.closest('a, button, summary, label, select, [role="button"], [data-action], .project-card, .portfolio-choice, .xp-task, .xp-start, .xp-tb, .xp-volume, input[type="checkbox"], input[type="radio"], input[type="range"], input[type="button"], input[type="submit"]')) return 'pointer';
    if (target.closest('.selectable, .selectable *, [data-selectable], [data-selectable] *, textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]), [contenteditable="true"], [contenteditable="true"] *')) return 'text';
    return 'arrow';
}
// A native scrollbar is browser chrome: once it is being dragged it fires no pointer events, so the
// custom overlay would freeze mid-screen. Fall back to the real cursor over a scrollbar, where it
// tracks the drag natively, and let the overlay resume as soon as the pointer returns to content.
function isOverScrollbar(x: number, y: number): boolean {
    let node: Element | null = document.elementFromPoint(x, y);
    while (node) {
        const rect = node.getBoundingClientRect();
        if (node.scrollHeight - node.clientHeight > 1 && x >= rect.left + node.clientWidth && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
        if (node.scrollWidth - node.clientWidth > 1 && y >= rect.top + node.clientHeight && y <= rect.bottom && x >= rect.left && x <= rect.right) return true;
        node = node.parentElement;
    }
    return false;
}

function isInSiteNavigation(): boolean {
    try { return document.referrer !== '' && new URL(document.referrer).origin === location.origin; } catch { return false; }
}
function showBoot(force = false): void {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const reloaded = nav?.type === 'reload';
    if (!force) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        // The startup replays on an explicit reload (F5) or a first-time entry; moving between
        // the site's own pages, or using back/forward, must never replay it.
        if (!reloaded) {
            try { if (sessionStorage.getItem('xp-booted')) return; } catch { /* Storage can be unavailable in private browsing. */ }
            if (nav?.type === 'back_forward' || isInSiteNavigation()) return;
        }
    }
    const screen = document.createElement('div');
    screen.className = 'xp-boot'; screen.setAttribute('role', 'dialog'); screen.setAttribute('aria-modal', 'true'); screen.setAttribute('aria-label', 'Portfolio startup');
    const bootTrack = 'images/xp/progress-track.png';
    const bootBlock = 'images/xp/progress-block.png';
    screen.innerHTML = `<svg width="0" height="0" aria-hidden="true" style="position:absolute"><filter id="xp-boot-aa" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 30 -15"/></filter></svg><div class="xp-boot-brand"><div class="xp-boot-lockup"><img class="xp-boot-flag" src="${ICONS.flag}" width="140" height="100" alt=""><p class="xp-boot-user">Ubeid Hussein</p><h1>Portfolio<span>xp</span></h1></div><div class="xp-boot-progress" role="status" aria-label="Starting portfolio"><img class="xp-boot-track" src="${bootTrack}" alt=""><div class="xp-boot-clip"><div class="xp-boot-blocks"><img src="${bootBlock}" alt=""><img src="${bootBlock}" alt=""><img src="${bootBlock}" alt=""></div></div></div></div><p class="xp-boot-copyright">Copyright © 2026 Ubeid Hussein</p>`;
    document.body.append(screen);
    const shell = element('xp-shell'); shell.inert = true;
    const taskbar = element('xp-taskbar'); taskbar.inert = true;
    const shortcuts = element('xp-shortcuts'); shortcuts.inert = true;
    const previousFocus = document.activeElement;
    let timer = 0;
    let dismissed = false;
    const dismiss = () => {
        if (dismissed) return;
        dismissed = true;
        clearTimeout(timer); document.removeEventListener('keydown', onKey);
        screen.remove(); shell.inert = false; taskbar.inert = false; shortcuts.inert = false;
        try { sessionStorage.setItem('xp-booted', '1'); } catch { /* Startup must work without storage. */ }
        if (previousFocus instanceof HTMLElement && previousFocus !== document.body) previousFocus.focus();
        else element<HTMLButtonElement>('xp-start').focus({ preventScroll: true });
        void playStartup();
    };
    const onKey = (event: KeyboardEvent) => {
        // preventDefault stops Enter's default action from re-activating the element dismiss() restores focus to (e.g. #xp-reboot).
        if (event.key === 'Escape' || event.key === 'Enter') { event.preventDefault(); dismiss(); }
    };
    document.addEventListener('keydown', onKey);
    // Focus the overlay so Enter/Escape reach the dialog rather than the still-focused #xp-reboot button (which Enter would re-activate).
    screen.tabIndex = -1;
    screen.focus();
    timer = window.setTimeout(dismiss, 2600);
}
// A startup overlay frozen into the bfcache would reappear (and stick) on a back/forward
// restore, so drop it and re-enable the shell when the page comes back from the cache.
window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    const stale = document.querySelector('.xp-boot');
    if (!stale) return;
    stale.remove();
    for (const id of ['xp-shell', 'xp-taskbar', 'xp-shortcuts']) { const el = document.getElementById(id); if (el) el.inert = false; }
});

function initDesktop(): void {
    document.body.classList.add('xp-desktop');
    for (const [key, value] of Object.entries(DESKTOP)) document.body.style.setProperty(`--desk-${key}`, `${value}px`);
    const viewportW = () => document.documentElement.clientWidth;
    const viewportH = () => document.documentElement.clientHeight;
    const file = location.pathname.split('/').pop() || 'index.html';
    const current = destinations.find(item => item.href === file) ?? destinations[0];
    const shell = document.createElement('section'); shell.id = 'xp-shell'; shell.className = 'xp-window'; shell.tabIndex = -1; shell.setAttribute('aria-label', current.title);
    const titlebar = document.createElement('div'); titlebar.className = 'xp-titlebar';
    titlebar.innerHTML = `${icon(current.icon, 16)}<span class="xp-title">${current.title} - Ubeid Hussein</span><div class="xp-window-controls"><button id="xp-minimize" aria-label="Minimize window"><span class="xp-glyph-min"></span></button><button id="xp-maximize" aria-label="Maximize window" aria-pressed="false"><span class="xp-glyph-max"></span></button><button id="xp-close" aria-label="Close window" class="xp-close"><span class="xp-glyph-close"></span></button></div>`;
    const address = document.createElement('div'); address.className = 'xp-address'; address.innerHTML = `<span>Address</span><span class="xp-address-field">${icon(current.icon, 16)} ${current.title}</span>`;
    const toolbar = document.createElement('div'); toolbar.className = 'xp-toolbar';
    toolbar.innerHTML = `<button id="xp-up" class="xp-tb" type="button"><span class="xp-up-icon">${icon('folder', 16)}<svg class="xp-up-arrow" viewBox="0 0 10 10" width="9" height="9" aria-hidden="true"><path d="M5 0.5 L9.5 5 L6.8 5 L6.8 9.5 L3.2 9.5 L3.2 5 L0.5 5 Z" fill="#3aa04a" stroke="#1c5f27" stroke-width="0.7"/></svg></span>Up</button>`;
    const content = document.createElement('div'); content.className = 'xp-content';
    for (const node of [...document.body.childNodes]) {
        if (node instanceof HTMLScriptElement) continue;
        content.append(node);
    }
    const status = document.createElement('div'); status.className = 'xp-statusbar'; status.innerHTML = `<span>${current.detail}</span>`;
    const grip = document.createElement('div'); grip.className = 'xp-resize'; grip.setAttribute('aria-hidden', 'true');
    const edge = (dir: string): HTMLDivElement => { const el = document.createElement('div'); el.className = `xp-edge xp-edge-${dir}`; el.setAttribute('aria-hidden', 'true'); return el; };
    const edges = { w: edge('w'), e: edge('e'), s: edge('s'), sw: edge('sw') };
    shell.append(titlebar, toolbar, address, content, status, grip, edges.w, edges.e, edges.s, edges.sw);
    const shortcuts = document.createElement('nav'); shortcuts.id = 'xp-shortcuts'; shortcuts.className = 'xp-shortcuts'; shortcuts.setAttribute('aria-label', 'Desktop shortcuts');
    shortcuts.innerHTML = destinations.filter(item => item.shortcut !== false).map(item => destinationLink(item, 32)).join('');
    const taskbar = document.createElement('div'); taskbar.id = 'xp-taskbar'; taskbar.className = 'xp-taskbar';
    const trayVolume = '<button id="xp-volume" class="xp-volume" type="button" aria-label="Volume" aria-haspopup="true" aria-expanded="false" aria-controls="xp-volume-panel"><img id="xp-volume-icon" src="images/xp/volume.png" width="16" height="16" alt=""></button>';
    taskbar.innerHTML = `<button id="xp-start" class="xp-start" aria-expanded="false" aria-controls="xp-start-menu"><img class="xp-start-flag" src="images/xp/start-flag.png" width="23" height="19" alt="">start</button><button id="xp-task" class="xp-task" aria-expanded="true">${icon(current.icon, 16)}<span>${current.title}</span></button><div class="xp-tray">${trayVolume}<time id="xp-clock"></time></div>`;
    const menu = document.createElement('nav'); menu.id = 'xp-start-menu'; menu.className = 'xp-start-menu'; menu.hidden = true; menu.setAttribute('aria-label', 'Start navigation');
    menu.innerHTML = `<a class="xp-user" href="${CV_DESTINATION.href}"><img src="images/Profile.webp" alt=""><span>Ubeid Hussein</span></a><div class="xp-menu-body"><div class="xp-menu-apps">${destinations.map(item => destinationLink(item, 24, true)).join('')}</div><div class="xp-menu-side"></div></div><div class="xp-menu-footer"><span>Making cool shit since 1999</span><button class="xp-menu-power" id="xp-reboot"><img class="xp-menu-power-icon" src="images/xp/restart.png" width="24" height="24" alt="">Restart</button></div>`;
    document.body.append(shortcuts, shell, taskbar, menu);

    if (window.matchMedia('(pointer:fine)').matches) {
        const cursorElement = document.createElement('img');
        cursorElement.id = 'xp-cursor';
        cursorElement.alt = '';
        cursorElement.setAttribute('aria-hidden', 'true');
        cursorElement.draggable = false;
        document.body.append(cursorElement);
        const cursorSources: Record<XpCursorMode, string> = {
            arrow: 'images/xp-cursors/arrow.svg', pointer: 'images/xp-cursors/pointer.svg', text: 'images/xp-cursors/text.svg', move: 'images/xp-cursors/move.svg',
            'resize-h': 'images/xp-cursors/resize-h.svg', 'resize-v': 'images/xp-cursors/resize-v.svg', 'resize-se': 'images/xp-cursors/resize-se.svg', 'resize-sw': 'images/xp-cursors/resize-sw.svg'
        };
        const preloads = Object.values(cursorSources).map(src => { const image = new Image(); image.src = src; return image; });
        let lastPointerEvent: PointerEvent | null = null;
        let cursorAssetsReady = false;
        let activeMode: XpCursorMode = 'arrow';
        const hideCustomCursor = (): void => {
            cursorElement.classList.remove('xp-cursor-visible');
            document.documentElement.classList.remove('xp-custom-cursor');
            document.body.classList.remove('xp-custom-cursor');
        };
        cursorElement.src = cursorSources[activeMode];
        const updateCursor = (event: PointerEvent, target: EventTarget | null = event.target): void => {
            lastPointerEvent = event;
            if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') { hideCustomCursor(); return; }
            const mode = xpCursorMode(target);
            if (mode !== activeMode) { activeMode = mode; cursorElement.src = cursorSources[mode]; }
            const hotspot = XP_CURSOR_HOTSPOTS[mode];
            // transform (compositor-only) instead of left/top keeps the cursor tracking the pointer
            // without forcing a layout on every move, which is what made it feel laggy.
            cursorElement.style.transform = `translate3d(${event.clientX - hotspot.x}px, ${event.clientY - hotspot.y}px, 0)`;
            if (!cursorAssetsReady) return;
            document.documentElement.classList.add('xp-custom-cursor');
            document.body.classList.add('xp-custom-cursor');
            cursorElement.classList.add('xp-cursor-visible');
        };
        const refreshCursorAfterPointerChange = (event: PointerEvent): void => {
            window.requestAnimationFrame(() => updateCursor(event, document.elementFromPoint(event.clientX, event.clientY)));
        };
        void Promise.all(preloads.map(image => image.decode().catch(() => undefined))).then(() => {
            cursorAssetsReady = preloads.every(image => image.naturalWidth > 0);
            if (cursorAssetsReady && lastPointerEvent) updateCursor(lastPointerEvent);
        });
        document.addEventListener('pointermove', updateCursor, true);
        document.addEventListener('pointerover', updateCursor, true);
        document.addEventListener('pointerdown', event => { updateCursor(event); refreshCursorAfterPointerChange(event); }, true);
        document.addEventListener('pointerup', refreshCursorAfterPointerChange, true);
        document.addEventListener('pointercancel', refreshCursorAfterPointerChange, true);
        document.addEventListener('pointerout', event => {
            if ((event.pointerType === 'mouse' || event.pointerType === 'pen') && !event.relatedTarget) hideCustomCursor();
        }, true);
        window.addEventListener('blur', hideCustomCursor);
        window.addEventListener('focus', () => {
            if (lastPointerEvent) updateCursor(lastPointerEvent, document.elementFromPoint(lastPointerEvent.clientX, lastPointerEvent.clientY));
        });
        // A stationary pointer can still end up over different chrome when the layout moves under it
        // (resize, maximize), which fires no pointer event -- re-resolve from the last known position.
        const refreshFromLastPointer = (): void => {
            if (lastPointerEvent) updateCursor(lastPointerEvent, document.elementFromPoint(lastPointerEvent.clientX, lastPointerEvent.clientY));
        };
        // A native scrollbar drag fires no pointer events, so the overlay cannot follow it. The scroll
        // events it does fire are used instead: if a scroll happens while the pointer sits over a
        // scrollbar band, drop the overlay so the real cursor tracks the drag. Hovering never scrolls,
        // so simply passing over a scrollbar keeps our cursor rather than dropping to the OS one.
        const onScroll = (): void => {
            if (!lastPointerEvent) return;
            if (isOverScrollbar(lastPointerEvent.clientX, lastPointerEvent.clientY)) { hideCustomCursor(); return; }
            refreshFromLastPointer();
        };
        document.addEventListener('scroll', onScroll, { capture: true, passive: true });
        window.addEventListener('resize', refreshFromLastPointer);
    }

    // --- Window geometry: floating by default, clamped inside the desktop ---
    const applyRect = (rect: Rect) => {
        shell.style.left = `${rect.x}px`; shell.style.top = `${rect.y}px`;
        shell.style.width = `${rect.w}px`; shell.style.height = `${rect.h}px`;
    };
    const readRect = (): Rect => {
        const box = shell.getBoundingClientRect();
        return { x: box.left, y: box.top, w: box.width, h: box.height };
    };
    const defaultRect = (): Rect => {
        const availableW = Math.max(MIN_SIZE.width, viewportW() - DESKTOP.left - DESKTOP.right);
        const availableH = Math.max(MIN_SIZE.height, viewportH() - DESKTOP.top - DESKTOP.bottom);
        const w = Math.min(1000, Math.round(availableW));
        const h = Math.min(660, Math.round(availableH));
        return { x: DESKTOP.left + Math.round((availableW - w) / 2), y: DESKTOP.top + Math.round((availableH - h) / 2), w, h };
    };
    const moveTo = (x: number, y: number) => {
        shell.style.left = `${clamp(x, EDGE, viewportW() - shell.offsetWidth - EDGE)}px`;
        shell.style.top = `${clamp(y, EDGE, viewportH() - DESKTOP.bottom - shell.offsetHeight - EDGE)}px`;
    };
    const sizeTo = (w: number, h: number) => {
        shell.style.width = `${clamp(w, MIN_SIZE.width, viewportW() - shell.offsetLeft - EDGE)}px`;
        shell.style.height = `${clamp(h, MIN_SIZE.height, viewportH() - shell.offsetTop - DESKTOP.bottom - EDGE)}px`;
    };
    let floating: Rect = defaultRect();
    applyRect(floating);
    // Swapped for the real snapshot writer further down; the drag/resize handlers below call it,
    // but the snapshot needs the taskbar/close controls that do not exist yet at this point.
    let persistWindow = (): void => {};

    const maximizeButton = element<HTMLButtonElement>('xp-maximize');
    const setMaximized = (maximized: boolean, silent = false) => {
        if (!silent) playSound('restore');
        if (maximized) floating = readRect();
        shell.classList.toggle('xp-maximized', maximized);
        if (maximized) { shell.style.left = ''; shell.style.top = ''; shell.style.width = ''; shell.style.height = ''; }
        else applyRect(floating);
        maximizeButton.setAttribute('aria-pressed', String(maximized));
        setMaximizeGlyph(maximizeButton, maximized);
        persistWindow();
    };
    maximizeButton.addEventListener('click', () => setMaximized(!shell.classList.contains('xp-maximized')));
    titlebar.addEventListener('dblclick', event => { if (!(event.target instanceof Element && event.target.closest('.xp-window-controls'))) setMaximized(!shell.classList.contains('xp-maximized')); });

    // --- Window taskbar entry: minimize / restore ---
    const task = element<HTMLButtonElement>('xp-task');
    const minimize = (hidden: boolean, silent = false) => {
        if (!silent) playSound(hidden ? 'minimize' : 'restore');
        shell.hidden = hidden; task.setAttribute('aria-expanded', String(!hidden));
        if (hidden) task.focus(); else shell.focus({ preventScroll: true });
        persistWindow();
    };
    element('xp-minimize').addEventListener('click', () => minimize(true));
    task.addEventListener('click', () => minimize(!shell.hidden));

    // --- Drag by the title bar ---
    let drag: { pointerId: number; offsetX: number; offsetY: number } | null = null;
    titlebar.addEventListener('pointerdown', event => {
        if (event.button !== 0 || (event.target instanceof Element && event.target.closest('.xp-window-controls'))) return;
        if (shell.classList.contains('xp-maximized')) {
            const ratio = (event.clientX - DESKTOP.left) / Math.max(1, viewportW() - DESKTOP.left - DESKTOP.right);
            setMaximized(false);
            floating = { ...floating, x: Math.round(event.clientX - floating.w * ratio), y: Math.round(event.clientY - 16) };
            applyRect(floating);
        }
        drag = { pointerId: event.pointerId, offsetX: event.clientX - shell.offsetLeft, offsetY: event.clientY - shell.offsetTop };
        titlebar.setPointerCapture(event.pointerId);
        document.body.classList.add('xp-dragging');
    });
    titlebar.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        moveTo(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
    });
    const endDrag = (event: PointerEvent) => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        drag = null; floating = readRect();
        document.body.classList.remove('xp-dragging');
        persistWindow();
    };
    titlebar.addEventListener('pointerup', endDrag);
    titlebar.addEventListener('pointercancel', endDrag);

    // --- Resize from the window edges (left, right, bottom) and bottom corners ---
    type EdgeDir = 'w' | 'e' | 's' | 'sw' | 'se';
    let sizing: { pointerId: number; dir: EdgeDir; startX: number; startY: number; x: number; y: number; w: number; h: number } | null = null;
    const resizeTo = (dir: EdgeDir, dx: number, dy: number): void => {
        if (!sizing) return;
        const right = sizing.x + sizing.w, bottom = sizing.y + sizing.h;
        let x = sizing.x, y = sizing.y, w = sizing.w, h = sizing.h;
        if (dir.includes('w')) { x = Math.max(EDGE, Math.min(sizing.x + dx, right - MIN_SIZE.width)); w = right - x; }
        else if (dir.includes('e')) w = Math.max(MIN_SIZE.width, sizing.w + dx);
        if (dir.includes('s')) h = Math.max(MIN_SIZE.height, sizing.h + dy);
        w = Math.min(w, viewportW() - EDGE - x);
        h = Math.min(h, viewportH() - DESKTOP.bottom - EDGE - y);
        applyRect({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
    };
    const handles: [HTMLElement, EdgeDir][] = [[edges.w, 'w'], [edges.e, 'e'], [edges.s, 's'], [edges.sw, 'sw'], [grip, 'se']];
    for (const [handle, dir] of handles) {
        handle.addEventListener('pointerdown', event => {
            if (event.button !== 0 || shell.classList.contains('xp-maximized')) return;
            const rect = readRect();
            sizing = { pointerId: event.pointerId, dir, startX: event.clientX, startY: event.clientY, x: rect.x, y: rect.y, w: rect.w, h: rect.h };
            handle.setPointerCapture(event.pointerId);
            document.body.classList.add('xp-resizing');
        });
        handle.addEventListener('pointermove', event => {
            if (!sizing || event.pointerId !== sizing.pointerId) return;
            resizeTo(sizing.dir, event.clientX - sizing.startX, event.clientY - sizing.startY);
        });
        const endResize = (event: PointerEvent) => {
            if (!sizing || event.pointerId !== sizing.pointerId) return;
            sizing = null; floating = readRect();
            document.body.classList.remove('xp-resizing');
            persistWindow();
        };
        handle.addEventListener('pointerup', endResize);
        handle.addEventListener('pointercancel', endResize);
    }

    // Keep the window on-screen when the desktop resizes.
    window.addEventListener('resize', () => {
        if (shell.hidden || shell.classList.contains('xp-maximized')) return;
        const rect = readRect();
        sizeTo(rect.w, rect.h);
        moveTo(shell.offsetLeft, shell.offsetTop);
        floating = readRect();
        persistWindow();
    });

    // --- Tray volume: real XP icon driving an XP-style pop-up slider ---
    const volumeButton = element<HTMLButtonElement>('xp-volume');
    const volumePanel = document.createElement('div'); volumePanel.id = 'xp-volume-panel'; volumePanel.className = 'xp-volume-panel'; volumePanel.hidden = true;
    volumePanel.setAttribute('role', 'dialog'); volumePanel.setAttribute('aria-label', 'Volume');
    volumePanel.innerHTML = '<div class="xp-volume-title">Volume</div><input id="xp-volume-slider" class="xp-volume-slider" type="range" min="0" max="100" step="1" aria-label="Volume level"><label class="xp-volume-mute"><input id="xp-volume-mute" type="checkbox">Mute</label>';
    taskbar.append(volumePanel);
    const volumeSlider = element<HTMLInputElement>('xp-volume-slider');
    const volumeMute = element<HTMLInputElement>('xp-volume-mute');
    const readStored = (key: string, fallback: number): number => { try { const raw = localStorage.getItem(key); if (raw === null) return fallback; const value = Number(raw); return Number.isFinite(value) ? value : fallback; } catch { return fallback; } };
    let volume = Math.min(100, Math.max(0, readStored('xp-volume', 70)));
    let muted = readStored('xp-muted', 0) === 1;
    const volumeLevel = (): number => (muted ? 0 : volume / 100);
    const renderVolume = () => {
        volumeSlider.value = String(volume);
        volumeMute.checked = muted;
        element<HTMLImageElement>('xp-volume-icon').src = muted ? 'images/xp/volume-mute.png' : 'images/xp/volume.png';
    };
    const saveVolume = () => { try { localStorage.setItem('xp-volume', String(volume)); localStorage.setItem('xp-muted', muted ? '1' : '0'); } catch { /* Storage can be unavailable. */ } };
    const toggleVolume = (open: boolean) => {
        volumePanel.hidden = !open;
        volumeButton.setAttribute('aria-expanded', String(open));
        if (open) volumePanel.style.right = `${Math.max(6, window.innerWidth - volumeButton.getBoundingClientRect().right - 6)}px`;
    };
    volumeButton.addEventListener('click', () => toggleVolume(volumePanel.hidden));
    volumeSlider.addEventListener('input', () => { volume = Number(volumeSlider.value); saveVolume(); renderVolume(); });
    volumeMute.addEventListener('change', () => { muted = volumeMute.checked; saveVolume(); renderVolume(); });
    document.addEventListener('click', event => { if (event.target instanceof Node && !volumePanel.contains(event.target) && !volumeButton.contains(event.target)) toggleVolume(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !volumePanel.hidden) toggleVolume(false); });
    window.xpVolume = volumeLevel;
    renderVolume();

    // --- Start menu, clock, replay ---
    const start = element<HTMLButtonElement>('xp-start');
    const toggleMenu = (open: boolean) => { menu.hidden = !open; start.setAttribute('aria-expanded', String(open)); };
    start.addEventListener('click', () => { const opening = menu.hidden; if (opening) playSound('start'); toggleMenu(opening); });
    document.addEventListener('click', event => { if (event.target instanceof Node && !menu.contains(event.target) && !start.contains(event.target)) toggleMenu(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { toggleMenu(false); start.focus(); } });
    element('xp-reboot').addEventListener('click', () => showBoot(true));

    // --- Close the window (X); reopen it from its own desktop icon or Start-menu entry ---
    const setWindowOpen = (open: boolean) => {
        shell.hidden = !open; task.hidden = !open;
        if (open) { task.setAttribute('aria-expanded', 'true'); shell.focus({ preventScroll: true }); }
        persistWindow();
    };
    element('xp-close').addEventListener('click', () => setWindowOpen(false));
    const samePage = (href: string | null): boolean => {
        if (!href) return false;
        try {
            const url = new URL(href, location.href);
            return url.origin === location.origin && (url.pathname.split('/').pop() || 'index.html') === file;
        } catch { return false; }
    };
    // Interactive controls play the XP click, but every real page change is held back until the
    // click sound ends, so navigating from a folder never cuts the sound off. The taskbar and
    // window controls keep their own dedicated XP sounds.
    document.addEventListener('click', event => {
        if (!(event.target instanceof Element)) return;
        const control = event.target.closest('a[href], button, [role="button"], summary, input, select, textarea, .project-card, .portfolio-choice');
        if (!control || control.closest('#xp-start, #xp-task, #xp-minimize, #xp-maximize')) return;
        const plain = !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
        const link = control.closest('a[href]');
        const href = link?.getAttribute('href') ?? null;
        if (link && plain && href) {
            if (link.closest('.xp-shortcuts, .xp-favourites, #xp-start-menu') && samePage(href)) {
                event.preventDefault(); playSound('start'); toggleMenu(false); setWindowOpen(true);
                return;
            }
            let url: URL | null = null;
            try { url = new URL(href, location.href); } catch { url = null; }
            if (url && (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === location.origin && url.pathname !== location.pathname) {
                event.preventDefault(); toggleMenu(false); navigateAfterClick(url.href);
                return;
            }
        }
        playSound('start');
    });
    // --- Up: step out of the current folder, i.e. back to the desktop home page ---
    const upButton = element<HTMLButtonElement>('xp-up');
    upButton.disabled = file === HOME;
    upButton.addEventListener('click', event => {
        // Own the click so the shared handler does not play a second sound over the navigation one.
        event.stopPropagation();
        navigateAfterClick(HOME);
    });

    // --- Persist geometry across the site's own page loads. The minimized/closed state is
    // deliberately left out: a window closed on one page must not arrive closed on the next. ---
    persistWindow = () => {
        try {
            const state = {
                rect: floating,
                maximized: shell.classList.contains('xp-maximized')
            };
            sessionStorage.setItem('xp-window', JSON.stringify(state));
        } catch { /* Storage can be unavailable. */ }
    };
    const restoreWindow = (): void => {
        let raw: string | null = null;
        try { raw = sessionStorage.getItem('xp-window'); } catch { return; }
        if (!raw) return;
        let state: { rect?: Rect; maximized?: boolean };
        try { state = JSON.parse(raw); } catch { return; }
        const rect = state?.rect;
        if (!rect || ![rect.x, rect.y, rect.w, rect.h].every(value => typeof value === 'number' && Number.isFinite(value))) return;
        // Re-clamp with the same bounds the drag/resize use, so a saved rect can never restore
        // off-screen after the browser window or monitor changes.
        const w = clamp(rect.w, MIN_SIZE.width, viewportW() - EDGE * 2);
        const h = clamp(rect.h, MIN_SIZE.height, viewportH() - DESKTOP.bottom - EDGE * 2);
        const x = clamp(rect.x, EDGE, viewportW() - w - EDGE);
        const y = clamp(rect.y, EDGE, viewportH() - DESKTOP.bottom - h - EDGE);
        floating = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
        applyRect(floating);
        if (state.maximized) setMaximized(true, true);
    };
    restoreWindow();
    window.addEventListener('pagehide', () => persistWindow());

    const updateClock = () => { const now = new Date(); const clock = element<HTMLTimeElement>('xp-clock'); clock.dateTime = now.toISOString(); clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
    updateClock(); window.setInterval(updateClock, 30000);
    new MutationObserver(() => { shell.setAttribute('aria-label', document.title); }).observe(document.querySelector('title')!, { childList: true });
    void loadSocialRibbon();
    showBoot();
}
document.addEventListener('DOMContentLoaded', initDesktop);
