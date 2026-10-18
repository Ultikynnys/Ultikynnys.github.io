export function element<T extends HTMLElement = HTMLElement>(id: string): T {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Required element #${id} was not found`);
    return node as T;
}

export function setActiveToggle(groupSelector: string, activeSelector: string): void {
    document.querySelectorAll(`${groupSelector} span`).forEach(node => node.classList.toggle('active', node.matches(activeSelector)));
}

export function bindActions(actions: Record<string, (value: string) => void>): void {
    document.querySelectorAll<HTMLElement>('[data-action]').forEach(node => {
        node.setAttribute('role', 'button');
        node.tabIndex = 0;
        const activate = () => actions[node.dataset.action ?? '']?.(node.dataset.value ?? '');
        node.addEventListener('click', activate);
        node.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                activate();
            }
        });
    });
}

export function setMaximizeGlyph(button: HTMLElement, maximized: boolean): void {
    button.setAttribute('aria-label', maximized ? 'Restore window' : 'Maximize window');
    const glyph = button.querySelector('span');
    if (glyph) glyph.className = maximized ? 'xp-glyph-restore' : 'xp-glyph-max';
}
