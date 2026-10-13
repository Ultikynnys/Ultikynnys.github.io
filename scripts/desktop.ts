import { element } from './dom';
import { icon, ICONS, type IconName } from './icons';
import { loadSocialRibbon } from './social-ribbon';

declare global { interface Window { xpVolume?: () => number } }

// Genuine Windows XP SP2 sounds, expanded from the ISO's I386\*.WA_ files.
const XP_SOUNDS = { start: 'audio/xp-start.wav', minimize: 'audio/xp-minimize.wav', restore: 'audio/xp-restore.wav', startup: 'audio/xp-startup.wav' } as const;
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
// Warm the click and startup clips so the first click and the startup chime are buffered
// before any page unload or the boot screen finishing.
getClip('start');
getClip('startup');

// The startup chime fires once, exactly when the boot screen finishes and the desktop appears.
// The clip is preloaded so a cold fetch can't delay it, and there is no retry: the chime belongs
// to startup, never a sound that lands on some later click.
function playStartup(): void {
    const clip = getClip('startup');
    if (!clip) return;
    try {
        clip.volume = (window.xpVolume?.() ?? 1) * 0.25;
        clip.currentTime = 0;
        void clip.play().catch(() => { /* Autoplay can be withheld before the first gesture; skip silently. */ });
    } catch { /* Audio can be unavailable. */ }
}

interface Destination { title: string; href: string; icon: IconName; detail: string }
const destinations: Destination[] = [
    { title: 'My Portfolio', href: 'index.html', icon: 'computer', detail: 'Welcome to my portfolio' },
    { title: 'Programming', href: 'programming-portfolio.html', icon: 'folder', detail: 'Software & engineering' },
    { title: '3D Art', href: '3d-portfolio.html', icon: 'pictures', detail: 'Models & environments' },
    { title: 'Game Development', href: 'gamedev-portfolio.html', icon: 'game', detail: 'Games & interactive worlds' },
    { title: 'My CV', href: 'cv_template.html', icon: 'document', detail: 'Experience & skills' }
];

// Space around the window reserved for the shortcut column, favourites column and taskbar.
const DESKTOP = { top: 26, left: 124, right: 138, bottom: 30 };
const MIN_SIZE = { width: 340, height: 240 };
const EDGE = 8;

