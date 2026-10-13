export async function loadFooter(): Promise<void> {
    const container = document.getElementById('footer-container');
    if (!container) return;
    try {
        const response = await fetch('footer.html');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        container.innerHTML = await response.text();
        const footer = container.querySelector('footer');
        const text = footer?.querySelector('.footer-text');

        const CATS_FOR_MS = 20000;  // keep spawning cats for 20s
        const FADE_AT_MS = 20000;   // the 25s clip starts fading at 20s
        const FADE_MS = 5000;       // ...down to silence at 25s
        const CAT_LIFE_MS = 3500;
        const SPAWN_EVERY_MS = 600;
        const VOLUME_SCALE = 0.2;   // nyan sits well below the tray level, and follows it live
        const TRIPLE_MS = 500;      // three clicks within this window arm the secret
        const nyanVolume = (): number => (window.xpVolume?.() ?? 1) * VOLUME_SCALE;

        let active = false;
        let clicks = 0;
        let clickTimer = 0;
        let audio: HTMLAudioElement | null = null;
        let timers: number[] = [];
        const cats = new Set<HTMLImageElement>();

        const spawnCat = (): void => {
            const image = document.createElement('img');
            image.src = 'images/nyan.gif'; image.alt = ''; image.className = 'nyan-cat';
            image.style.top = `${Math.random() * (window.innerHeight - 100)}px`;
            document.body.append(image);
            cats.add(image);
            timers.push(window.setTimeout(() => { image.remove(); cats.delete(image); }, CAT_LIFE_MS));
        };

        const stop = (): void => {
            active = false;
            clicks = 0;
            window.clearTimeout(clickTimer);
            for (const id of timers) { window.clearTimeout(id); window.clearInterval(id); }
            timers = [];
            audio?.pause();
            for (const image of cats) image.remove();
            cats.clear();
            text?.classList.remove('rainbow-text');
        };

        const start = (): void => {
            active = true;
            text?.classList.add('rainbow-text');
            if (!audio) { audio = new Audio('audio/nyan.ogg'); audio.preload = 'auto'; }
            audio.currentTime = 0;
            audio.volume = nyanVolume();
            void audio.play().catch(() => { /* Autoplay can be withheld, or the clip is unavailable. */ });
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                spawnCat();
                const spawner = window.setInterval(spawnCat, SPAWN_EVERY_MS);
                timers.push(spawner, window.setTimeout(() => window.clearInterval(spawner), CATS_FOR_MS));
            }
            // Follow the tray volume live, and fade the last five seconds of the clip to silence.
            timers.push(window.setInterval(() => {
                if (!audio) return;
                const t = audio.currentTime * 1000;
                const fade = t <= FADE_AT_MS ? 1 : Math.max(0, 1 - (t - FADE_AT_MS) / FADE_MS);
                audio.volume = Math.max(0, Math.min(1, nyanVolume() * fade));
            }, 100));
            timers.push(window.setTimeout(stop, FADE_AT_MS + FADE_MS + 120));
        };

        // Three clicks within a short window arm the secret; a single click switches it off.
        const activate = (): void => {
            if (active) { stop(); return; }
            window.clearTimeout(clickTimer);
            clickTimer = window.setTimeout(() => { clicks = 0; }, TRIPLE_MS);
            if (++clicks === 3) { clicks = 0; start(); }
        };
        footer?.addEventListener('click', activate);
        footer?.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
        });
    } catch (error) { console.warn('Footer unavailable', error); }
}
