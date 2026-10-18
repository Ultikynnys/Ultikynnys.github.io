import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseMarkdown, createUnifiedProjectCard, parseSimpleToml } from '../scripts/portfolio-common';
import { parsePageHeaders } from '../scripts/load-headers';
import { parseContactsToml } from '../scripts/social-ribbon';

test('all page entries use compiled scripts without inline executable code', () => {
    for (const file of readdirSync('.').filter(file => file.endsWith('.html'))) {
        const html = readFileSync(file, 'utf8');
        assert.doesNotMatch(html, /\bon\w+\s*=/i, file);
        assert.doesNotMatch(html, /<script\s*>/i, file);
        if (file === 'footer.html') continue;
        assert.match(html, /styles\/xp\.css/, file);
        assert.match(html, /dist\/scripts\/desktop\.js/, file);
        for (const match of html.matchAll(/<script[^>]+src="(dist\/[^" ]+)"/g)) assert.ok(readFileSync(match[1]).length > 0);
    }
    assert.ok(!readdirSync('scripts').some(file => /\.(?:js|mjs|cjs)$/.test(file)));
});
test('project markdown preserves all fields and media types', () => {
    const data = parseMarkdown('# Portfolio\nIntroduction\n## Example\n- Title: Sample\n- Description: Works\n- Media: [images/a.png, images/b.png]\n- Private: true\n- Priority: 2\n- Languages: TypeScript, C++\n- Store: https://example.com');
    assert.equal(data.intro, 'Introduction');
    assert.deepEqual(data.projects[0].media, ['images/a.png', 'images/b.png']);
    assert.equal(data.projects[0].priority, 2);
    assert.equal(data.projects[0].private, true);
    assert.deepEqual(data.projects[0].languages, ['TypeScript', 'C++']);
    const html = createUnifiedProjectCard(data.projects[0], 0, { showLanguageNotches: true });
    assert.match(html, /data-carousel-step/);
    assert.match(html, /class="tag tag-link tag-store"[^>]*>Store</);
    assert.match(html, /class="tag tag-label language-notch/);
    assert.doesNotMatch(html, /onclick=/);
});
test('link tags are labelled by the destination site', () => {
    const html = createUnifiedProjectCard({ title: 'Game', description: '', media: '', demo: 'https://studio.itch.io/game', store: 'https://store.steampowered.com/app/1/' }, 0, { badgeOrder: ['private', 'demo'], multiBadge: true });
    assert.match(html, /class="tag tag-link tag-itch"/);
    assert.match(html, /<i class="fa-brands fa-itch-io" aria-hidden="true"><\/i>itch\.io<\/a>/);
    assert.match(html, /class="tag tag-link tag-steam"/);
    assert.match(html, /<i class="fa-brands fa-steam" aria-hidden="true"><\/i>Steam<\/a>/);
});
test('github.com and github.io get distinct link tags', () => {
    const html = createUnifiedProjectCard({ title: 'Tool', description: '', media: '', github: 'https://github.com/me/tool', demo: 'https://me.github.io/tool/' }, 0, { badgeOrder: ['private', 'demo', 'github'], multiBadge: true });
    assert.match(html, /class="tag tag-link tag-github"/);
    assert.match(html, /class="tag tag-link tag-githubpages"/);
    assert.match(html, /<i class="fa-brands fa-github" aria-hidden="true"><\/i>GitHub<\/a>/);
    assert.match(html, /<i class="fa-brands fa-github" aria-hidden="true"><\/i>GitHub Pages<\/a>/);
});
test('engine tags carry the engine logo and a per-engine colour class', () => {
    const html = createUnifiedProjectCard({ title: 'Game', description: '', media: '', engine: 'Unreal Engine' }, 0, { alwaysShowEngineTag: true });
    assert.match(html, /class="tag tag-label game-tag xp-engine-unreal"/);
    assert.match(html, /<svg class="engine-icon" viewBox="0 0 256 256"/);
    assert.match(html, />Unreal Engine<\/div>/);
    // An engine the registry does not know still renders its name, just without a logo.
    const unknown = createUnifiedProjectCard({ title: 'Game', description: '', media: '', engine: 'CryEngine' }, 0, { alwaysShowEngineTag: true });
    assert.doesNotMatch(unknown, /engine-icon/);
    assert.match(unknown, />CryEngine<\/div>/);
});
test('every link site and the private tag carry an icon', () => {
    // Fab / SuperHive show the site's own favicon (no icon-set logo exists for them).
    const fab = createUnifiedProjectCard({ title: 'Game', description: '', media: '', store: 'https://www.fab.com/listings/1' }, 0);
    assert.match(fab, /class="tag tag-link tag-fab"[^>]*><img class="tag-icon" src="\/images\/brands\/fab\.svg"/);
    const superhive = createUnifiedProjectCard({ title: 'Game', description: '', media: '', store: 'https://superhivemarket.com/products/x' }, 0);
    assert.match(superhive, /class="tag tag-link tag-superhive"[^>]*><span class="tag-icon tag-icon-mask" style="--tag-mask:url\('\/images\/brands\/superhive-mask\.svg'\)"/);
    // Gumroad ships a real logo Font Awesome lacks, inlined as an SVG by tag-icons.ts.
    const gumroad = createUnifiedProjectCard({ title: 'Game', description: '', media: '', store: 'https://shop.gumroad.com/l/x' }, 0);
    assert.match(gumroad, /class="tag tag-link tag-gumroad"[^>]*><svg class="tag-icon"/);
    // GameBanana shows the site's own favicon (its banana mark).
    const gamebanana = createUnifiedProjectCard({ title: 'Game', description: '', media: '', demo: 'https://gamebanana.com/mods/1' }, 0, { badgeOrder: ['demo'] });
    assert.match(gamebanana, /class="tag tag-link tag-gamebanana"[^>]*><img class="tag-icon" src="\/images\/brands\/gamebanana\.png"/);
    const priv = createUnifiedProjectCard({ title: 'Game', description: '', media: '', private: true }, 0);
    assert.match(priv, /<i class="fa-solid fa-lock" aria-hidden="true"><\/i>Private/);
});
test('language notches carry a language logo', () => {
    const html = createUnifiedProjectCard({ title: 'Game', description: '', media: '', languages: ['TypeScript', 'C++', 'C#'] }, 0, { showLanguageNotches: true });
    assert.match(html, /class="tag tag-label language-notch language-typescript"[^>]*><svg class="tag-icon"/);
    assert.match(html, /class="tag tag-label language-notch language-cpp"[^>]*><svg class="tag-icon"/);
    assert.match(html, /class="tag tag-label language-notch language-csharp"[^>]*><svg class="tag-icon"/);
    // Every language the projects use has a logo (Python is the easiest to forget).
    const py = createUnifiedProjectCard({ title: 'Game', description: '', media: '', languages: ['Python'] }, 0, { showLanguageNotches: true });
    assert.match(py, /class="tag tag-label language-notch language-python"[^>]*><svg class="tag-icon"/);
});
test('3D cards carry modelling-software notches', () => {
    const html = createUnifiedProjectCard({ title: 'Game', description: '', media: '', software: ['Blender'] }, 0, { showSoftwareNotches: true });
    assert.match(html, /class="tag tag-label software-notch software-blender"[^>]*><svg class="tag-icon"/);
    const both = createUnifiedProjectCard({ title: 'Game', description: '', media: '', software: ['Blender', 'Substance Painter'] }, 0, { showSoftwareNotches: true });
    assert.match(both, /class="tag tag-label software-notch software-substancepainter"[^>]*><svg class="tag-icon"/);
});
test('real project files and configuration parse', () => {
    for (const file of ['programming-projects.md', '3d-projects.md', 'games.md']) {
        const data = parseMarkdown(readFileSync(`projects/${file}`, 'utf8'));
        assert.ok(data.projects.length > 0, file);
        assert.ok(data.projects.every(project => project.title), file);
    }
    const contacts = parseContactsToml(readFileSync('config/contacts.toml', 'utf8'));
    assert.ok(contacts.ribbon.order.length > 0);
    assert.ok(contacts.ribbon.order.every(key => contacts.social[key]));
    assert.ok(parsePageHeaders(readFileSync('content/page-headers.md', 'utf8')).index);
    assert.ok(parseSimpleToml(readFileSync('content/language_colors.toml', 'utf8')).typescript);
});
test('projects without media render a labelled placeholder instead of a broken image', () => {
    const html = createUnifiedProjectCard({ title: 'Reasonix', description: 'No media field', media: '' }, 2);
    assert.match(html, /media-placeholder/);
    assert.doesNotMatch(html, /src=""/);
});
test('rendered project text is escaped and unsafe URLs are excluded', () => {
    const html = createUnifiedProjectCard({ title: '<script>alert(1)</script>', description: '<b>Text</b>', media: 'javascript:alert(1)', github: 'javascript:alert(1)' }, 1);
    assert.doesNotMatch(html, /<script>|javascript:/);
    assert.match(html, /&lt;b&gt;/);
});
