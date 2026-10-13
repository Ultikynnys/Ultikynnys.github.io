export const ICONS = {
    computer: 'images/xp-icons/computer.png',
    folder: 'images/xp-icons/folder.png',
    pictures: 'images/xp-icons/pictures.png',
    game: 'images/xp-icons/game.png',
    document: 'images/xp-icons/document.png',
    mail: 'images/xp-icons/mail.png',
    messenger: 'images/xp-icons/messenger.png',
    contacts: 'images/xp-icons/contacts.png',
    web: 'images/xp-icons/web.png',
    flag: 'images/xp/flag.png'
} as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, size = 16): string {
    return `<img class="xp-icon" src="${ICONS[name]}" width="${size}" height="${size}" alt="">`;
}
