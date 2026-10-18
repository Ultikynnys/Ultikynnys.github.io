import { chromium } from '@playwright/test';

const base = 'http://localhost:3000';
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${ok || !detail ? '' : ` (${detail})`}`);
    if (!ok) failures++;
}

async function main(): Promise<void> {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(`${page.url()}: ${error.message}`));

    // Boot screen: shows on first entry, keyboard dismiss, replays on reload (F5)
    await page.goto(base);
    const boot = page.locator('.xp-boot');
    await boot.waitFor();
    check('boot screen shows on first visit', await boot.isVisible());
    const bootAssets = await page.evaluate(() => {
        const images = [...document.querySelectorAll('.xp-boot img')] as HTMLImageElement[];
        return { total: images.length, broken: images.filter(image => image.naturalWidth === 0).length };
    });
    check('boot textures load (flag, track, blocks)', bootAssets.total === 5 && bootAssets.broken === 0, `${bootAssets.broken}/${bootAssets.total} broken`);
    await page.keyboard.press('Enter');
    check('boot dismissed with Enter', await boot.isHidden());
    await page.reload();
    check('boot replays on reload (F5)', await boot.isVisible());
    await page.keyboard.press('Enter');
    check('boot dismissed with Enter after reload', await boot.isHidden());

    // Desktop shell basics
    check('titlebar shows page title', (await page.locator('.xp-titlebar .xp-title').textContent())!.includes('My Portfolio'));
    check('taskbar clock rendered', /\d{1,2}:\d{2}/.test(await page.locator('#xp-clock').textContent() ?? ''));
    const layout = await page.evaluate(() => {
        const taskbar = document.getElementById('xp-taskbar') as HTMLElement;
        const content = document.querySelector('.xp-content') as HTMLElement;
        return { bottom: taskbar.getBoundingClientRect().bottom, vh: innerHeight, overflowY: getComputedStyle(content).overflowY };
    });
    check('taskbar sits fully inside the viewport', layout.bottom <= layout.vh + 1);
    check('window content scrolls internally', layout.overflowY === 'auto');
    await page.locator('#xp-start').click();
    check('Start menu opens', await page.locator('#xp-start-menu').isVisible());
    check('removed menu options stay gone', (await page.locator('#xp-theme, #xp-print').count()) === 0);
    await page.keyboard.press('Escape');
    check('Start menu closes on Escape', await page.locator('#xp-start-menu').isHidden());
    await page.locator('#xp-minimize').click();
    check('window minimizes to taskbar', await page.locator('#xp-shell').isHidden());
    await page.locator('#xp-task').click();
    check('window restores from taskbar', await page.locator('#xp-shell').isVisible());
    await page.locator('#xp-close').click();
    check('close hides the window and its taskbar button', await page.locator('#xp-shell').isHidden() && await page.locator('#xp-task').isHidden());
    await page.locator('.xp-shortcuts a[href="index.html"]').click();
    check('current-page desktop icon reopens the window', await page.locator('#xp-shell').isVisible());
    const before = await page.locator('#xp-shell').boundingBox();
    await page.locator('#xp-maximize').click();
    check('maximize fills the desktop', await page.evaluate(() => document.querySelector('.xp-window')?.classList.contains('xp-maximized') ?? false));
    await page.locator('#xp-maximize').click();
    check('restore returns the floating window', await page.evaluate(() => !(document.querySelector('.xp-window')?.classList.contains('xp-maximized') ?? true)));
    const bar = await page.locator('.xp-titlebar').boundingBox();
    if (!before || !bar) throw new Error('window not measurable');
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
    await page.mouse.down();
    await page.mouse.move(bar.x + bar.width / 2 - 160, bar.y + bar.height / 2 + 40, { steps: 10 });
    await page.mouse.up();
    const after = await page.locator('#xp-shell').boundingBox();
    check('window can be dragged by its title bar', !!after && Math.abs(after.x - before.x) > 40);
    check('dragged window stays on screen', !!after && after.x >= 0 && after.y >= 0 && after.x + after.width <= 1281 && after.y + after.height <= 800);
    const grip = await page.locator('.xp-resize').boundingBox();
    const beforeResize = await page.locator('#xp-shell').boundingBox();
    if (!grip || !beforeResize) throw new Error('resize grip not measurable');
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x + grip.width / 2 - 160, grip.y + grip.height / 2 - 120, { steps: 10 });
    await page.mouse.up();
    const afterResize = await page.locator('#xp-shell').boundingBox();
    check('window can be resized by the grip', !!afterResize && afterResize.width < beforeResize.width - 60 && afterResize.height < beforeResize.height - 60);

    // Programming page: headers, cards, ribbon, placeholder, notches
    await page.locator('#xp-start').click();
    await page.locator('#xp-start-menu a[href="programming-portfolio.html"]').click();
    await page.locator('.project-card').first().waitFor();
    check('Start menu navigates and projects load', (await page.locator('.project-card').count()) > 0);
    await page.waitForFunction(() => document.title.includes('Programming'), undefined, { timeout: 5000 })
        .then(() => check('page headers applied to title', true))
        .catch(() => check('page headers applied to title', false));
    check('desktop favourites render', (await page.locator('.xp-favourites a').count()) > 0);
    const icons = await page.evaluate(() => {
        const images = [...document.querySelectorAll('img.xp-icon')] as HTMLImageElement[];
        return { total: images.length, broken: images.filter(image => image.naturalWidth === 0).length };
    });
    check('all XP icon bitmaps load', icons.total > 0 && icons.broken === 0, `${icons.broken}/${icons.total} broken`);
    check('language notches render', (await page.locator('.language-notch').count()) > 0);
    check('missing media renders placeholder, not broken img', (await page.locator('.media-placeholder').count()) >= 1 && (await page.locator('.project-media img[src=""]').count()) === 0);

    // 3D page: carousel + expansion
    await page.goto(`${base}/3d-portfolio.html`);
    await page.locator('.carousel-container').first().waitFor();
    const carousel = page.locator('.carousel-container').first();
    await carousel.locator('.carousel-next').click();
    check('carousel next advances image', await carousel.locator('.carousel-image').nth(1).evaluate(el => el.classList.contains('active')));
    await carousel.locator('.carousel-dot').first().click();
    check('carousel dot returns to first image', await carousel.locator('.carousel-image').first().evaluate(el => el.classList.contains('active')));
    await page.locator('.project-card h3').first().click();
    check('project expands with overlay', (await page.locator('#overlay.active').count()) === 1);
    await page.locator('#overlay').click({ position: { x: 5, y: 5 } });
    check('overlay click collapses project', (await page.locator('.project-card.expanded').count()) === 0);

    // Gamedev page: engine tags
    await page.goto(`${base}/gamedev-portfolio.html`);
    await page.locator('.project-card').first().waitFor();
    check('engine tags render for games', (await page.locator('.game-tag').count()) > 0);

    // CV: data render, toggles, print chrome
    await page.goto(`${base}/cv_template.html`);
    await page.locator('.page').first().waitFor();
    await page.locator('[data-action="language"][data-value="english"]').click();
    check('CV language toggle applies', await page.evaluate(() => document.body.classList.contains('english')));
    await page.locator('[data-action="cv"][data-value="3d"]').click();
    check('CV type toggle applies', await page.evaluate(() => document.body.classList.contains('cv-3d-mode')));
    check('CV toggle active state moves', await page.evaluate(() => document.querySelector('.toggle-3d')?.classList.contains('active') ?? false));
    await page.emulateMedia({ media: 'print' });
    check('XP chrome hidden in print', !(await page.locator('.xp-taskbar').isVisible()) && !(await page.locator('.xp-shortcuts').isVisible()));
    await page.emulateMedia({ media: 'screen' });

    // Footer effect + boot replay
    await page.goto(base);
    await page.locator('#footer-container footer').waitFor();
    await page.locator('#footer-container footer').click();
    check('footer click applies rainbow effect', await page.evaluate(() => document.querySelector('.footer-text')?.classList.contains('rainbow-text') ?? false));
    await page.locator('#xp-start').click();
    await page.locator('#xp-reboot').click();
    check('Replay startup shows boot again', await page.locator('.xp-boot').isVisible());
    await page.keyboard.press('Enter');
    check('Boot dismisses with Enter (no skip button)', await page.locator('.xp-boot').isHidden());

    // Screenshots for the record
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'tests/mobile-preview.png' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${base}/programming-portfolio.html`);
    await page.locator('.project-card').first().waitFor();
    await page.screenshot({ path: 'tests/desktop-preview.png', fullPage: true });

    check('no runtime errors on any page', errors.length === 0, errors.join(' | '));
    await browser.close();
    if (failures > 0) throw new Error(`${failures} browser checks failed`);
    console.log('All Playwright checks passed');
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