interface Rect { x: number; y: number; w: number; h: number }

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
    screen.innerHTML = `<div class="xp-boot-brand"><img class="xp-boot-flag" src="${ICONS.flag}" width="140" height="100" alt=""><p>Ubeid Hussein</p><h1>Portfolio<span>xp</span></h1><p class="xp-boot-edition">Creative Professional Edition</p><div class="xp-boot-progress" role="status" aria-label="Starting portfolio"><img class="xp-boot-track" src="${bootTrack}" alt=""><div class="xp-boot-clip"><div class="xp-boot-blocks"><img src="${bootBlock}" alt=""><img src="${bootBlock}" alt=""><img src="${bootBlock}" alt=""></div></div></div><p class="xp-boot-status">Starting your desktop...</p></div>`;
    document.body.append(screen);
    const shell = element('xp-shell'); shell.inert = true;
    const taskbar = element('xp-taskbar'); taskbar.inert = true;
    const shortcuts = element('xp-shortcuts'); shortcuts.inert = true;
    const previousFocus = document.activeElement;
    let timer = 0;
    const dismiss = () => {
        clearTimeout(timer); document.removeEventListener('keydown', onKey);
        screen.remove(); shell.inert = false; taskbar.inert = false; shortcuts.inert = false;
        try { sessionStorage.setItem('xp-booted', '1'); } catch { /* Startup must work without storage. */ }
        if (previousFocus instanceof HTMLElement && previousFocus !== document.body) previousFocus.focus();
        else element<HTMLButtonElement>('xp-start').focus({ preventScroll: true });
        playStartup();
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
    toolbar.innerHTML = `<button id="xp-back" class="xp-tb" type="button"><span class="xp-tb-arrow">◄</span>Back</button><button id="xp-forward" class="xp-tb" type="button"><span class="xp-tb-arrow">►</span>Forward</button>`;
    const content = document.createElement('div'); content.className = 'xp-content';
    for (const node of [...document.body.childNodes]) {
        if (node instanceof HTMLScriptElement) continue;
        if (node instanceof HTMLElement && node.id === 'themeToggle') { node.remove(); continue; }
        content.append(node);
    }
    const status = document.createElement('div'); status.className = 'xp-statusbar'; status.innerHTML = `<span>${current.detail}</span>`;
    const grip = document.createElement('div'); grip.className = 'xp-resize'; grip.setAttribute('aria-hidden', 'true');
    shell.append(titlebar, toolbar, address, content, status, grip);
    const shortcuts = document.createElement('nav'); shortcuts.id = 'xp-shortcuts'; shortcuts.className = 'xp-shortcuts'; shortcuts.setAttribute('aria-label', 'Desktop shortcuts');
    shortcuts.innerHTML = destinations.slice(0, 4).map(item => `<a href="${item.href}">${icon(item.icon, 32)}<span>${item.title}</span></a>`).join('');
    const taskbar = document.createElement('div'); taskbar.id = 'xp-taskbar'; taskbar.className = 'xp-taskbar';
    const trayVolume = '<button id="xp-volume" class="xp-volume" type="button" aria-label="Volume" aria-haspopup="true" aria-expanded="false" aria-controls="xp-volume-panel"><img id="xp-volume-icon" src="images/xp/volume.png" width="16" height="16" alt=""></button>';
    taskbar.innerHTML = `<button id="xp-start" class="xp-start" aria-expanded="false" aria-controls="xp-start-menu"><img class="xp-start-flag" src="images/xp/start-flag.png" width="23" height="19" alt="">start</button><button id="xp-task" class="xp-task" aria-expanded="true">${icon(current.icon, 16)}<span>${current.title}</span></button><div class="xp-tray">${trayVolume}<time id="xp-clock"></time></div>`;
    const menu = document.createElement('nav'); menu.id = 'xp-start-menu'; menu.className = 'xp-start-menu'; menu.hidden = true; menu.setAttribute('aria-label', 'Start navigation');
    menu.innerHTML = `<div class="xp-user"><img src="images/Profile.png" alt=""><span>Ubeid Hussein</span></div><div class="xp-menu-body"><div class="xp-menu-apps">${destinations.map(item => `<a href="${item.href}">${icon(item.icon, 24)}<span><strong>${item.title}</strong><small>${item.detail}</small></span></a>`).join('')}</div><div class="xp-menu-side"><a class="xp-menu-side-link" href="mailto:hussein.ubeid@outlook.com">Contact me</a></div></div><div class="xp-menu-footer"><span>Making cool shit since 1999</span><button class="xp-menu-power" id="xp-reboot"><img class="xp-menu-power-icon" src="images/xp/restart.png" width="24" height="24" alt="">Restart</button></div>`;
    document.body.append(shortcuts, shell, taskbar, menu);

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
        const maxX = Math.max(EDGE, viewportW() - shell.offsetWidth - EDGE);
        const maxY = Math.max(EDGE, viewportH() - DESKTOP.bottom - shell.offsetHeight - EDGE);
        shell.style.left = `${Math.min(Math.max(EDGE, x), maxX)}px`;
        shell.style.top = `${Math.min(Math.max(EDGE, y), maxY)}px`;
    };
    const sizeTo = (w: number, h: number) => {
        shell.style.width = `${Math.min(Math.max(MIN_SIZE.width, w), viewportW() - shell.offsetLeft - EDGE)}px`;
        shell.style.height = `${Math.min(Math.max(MIN_SIZE.height, h), viewportH() - shell.offsetTop - DESKTOP.bottom - EDGE)}px`;
    };
    let floating: Rect = defaultRect();
    applyRect(floating);

    const maximizeButton = element<HTMLButtonElement>('xp-maximize');
    const setMaximized = (maximized: boolean) => {
        playSound('restore');
        if (maximized) floating = readRect();
        shell.classList.toggle('xp-maximized', maximized);
        if (maximized) { shell.style.left = ''; shell.style.top = ''; shell.style.width = ''; shell.style.height = ''; }
        else applyRect(floating);
        maximizeButton.setAttribute('aria-pressed', String(maximized));
        maximizeButton.setAttribute('aria-label', maximized ? 'Restore window' : 'Maximize window');
        maximizeButton.innerHTML = maximized ? '<span class="xp-glyph-restore"></span>' : '<span class="xp-glyph-max"></span>';
    };
    maximizeButton.addEventListener('click', () => setMaximized(!shell.classList.contains('xp-maximized')));
    titlebar.addEventListener('dblclick', event => { if (!(event.target instanceof Element && event.target.closest('.xp-window-controls'))) setMaximized(!shell.classList.contains('xp-maximized')); });

    // --- Window taskbar entry: minimize / restore ---
    const task = element<HTMLButtonElement>('xp-task');
    const minimize = (hidden: boolean) => {
        playSound(hidden ? 'minimize' : 'restore');
        shell.hidden = hidden; task.setAttribute('aria-expanded', String(!hidden));
        if (hidden) task.focus(); else shell.focus({ preventScroll: true });
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
    };
    titlebar.addEventListener('pointerup', endDrag);
    titlebar.addEventListener('pointercancel', endDrag);

    // --- Resize by the bottom-right grip ---
    let sizing: { pointerId: number; startX: number; startY: number; w: number; h: number } | null = null;
    grip.addEventListener('pointerdown', event => {
        if (event.button !== 0 || shell.classList.contains('xp-maximized')) return;
        const rect = readRect();
        sizing = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, w: rect.w, h: rect.h };
        grip.setPointerCapture(event.pointerId);
        document.body.classList.add('xp-resizing');
    });
    grip.addEventListener('pointermove', event => {
        if (!sizing || event.pointerId !== sizing.pointerId) return;
        sizeTo(sizing.w + event.clientX - sizing.startX, sizing.h + event.clientY - sizing.startY);
    });
    const endResize = (event: PointerEvent) => {
        if (!sizing || event.pointerId !== sizing.pointerId) return;
        sizing = null; floating = readRect();
        document.body.classList.remove('xp-resizing');
    };
    grip.addEventListener('pointerup', endResize);
    grip.addEventListener('pointercancel', endResize);

    // Keep the window on-screen when the desktop resizes.
    window.addEventListener('resize', () => {
        if (shell.hidden || shell.classList.contains('xp-maximized')) return;
        const rect = readRect();
        sizeTo(rect.w, rect.h);
        moveTo(shell.offsetLeft, shell.offsetTop);
        floating = readRect();
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
    // --- Back / forward: XP-style history across the shell pages ---
    const backButton = element<HTMLButtonElement>('xp-back');
    const forwardButton = element<HTMLButtonElement>('xp-forward');
    const readNav = (key: string): string | null => { try { return sessionStorage.getItem(key); } catch { return null; } };
    const writeNav = (key: string, value: string): void => { try { sessionStorage.setItem(key, value); } catch { /* Storage can be unavailable. */ } };
    const arrivedVia = readNav('xp-nav-mark') ?? '';
    const tracked = readNav('xp-nav-depth') !== null;
    let backDepth = Number(readNav('xp-nav-depth') ?? '0') || 0;
    let aheadDepth = Number(readNav('xp-nav-ahead') ?? '0') || 0;
    if (arrivedVia === 'back') { backDepth = Math.max(0, backDepth - 1); aheadDepth += 1; }
    else if (arrivedVia === 'forward') { backDepth += 1; aheadDepth = Math.max(0, aheadDepth - 1); }
    else { backDepth = tracked ? backDepth + 1 : 0; aheadDepth = 0; }
    writeNav('xp-nav-mark', '');
    writeNav('xp-nav-depth', String(backDepth));
    writeNav('xp-nav-ahead', String(aheadDepth));
    backButton.disabled = backDepth <= 0;
    forwardButton.disabled = aheadDepth <= 0;
    backButton.addEventListener('click', () => { writeNav('xp-nav-mark', 'back'); history.back(); });
    forwardButton.addEventListener('click', () => { writeNav('xp-nav-mark', 'forward'); history.forward(); });

    const updateClock = () => { const now = new Date(); const clock = element<HTMLTimeElement>('xp-clock'); clock.dateTime = now.toISOString(); clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
    updateClock(); window.setInterval(updateClock, 30000);
    new MutationObserver(() => { shell.setAttribute('aria-label', document.title); }).observe(document.querySelector('title')!, { childList: true });
    void loadSocialRibbon();
    showBoot();
}
document.addEventListener('DOMContentLoaded', initDesktop);
