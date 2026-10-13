import { loadPageHeaders } from './load-headers';
import { loadFooter } from './load-footer';
import { initCarousels, initNameAnimation, initPortfolio, initSecretMode, loadLanguageColors, setupProjectExpansion, type CardOptions } from './portfolio-common';

document.addEventListener('DOMContentLoaded', () => {
    loadPageHeaders();
    void loadFooter();
    void loadLanguageColors();
    initNameAnimation();
    initCarousels();
    initSecretMode();
    setupProjectExpansion();
    const pages: { className: string; file: string; options: CardOptions }[] = [
        { className: 'portfolio-programming', file: 'projects/programming-projects.md', options: { badgeOrder: ['private', 'demo', 'github'], multiBadge: true, showLanguageNotches: true } },
        { className: 'portfolio-3d', file: 'projects/3d-projects.md', options: { badgeOrder: ['private', 'demo', 'artstation'], showSoftwareNotches: true } },
        { className: 'portfolio-gamedev', file: 'projects/games.md', options: { badgeOrder: ['private', 'demo', 'github', 'artstation'], alwaysShowEngineTag: true } }
    ];
    const page = pages.find(page => document.body.classList.contains(page.className));
    if (page) void initPortfolio(page.file, page.options);
});
