// Social Ribbon Component
// Loads contact links from config/contacts.toml

// Simple TOML parser for our specific config format
function parseContactsToml(tomlString) {
    const config = {
        profile: {},
        social: {},
        ribbon: { order: [] }
    };

    let currentSection = null;
    let currentSubsection = null;

    const lines = tomlString.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Main section like [profile] or [ribbon]
        const mainSectionMatch = trimmed.match(/^\[(\w+)\]$/);
        if (mainSectionMatch) {
            currentSection = mainSectionMatch[1];
            currentSubsection = null;
            continue;
        }

        // Subsection like [social.kofi]
        const subSectionMatch = trimmed.match(/^\[(\w+)\.(\w+)\]$/);
        if (subSectionMatch) {
            currentSection = subSectionMatch[1];
            currentSubsection = subSectionMatch[2];
            if (currentSection === 'social') {
                config.social[currentSubsection] = {};
            }
            continue;
        }

        // Key-value pairs
        const kvMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
        if (kvMatch) {
            const key = kvMatch[1];
            let value = kvMatch[2].trim();

            // Parse value type
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            } else if (value.startsWith('[') && value.endsWith(']')) {
                // Array
                value = value.slice(1, -1).split(',').map(v => v.trim().replace(/"/g, ''));
            } else if (value === 'true') {
                value = true;
            } else if (value === 'false') {
                value = false;
            }

            if (currentSection === 'social' && currentSubsection) {
                config.social[currentSubsection][key] = value;
            } else if (currentSection === 'profile') {
                config.profile[key] = value;
            } else if (currentSection === 'ribbon') {
                config.ribbon[key] = value;
            }
        }
    }

    return config;
}

async function loadContactsConfig() {
    try {
        const response = await fetch('config/contacts.toml');
        if (!response.ok) {
            throw new Error(`Failed to load contacts.toml: ${response.status}`);
        }
        const tomlText = await response.text();
        return parseContactsToml(tomlText);
    } catch (error) {
        console.error('Error loading contacts config:', error);
        return null;
    }
}

function createSocialRibbon(config) {
    // Create the ribbon container
    const ribbonContainer = document.createElement('div');
    ribbonContainer.className = 'social-ribbon';

    // Create the container for the main social buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'social-buttons';

    // Build buttons from config
    const order = config.ribbon.order;
    let buttonsHtml = '';

    for (const key of order) {
        const social = config.social[key];
        if (!social) continue;

        const isExternal = social.external !== false; // Default to external
        const targetAttr = isExternal ? 'target="_blank"' : '';

        // Support both Font Awesome icons and custom SVG icons
        let iconHtml = '';
        if (social.iconSvg) {
            iconHtml = `<img src="${social.iconSvg}" alt="" class="social-icon-svg">`;
        } else if (social.icon) {
            iconHtml = `<i class="${social.icon}"></i>`;
        }

        buttonsHtml += `
        <a href="${social.url}" ${targetAttr} class="${social.class}">
            ${iconHtml} ${social.label}
        </a>
        `;
    }

    buttonsContainer.innerHTML = buttonsHtml;

    // Append the buttons container to the ribbon
    ribbonContainer.appendChild(buttonsContainer);

    // Find the existing theme toggle button
    const themeToggle = document.getElementById('themeToggle');

    if (themeToggle) {
        // Remove theme toggle from its original position and append it to the ribbon container
        themeToggle.parentNode.removeChild(themeToggle);
        ribbonContainer.appendChild(themeToggle);
    } else {
        console.warn('Theme toggle button not found. Cannot move it into ribbon.');
    }

    // Insert the completed ribbon at the beginning of the body
    document.body.insertAdjacentElement('afterbegin', ribbonContainer);
}

// Execute when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    const config = await loadContactsConfig();
    if (config) {
        createSocialRibbon(config);
        // Make config available globally for other scripts
        window.contactsConfig = config;
    } else {
        console.error('Could not load contacts configuration');
    }
}); 