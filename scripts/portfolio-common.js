// Common portfolio functionality
// Shared between programming-portfolio.html and 3d-portfolio.html

// Name typing animation
const names = ["Ubeid Hussein", "Ultikynnys", "R60D"];
const nameDescriptions = ["Full name", "Also known as", "Also known as"];
let currentNameIndex = 0;
let isAnimating = false;
const typingSpeed = 100; // ms per character
const deleteSpeed = 50; // ms per character (deleting is faster)
const pauseBetweenNames = 8000; // pause for 8s between name changes (total ~10s with typing)

// Yasuo Mode Easter Egg variables
let secretClickCount = 0;
let secretClickTimer = null;
let isYasuoMode = false;
const yasuoAudioFiles = [
    'audio/Yasuo_Original_BasicAttack_0.ogg',
    'audio/Yasuo_Original_BasicAttack_1.ogg',
    'audio/Yasuo_Original_BasicAttack_2.ogg',
    'audio/Yasuo_Original_BasicAttack_3.ogg'
];
const yasuoAudio = yasuoAudioFiles.map(src => {
    const audio = new Audio(src);
    audio.preload = 'auto'; // Preload audio files
    return audio;
});

// Metal slicing sound effects
const metalSliceAudioFiles = [
    'audio/metal1.ogg',
    'audio/metal2.ogg',
    'audio/metal3.ogg',
    'audio/metal4.ogg',
    'audio/metal5.ogg'
];
const metalSliceAudio = metalSliceAudioFiles.map(src => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    return audio;
});

// Replace fools.ogg with alternating finished sounds
const finishedAudio = [
    new Audio('audio/YasuoFinishedA.ogg'),
    new Audio('audio/YasuoFinishedB.ogg')
];
finishedAudio.forEach(audio => {
    audio.preload = 'auto';
});
let currentFinishedAudioIndex = 0;
let isPlayingFinishedAudio = false;
let slashDirection = 'left-to-right'; // Track slash direction to alternate

// Function to play the next finished audio and toggle index
function playNextFinishedAudio() {
    if (isPlayingFinishedAudio) {
        console.log("Already playing a finished audio, ignoring request");
        return;
    }
    
    isPlayingFinishedAudio = true;
    console.log(`Playing finished audio index: ${currentFinishedAudioIndex}`);
    
    const audioToPlay = finishedAudio[currentFinishedAudioIndex];
    
    audioToPlay.onended = function() {
        console.log(`Finished audio ${currentFinishedAudioIndex} ended`);
        currentFinishedAudioIndex = (currentFinishedAudioIndex + 1) % finishedAudio.length;
        console.log(`Next finished audio will be index ${currentFinishedAudioIndex}`);
        isPlayingFinishedAudio = false;
    };
    
    audioToPlay.onerror = function() {
        console.error(`Error playing finished audio ${currentFinishedAudioIndex}`);
        isPlayingFinishedAudio = false;
    };
    
    audioToPlay.currentTime = 0;
    audioToPlay.play().catch(e => {
        console.error("Finished audio play failed:", e);
        isPlayingFinishedAudio = false;
    });
}

let visibleCardsCount = 0;
let activeContainerSelector = null;
let activeCardSelector = null;
let expectedCardsCount = 0; // New variable to track the expected number of cards from MD files
let markdownProcessed = false; // Flag to track if markdown has been processed
let yasuoSliceCounter = 0; // New counter for sword slices

// Initialize name animation
function initNameAnimation() {
    const nameContainer = document.getElementById('name-display').querySelector('h1');
    const nameIndicator = document.querySelector('.name-indicator');
    
    async function typeText(text) {
        let displayText = '';
        for (let i = 0; i < text.length; i++) {
            displayText = text.substring(0, i + 1);
            nameContainer.innerHTML = displayText + '<span class="cursor"></span>';
            await new Promise(resolve => setTimeout(resolve, typingSpeed));
        }
    }

    async function deleteText() {
        let currentText = nameContainer.textContent.trim();
        for (let i = currentText.length; i > 0; i--) {
            let displayText = currentText.substring(0, i - 1);
            nameContainer.innerHTML = displayText + '<span class="cursor"></span>';
            await new Promise(resolve => setTimeout(resolve, deleteSpeed));
        }
    }

    async function cycleName() {
        if (isAnimating) return;
        isAnimating = true;
        
        // Fade out name indicator
        nameIndicator.style.opacity = 0;
        
        // Delete current name
        await deleteText();
        
        // Get next name and update index
        currentNameIndex = (currentNameIndex + 1) % names.length;
        
        // Type new name
        await typeText(names[currentNameIndex]);
        
        // Update and fade in name indicator
        setTimeout(() => {
            nameIndicator.textContent = nameDescriptions[currentNameIndex];
            nameIndicator.style.opacity = 0.9;
        }, 200);
        
        // Pause before next cycle
        await new Promise(resolve => setTimeout(resolve, pauseBetweenNames));
        
        isAnimating = false;
    }

    // Start the name cycling
    setTimeout(() => {
        // Initial cycle after 2 seconds
        cycleName();
        
        // Continue cycling as animation completes
        setInterval(() => {
            if (!isAnimating) cycleName();
        }, 500);
    }, 2000);
}

// Function to parse markdown content
function parseMarkdown(markdown) {
    const result = { projects: [], intro: '' };
    const sections = markdown.split('## ');
    
    // Extract intro section
    if (sections[0] && sections[0].startsWith('# ')) {
        const introLines = sections[0].split('\n');
        // Skip the first line (title) and extract intro text
        if (introLines.length > 1) {
            result.intro = introLines.slice(1).join('\n').trim();
        }
    }
    
    for (let i = 1; i < sections.length; i++) {
        const section = sections[i];
        const lines = section.split('\n');
        const project = {};
        
        for (const line of lines) {
            if (line.startsWith('- Title:')) {
                project.title = line.replace('- Title:', '').trim();
            } else if (line.startsWith('- Description:')) {
                project.description = line.replace('- Description:', '').trim();
            } else if (line.startsWith('- Media:')) {
                const mediaContent = line.replace('- Media:', '').trim();
                if (mediaContent.startsWith('[') && mediaContent.endsWith(']')) {
                    project.media = mediaContent.slice(1, -1)
                        .split(',')
                        .map(img => img.trim());
                } else {
                    project.media = mediaContent;
                }
            } else if (line.startsWith('- GitHub:')) {
                project.github = line.replace('- GitHub:', '').trim();
            } else if (line.startsWith('- ArtStation:')) {
                project.artstation = line.replace('- ArtStation:', '').trim();
            } else if (line.startsWith('- Private:')) {
                project.private = line.replace('- Private:', '').trim().toLowerCase() === 'true';
            } else if (line.startsWith('- Store:')) {
                project.store = line.replace('- Store:', '').trim();
            } else if (line.startsWith('- Comparison:')) {
                project.comparison = line.replace('- Comparison:', '').trim().toLowerCase() === 'true';
            } else if (line.startsWith('- Demo:')) {
                project.demo = line.replace('- Demo:', '').trim();
            } else if (line.startsWith('- Steam:')) {
                project.steam = line.replace('- Steam:', '').trim().toLowerCase() === 'true';
            } else if (line.startsWith('- Workshop:')) {
                project.workshop = line.replace('- Workshop:', '').trim().toLowerCase() === 'true';
            } else if (line.startsWith('- Engine:')) {
                project.engine = line.replace('- Engine:', '').trim();
            } else if (line.startsWith('- Languages:')) {
                const langsRaw = line.replace('- Languages:', '').trim();
                if (langsRaw) {
                    project.languages = langsRaw.split(',').map(l => l.trim()).filter(Boolean);
                }
            }
        }
        
        if (Object.keys(project).length > 0) {
            result.projects.push(project);
        }
    }
    
    if (Object.keys(result).length > 0) {
        // Update the global expected cards count
        if (isYasuoMode && !markdownProcessed) {
            expectedCardsCount += result.projects.length;
            console.log(`parseMarkdown: Added ${result.projects.length} cards to expectedCardsCount. New total: ${expectedCardsCount}`);
            markdownProcessed = true; // Mark as processed to avoid double-counting
        }
    }
    
    return result;
}

// --- Language Colors Loader (from TOML) ---
let LANGUAGE_COLORS = null;

// Very small TOML parser for our simple format:
// [lang]\n bg = "#hex"\n fg = "#hex"
function parseSimpleToml(tomlText) {
    const stripInlineComments = (s) => {
        let inQuote = false;
        let result = '';
        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (ch === '"' && s[i - 1] !== '\\') inQuote = !inQuote;
            if (ch === '#' && !inQuote) break;
            result += ch;
        }
        return result.trim();
    };

    const map = {};
    let current = null;
    const lines = tomlText.split(/\r?\n/);
    for (let raw of lines) {
        let line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        line = stripInlineComments(line);
        if (!line) continue;

        if (line.startsWith('[') && line.endsWith(']')) {
            current = line.slice(1, -1).trim();
            if (current) map[current] = {};
            continue;
        }
        const eq = line.indexOf('=');
        if (eq !== -1 && current) {
            const key = line.slice(0, eq).trim();
            let val = line.slice(eq + 1).trim();
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            map[current][key] = val;
        }
    }
    return map;
}

async function loadLanguageColors() {
    try {
        const res = await fetch('content/language_colors.toml');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        LANGUAGE_COLORS = parseSimpleToml(text);
        injectLanguageColors(LANGUAGE_COLORS);
    } catch (e) {
        console.error('Failed to load TOML language colors:', e);
    }
}

function injectLanguageColors(colors) {
    if (!colors) return;
    const styleId = 'language-colors-style';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
    }
    let css = '';
    for (const [code, cfg] of Object.entries(colors)) {
        const bg = (cfg && cfg.bg) || '#444';
        const fg = (cfg && cfg.fg) || '#fff';
        css += `.project-media .language-${code} { background: ${bg}; color: ${fg}; }\n`;
    }
    styleEl.textContent = css;
}

// Function to create carousel HTML
function createCarousel(images, projectId) {
    return `
        <div class="carousel-container" id="carousel-${projectId}">
            ${images.map((img, index) => `
                <img src="${img}" alt="Project view ${index + 1}" 
                     class="carousel-image ${index === 0 ? 'active' : ''}">
            `).join('')}
            <button class="carousel-nav carousel-prev" onclick="prevImage(event, ${projectId})">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="carousel-nav carousel-next" onclick="nextImage(event, ${projectId})">
                <i class="fas fa-chevron-right"></i>
            </button>
            <div class="carousel-dots">
                ${images.map((_, index) => `
                    <div class="carousel-dot ${index === 0 ? 'active' : ''}" 
                         onclick="goToImage(event, ${projectId}, ${index})"></div>
                `).join('')}
            </div>
        </div>
    `;
}

// Carousel control functions
window.prevImage = function(event, projectId) {
    event.stopPropagation(); // Prevent click from bubbling to project card
    const container = document.getElementById(`carousel-${projectId}`);
    const images = container.querySelectorAll('.carousel-image');
    const dots = container.querySelectorAll('.carousel-dot');
    const activeIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
    const prevIndex = (activeIndex - 1 + images.length) % images.length;
    
    images[activeIndex].classList.remove('active');
    images[prevIndex].classList.add('active');
    
    dots[activeIndex].classList.remove('active');
    dots[prevIndex].classList.add('active');
};

window.nextImage = function(event, projectId) {
    event.stopPropagation(); // Prevent click from bubbling to project card
    const container = document.getElementById(`carousel-${projectId}`);
    const images = container.querySelectorAll('.carousel-image');
    const dots = container.querySelectorAll('.carousel-dot');
    const activeIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
    const nextIndex = (activeIndex + 1) % images.length;
    
    images[activeIndex].classList.remove('active');
    images[nextIndex].classList.add('active');
    
    dots[activeIndex].classList.remove('active');
    dots[nextIndex].classList.add('active');
};

// Add function for dot navigation
window.goToImage = function(event, projectId, index) {
    event.stopPropagation(); // Prevent click from bubbling to project card
    const container = document.getElementById(`carousel-${projectId}`);
    const images = container.querySelectorAll('.carousel-image');
    const dots = container.querySelectorAll('.carousel-dot');
    
    // Update active image
    images.forEach(img => img.classList.remove('active'));
    images[index].classList.add('active');
    
    // Update active dot
    dots.forEach(dot => dot.classList.remove('active'));
    dots[index].classList.add('active');
};

// Function to play random Yasuo sound
function playRandomYasuoSound() {
    const randomIndex = Math.floor(Math.random() * yasuoAudio.length);
    // Clone the audio node to allow overlapping plays if clicks are fast
    const audioToPlay = yasuoAudio[randomIndex].cloneNode();
    audioToPlay.play().catch(e => console.error("Audio play failed:", e));
}

// Function to play random metal slice sound
function playRandomMetalSliceSound() {
    const randomIndex = Math.floor(Math.random() * metalSliceAudio.length);
    // Clone the audio node to allow overlapping plays if clicks are fast
    const audioToPlay = metalSliceAudio[randomIndex].cloneNode();
    audioToPlay.play().catch(e => console.error("Metal slice audio play failed:", e));
}

// Function for Yasuo attack animation
function yasuoAttack(cardElement) {
    if (!cardElement || cardElement.style.visibility === 'hidden') {
        console.log("YasuoAttack: Card already hidden or invalid.", cardElement);
        return;
    }

    // Check visibility *before* hiding it
    const wasVisible = window.getComputedStyle(cardElement).visibility !== 'hidden';
    console.log("YasuoAttack: Attacking card. Was visible?", wasVisible, cardElement);

    // Increment the slice counter each time an attack is performed
    yasuoSliceCounter++;
    console.log(`YasuoAttack: Slice ${yasuoSliceCounter} of 7, direction: ${slashDirection}`);

    // Play Yasuo attack sound (voice line)
    playRandomYasuoSound();

    // --- Sword Animation ---
    const sword = document.createElement('img');
    sword.src = 'images/YasouSword.png';
    sword.classList.add('yasuo-sword');
    
    // Add the current direction class
    sword.classList.add(`slash-${slashDirection}`);
    
    document.body.appendChild(sword);

    const cardRect = cardElement.getBoundingClientRect();
    
    // Position the sword based on slash direction - always centered on the card
    const swordStartX = cardRect.left + cardRect.width / 2 - 150;
    const swordStartY = cardRect.top + cardRect.height / 2 - 150;
    sword.style.left = `${swordStartX}px`;
    sword.style.top = `${swordStartY}px`;
    
    // Use the animation class instead of setting animation directly
    // The animation is now set in the CSS via the slash-direction class
    
    sword.addEventListener('animationend', () => {
        sword.remove();
    });

    // --- Card Splitting Animation --- 
    cardElement.style.visibility = 'hidden'; // Hide original card immediately
    cardElement.style.pointerEvents = 'none';

    // Decrement count only if the card was actually visible before this attack
    if (wasVisible) {
        visibleCardsCount--;
        console.log(`YasuoAttack: Decremented count. Cards remaining: ${visibleCardsCount}`);
    }

    // Create two halves slightly after sword starts animation
    setTimeout(() => {
        // Play metal slicing sound right when the card splits
        playRandomMetalSliceSound();
        
        const cardRectDoc = cardElement.getBoundingClientRect(); 
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        // --- Create flash line effect ---
        const flashLine = document.createElement('div');
        flashLine.classList.add('flash-slice');
        // Set fixed length for flash line (1000px) instead of calculating based on card dimensions
        const sliceLength = 1000; // Fixed length of 1000px
        const sliceAngle = Math.atan2(cardRectDoc.height, cardRectDoc.width) * (180 / Math.PI);
        
        // Position starting before the top-right corner of the card for extended effect
        // Calculate offset to move line starting point further away from diagonal
        const offsetX = -cardRectDoc.width * 0.5; // Increase offset to 50% of card width
        const offsetY = -cardRectDoc.height * 0.5; // Increase offset to 50% of card height
        
        flashLine.style.width = `${sliceLength}px`;
        flashLine.style.left = `${cardRectDoc.left + scrollX + offsetX}px`;
        flashLine.style.top = `${cardRectDoc.top + scrollY + offsetY}px`;
        flashLine.style.transform = `rotate(${sliceAngle}deg)`;
        
        document.body.appendChild(flashLine);
        
        // Remove flash after animation
        flashLine.addEventListener('animationend', () => {
            flashLine.remove();
        });

        const topHalf = document.createElement('div');
        const bottomHalf = document.createElement('div');

        [topHalf, bottomHalf].forEach((half, index) => {
            const clone = cardElement.cloneNode(true);
            // Reset potential problematic styles on the clone
            clone.style.visibility = 'visible'; 
            clone.style.margin = '0'; 
            clone.classList.remove('expanded'); 
            clone.style.position = 'absolute'; // Ensure content is positioned within half
            clone.style.top = '0';
            clone.style.left = '0';
            clone.style.width = '100%';
            clone.style.height = '100%';

            half.classList.add('card-half');
            half.style.width = `${cardRectDoc.width}px`;
            half.style.height = `${cardRectDoc.height}px`;
            half.style.top = `${cardRectDoc.top + scrollY}px`; 
            half.style.left = `${cardRectDoc.left + scrollX}px`;
            
            half.appendChild(clone); 
            document.body.appendChild(half);

            if (index === 0) { // Top half
                half.classList.add('card-half-top');
            } else { // Bottom half
                 // Adjust inner clone position for bottom half clip-path (simplified)
                 clone.style.top = `-${cardRectDoc.height / 2}px`; 
                 half.classList.add('card-half-bottom');
            }

            half.addEventListener('animationend', () => {
                half.remove();
            });
        });

    }, 150); 

     // Check if we've reached 7 slices - exit Yasuo mode
     if (yasuoSliceCounter >= 7) {
        console.log("YasuoAttack: 7 slices reached. Triggering deactivation.");
        setTimeout(() => {
            deactivateYasuoMode();
        }, 700);
    } else if (wasVisible) {
        console.log(`YasuoAttack: Card destroyed, ${visibleCardsCount} cards still visible.`);
    }
}

// Function to cleanly deactivate Yasuo mode
function deactivateYasuoMode() {
    if (!isYasuoMode) return;
    console.log("Deactivating Yasuo Mode. Resetting state.");
    
    if (!isPlayingFinishedAudio) {
        playNextFinishedAudio();
    }
    
    isYasuoMode = false;
    yasuoSliceCounter = 0; // Reset slice counter
    const indicator = document.getElementById('yasuo-mode-indicator');
    document.body.style.border = "none";
    document.body.classList.remove('yasuo-mode-active');
    if (indicator) indicator.classList.remove('active');
    secretClickCount = 0;
    clearTimeout(secretClickTimer);
}

// Function to activate Yasuo mode
function activateYasuoMode() {
    if (isYasuoMode) return;
    console.log("Activating Yasuo Mode...");
    isYasuoMode = true;
    yasuoSliceCounter = 0; // Reset slice counter
    const indicator = document.getElementById('yasuo-mode-indicator');
    document.body.style.border = "3px dashed red";
    document.body.classList.add('yasuo-mode-active');
    if (indicator) indicator.classList.add('active');

    // Reset expectedCardsCount
    expectedCardsCount = 0;
    markdownProcessed = false;

    // For special case of index page with a fixed number of cards
    if (activeContainerSelector === '.portfolio-choice-container') {
        // On index page, cards are static
        const container = document.querySelector(activeContainerSelector);
        if (container) {
            const cards = container.querySelectorAll(activeCardSelector);
            visibleCardsCount = cards.length;
            console.log(`activateYasuoMode: Index page - set count to ${visibleCardsCount} static cards`);
        }
    } else {
        // For portfolio pages, we'll trigger a reload/recount of the projects from Markdown

        // Get the current project files being used
        let projectsFile = null;
        let gamesFile = null;

        if (activeContainerSelector === '#programming-projects-container') {
            projectsFile = 'projects/programming_projects.md';
        } else if (activeContainerSelector === '#3d-projects-container') {
            projectsFile = 'projects/3d_projects.md';
            gamesFile = 'projects/games_projects.md';
        }

        // Temporarily save the current cards count from DOM in case initPortfolio takes time
        visibleCardsCount = document.querySelectorAll(`${activeContainerSelector} ${activeCardSelector}`).length;
        console.log(`activateYasuoMode: Initializing with DOM-counted ${visibleCardsCount} cards while loading Markdown`);

        // This will update expectedCardsCount via parseMarkdown when loading completes
        if (projectsFile) {
            fetch(projectsFile)
                .then(response => response.text())
                .then(text => {
                    parseMarkdown(text);
                    visibleCardsCount = expectedCardsCount;
                    console.log(`activateYasuoMode: Updated from Markdown to ${visibleCardsCount} cards`);
                })
                .catch(err => console.error("Error loading markdown for card counting:", err));
        }

        if (gamesFile) {
            markdownProcessed = false; // Reset to allow counting games separately
            fetch(gamesFile)
                .then(response => response.text())
                .then(text => {
                    parseMarkdown(text);
                    visibleCardsCount = expectedCardsCount;
                    console.log(`activateYasuoMode: Updated from Markdown to ${visibleCardsCount} cards (including games)`);
                })
                .catch(err => console.error("Error loading game markdown for card counting:", err));
        }
    }

    // Reset click counts
    secretClickCount = 0;
    clearTimeout(secretClickTimer);
}

// Function to handle clicks for Yasuo mode activation/deactivation
function handleSecretModeClick() {
    secretClickCount++;
    clearTimeout(secretClickTimer);
    secretClickTimer = setTimeout(() => {
        secretClickCount = 0;
    }, 500);

    if (secretClickCount === 3) {
        if (isYasuoMode) {
            deactivateYasuoMode();
        } else {
            activateYasuoMode();
        }
    }
}

// Project expansion functionality
function setupProjectExpansion(containerId = 'projects-container') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('Container not found:', containerId);
        return;
    }
    
    const overlay = document.getElementById('overlay');
    const globalCloseButton = document.getElementById('globalCloseButton');
    
    // Track the currently expanded card globally *within this scope*
    let expandedCard = null; 
    
    // Handle project card clicks
    container.addEventListener('click', function(e) {
        // Ignore clicks on links or buttons within the card (like carousel nav)
        if (e.target.closest('a') || e.target.closest('button')) {
            return;
        }
        
        const clickedCard = e.target.closest('.project-card');
        
        if (clickedCard) {
            // *** YASUO MODE CHECK ***
            if (isYasuoMode) {
                yasuoAttack(clickedCard);
                e.stopPropagation(); // Prevent any other actions
                return; // Don't expand the card
            }
            // *** END YASUO MODE CHECK ***

            // If the clicked card is already the expanded one, do nothing
            if (clickedCard === expandedCard) {
                return;
            }

            // If a *different* card is already expanded, collapse it first
            if (expandedCard && expandedCard !== clickedCard) {
                collapseProject(expandedCard); // Collapse the old card
                // expandedCard will be set to null inside collapseProject
            }

            // Now, expand the newly clicked card
            expandProject(clickedCard, container);
            expandedCard = clickedCard; // Track the newly expanded card
            
            // Stop propagation to prevent potential body/window listeners
            e.stopPropagation(); 
        }
    });
    
    // Handle closing via explicit close button
    if (globalCloseButton) {
        globalCloseButton.addEventListener('click', function() {
            if (expandedCard) { // Only act if a card is expanded
                collapseProject(expandedCard);
                expandedCard = null; // Update tracked card
            }
        });
    }
    
    // Handle closing via overlay click
    if (overlay) {
        overlay.addEventListener('click', function() {
            if (expandedCard) { // Only act if a card is expanded
                collapseProject(expandedCard);
                expandedCard = null; // Update tracked card
            }
        });
    }
    
    // We removed the scroll listener for closing as it was causing issues
    // We also removed the complex forceCardOpen and isExpanding logic
}

function expandProject(projectCard, container) {
    // Add expanded class to project without animations
    projectCard.classList.add('expanded');
    
    // Add class to container to hide other projects
    container.classList.add('has-expanded');
    
    // Show overlay
    const overlay = document.getElementById('overlay');
    overlay.classList.add('active');
    
    // Show global close button
    document.body.classList.add('has-expanded-project');
    
    // Prevent body scrolling
    document.body.classList.add('body-no-scroll');
}

function collapseProject(projectCard) {
    if (!projectCard) return; // Guard clause
    
    // Remove expanded class
    projectCard.classList.remove('expanded');
    
    // Remove class from container (find the correct parent grid)
    const container = projectCard.closest('.portfolio-grid');
    if (container) { 
        container.classList.remove('has-expanded');
    }
    
    // Hide overlay
    const overlay = document.getElementById('overlay');
    if (overlay) { 
        overlay.classList.remove('active');
    }
    
    // Hide global close button
    document.body.classList.remove('has-expanded-project');
    
    // Allow body scrolling
    document.body.classList.remove('body-no-scroll');
}

// Theme toggle functionality
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Check if user has previously set a theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        // Set the initial icon based on system preference
        themeToggle.innerHTML = prefersDarkScheme.matches ? 
            '<i class="fas fa-moon"></i>' : 
            '<i class="fas fa-sun"></i>';
    }
    
    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('light-theme')) {
            // Switch to dark theme
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'dark');
        } else if (document.body.classList.contains('dark-theme')) {
            // Switch to light theme
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'light');
        } else {
            // No manual theme set yet, check system preference and set opposite
            if (prefersDarkScheme.matches) {
                document.body.classList.add('light-theme');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.add('dark-theme');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                localStorage.setItem('theme', 'dark');
            }
        }
    });

    // Also listen for system preference changes
    prefersDarkScheme.addEventListener('change', e => {
        // Only update if no manual theme has been set
        if (!document.body.classList.contains('light-theme') && 
            !document.body.classList.contains('dark-theme')) {
            themeToggle.innerHTML = e.matches ? 
                '<i class="fas fa-moon"></i>' : 
                '<i class="fas fa-sun"></i>';
        }
    });
}

// Function to initialize all comparison sliders on the page
function initAllComparisonSliders(containerId = 'projects-container') {
    // Comparison slider functionality has been removed
}

function setupComparisonObserver() {
    // Comparison slider functionality has been removed
}

// Initialize the portfolio
function initPortfolio(projectsFile, gamesFile) {
    initNameAnimation();
    initThemeToggle();

    // Initialize project expansion functionality
    setupProjectExpansion('projects-container');
    if (document.getElementById('games-container')) {
        setupProjectExpansion('games-container');
    }

    // Reset the markdown processed flag when loading new projects
    markdownProcessed = false;

    // Load projects
    if (projectsFile) {
        fetch(projectsFile)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                const projectsContainer = document.getElementById('projects-container');
                const projects = parseMarkdown(text);
                
                if (projects.intro) {
                    document.querySelector('.bio').innerHTML = projects.intro;
                }

                // Update global count if in Yasuo mode
                if (isYasuoMode) {
                    visibleCardsCount = expectedCardsCount;
                    console.log(`initPortfolio: Set visibleCardsCount to ${visibleCardsCount} from markdown data`);
                }

                projects.projects.forEach((project, index) => {
                    const projectCard = createProjectCard(project, index);
                    // Convert string to DOM element before appending
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = projectCard;
                    projectsContainer.appendChild(tempDiv.firstElementChild);
                });
            })
            .catch(e => {
                console.error('Error loading projects:', e);
                document.getElementById('projects-container').innerHTML = `
                    <div class="error-message">
                        <p>Failed to load projects. Please try again later.</p>
                        <p class="error-details">${e.message}</p>
                    </div>
                `;
            });
    }

    // Reset the markdown processed flag before loading games
    markdownProcessed = false;

    // Load games
    if (gamesFile) {
        fetch(gamesFile)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                const gamesContainer = document.getElementById('games-container');
                const games = parseMarkdown(text);
                
                // Update global count if in Yasuo mode
                if (isYasuoMode) {
                    visibleCardsCount = expectedCardsCount;
                    console.log(`initPortfolio: Set visibleCardsCount to ${visibleCardsCount} from markdown data`);
                }

                games.projects.forEach((game, index) => {
                    const gameCard = createProjectCard(game, index + 1000); // Use offset for game IDs
                    // Convert string to DOM element before appending
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = gameCard;
                    gamesContainer.appendChild(tempDiv.firstElementChild);
                });
            })
            .catch(e => {
                console.error('Error loading games:', e);
                document.getElementById('games-container').innerHTML = `
                    <div class="error-message">
                        <p>Failed to load games. Please try again later.</p>
                        <p class="error-details">${e.message}</p>
                    </div>
                `;
            });
    }
}

// Email handler function
function handleEmailSubmit(event) {
    event.preventDefault();
    window.location.href = `mailto:Hussein.Ubeid@outlook.com`;
    return false;
}

// Default project card creation function (for programming portfolio)
function createDefaultProjectCard(project, index) {
    const isVideo = typeof project.media === 'string' && 
                  (project.media.includes('youtube.com') || project.media.includes('youtu.be'));
    const isMultiImage = Array.isArray(project.media);
    
    let mediaContent = '';
    if (isVideo) {
        // Extract video ID and create proper embed URL
        let videoId;
        if (project.media.includes('youtube.com/watch')) {
            videoId = new URL(project.media).searchParams.get('v');
        } else if (project.media.includes('youtu.be/')) {
            videoId = project.media.split('youtu.be/')[1].split('?')[0];
        }
        
        if (videoId) {
            mediaContent = `
                <iframe 
                    src="https://www.youtube.com/embed/${videoId}" 
                    frameborder="0" 
                    allowfullscreen
                    style="width: 100%; height: 100%;">
                </iframe>
            `;
        } else {
            mediaContent = `<img src="${project.media}" alt="${project.title}">`;
        }
    } else if (project.comparison && isMultiImage && project.media.length === 2) {
        // All comparison slider functionality has been removed
        // Create a carousel for comparison images instead
        mediaContent = createCarousel(project.media, index);
    } else if (isMultiImage) {
        mediaContent = createCarousel(project.media, index);
    } else {
        mediaContent = `<img src="${project.media}" alt="${project.title}">`;
    }
    
    return `
        <div class="project-card" data-project-id="${index}">
            ${project.private ? `
                <span class="private-tag">
                    <i class="fas fa-lock"></i> Private
                </span>
            ` : project.demo ? `
                <a href="${project.demo}" target="_blank" class="demo-notch">
                    <i class="fas fa-play-circle"></i> Demo
                </a>
            ` : ''}
            ${project.github ? `
                <a href="${project.github}" target="_blank" class="github-notch">
                    <i class="fab fa-github"></i> GitHub
                </a>
            ` : ''}
            ${project.store ? `
                <a href="${project.store}" target="_blank" class="store-notch">
                    <i class="fas fa-shopping-cart"></i> Store
                </a>
            ` : ''}
            <div class="project-media">
                ${mediaContent}
            </div>
            <div class="project-info">
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                <div class="project-links">
                </div>
            </div>
        </div>
    `;
}

// DOMContentLoaded to initialize sliders on first load
document.addEventListener('DOMContentLoaded', function() {
    // All comparison slider functionality has been removed
});

// Remove all comparison slider related code
window.addEventListener('load', function() {
    // Comparison slider functionality has been removed
});

// Remove function for positioning sliders
function positionAllSliders() {
    // Comparison slider functionality has been removed
}

// Remove event listeners for slider positioning
window.addEventListener('load', function() {
    // Comparison slider functionality has been removed
});

// Remove resize listener for sliders
window.addEventListener('resize', function() {
    // Comparison slider functionality has been removed
});

// Function to force attach Yasuo name click handler directly
function attachYasuoNameClickHandler() {
    console.log("FORCE ATTACHING Yasuo name click handler");
    const nameElement = document.querySelector('#name-display h1');
    
    if (nameElement) {
        console.log("FOUND name element, removing old listeners and adding new one");
        
        // Remove any existing listeners to avoid duplicates
        nameElement.removeEventListener('click', handleSecretModeClick);
        
        // Force add styling to make it obvious it's clickable
        nameElement.style.cursor = 'pointer';
        nameElement.style.userSelect = 'none';
        
        // Add new direct click handler that doesn't use wrapper function
        nameElement.addEventListener('click', function yasuoClickListener(e) {
            console.log("DIRECT NAME CLICK DETECTED!");
            secretClickCount++;
            console.log(`SECRET CLICK COUNT: ${secretClickCount}`);
            
            // Clear any existing timer
            clearTimeout(secretClickTimer);
            
            // Set a timer to reset count if clicks are too far apart
            secretClickTimer = setTimeout(() => {
                console.log("CLICK TIMEOUT - resetting count");
                secretClickCount = 0;
            }, 500);
            
            // Check if we've reached 3 clicks
            if (secretClickCount === 3) {
                console.log("THREE CLICKS DETECTED - toggling Yasuo mode");
                secretClickCount = 0;
                clearTimeout(secretClickTimer);
                
                if (isYasuoMode) {
                    console.log("DEACTIVATING Yasuo mode");
                    deactivateYasuoMode();
                } else {
                    console.log("ACTIVATING Yasuo mode");
                    activateYasuoMode();
                }
            }
        });
        
        console.log("New click handler attached directly to name element");
        return true;
    } else {
        console.error("CRITICAL: Name element not found for click handler");
        return false;
    }
}

// Initialize all features when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    loadLanguageColors();
    // Create and append Yasuo mode indicator image
    const indicator = document.createElement('img');
    indicator.id = 'yasuo-mode-indicator';
    indicator.src = 'images/yasuo.png';
    indicator.alt = 'Yasuo Mode Active';
    document.body.appendChild(indicator);
    
    let projectsFile = null;
    let gamesFile = null;

    // Determine page type and set selectors
    const isIndexPage = window.location.pathname.endsWith('index.html') || 
                        window.location.pathname.endsWith('/') || 
                        window.location.pathname.split('/').pop() === '';
    
    console.log("Page detection - Is index page:", isIndexPage);
    console.log("Current pathname:", window.location.pathname);

    if (document.getElementById('programming-projects-container')) {
        console.log("Detected programming portfolio page");
        activeContainerSelector = '#programming-projects-container';
        activeCardSelector = '.project-card';
        projectsFile = 'projects/programming_projects.md';
        initPortfolio(projectsFile, null); 
        setupProjectExpansion(activeContainerSelector.substring(1));
    } else if (document.getElementById('3d-projects-container')) {
        console.log("Detected 3D portfolio page");
        activeContainerSelector = '#3d-projects-container';
        activeCardSelector = '.project-card';
        projectsFile = 'projects/3d_projects.md';
        gamesFile = 'projects/games_projects.md';
        initPortfolio(projectsFile, gamesFile); 
        setupProjectExpansion(activeContainerSelector.substring(1));
    } else if (document.querySelector('.portfolio-choice-container')) {
        // Index page
        console.log("Detected index page with .portfolio-choice-container");
        activeContainerSelector = '.portfolio-choice-container';
        activeCardSelector = '.portfolio-choice';
        
        // The index page doesn't use the initPortfolio function
        if (document.getElementById('name-display')) {
             initNameAnimation();
        }
    } else {
         console.warn("Could not determine portfolio type for Yasuo mode setup.");
    }
    
    // Initialize theme toggle if button exists
    if (document.getElementById('themeToggle')) {
        initThemeToggle();
    }

    // Try to attach the name click handler
    let handlerAttached = attachYasuoNameClickHandler();
    console.log("Initial handler attachment result:", handlerAttached);

    // Add delegated click listener to the active container for Yasuo attacks
    if (activeContainerSelector && activeCardSelector) {
        const containerElement = document.querySelector(activeContainerSelector);
        if (containerElement) {
            console.log(`Found container ${activeContainerSelector}, adding Yasuo card click listener`);
            containerElement.addEventListener('click', function(e) {
                console.log("Container clicked, yasuo mode:", isYasuoMode);
                if (!isYasuoMode) return; // Only act in Yasuo mode

                // Find the clicked card element that matches the active selector
                const clickedCard = e.target.closest(activeCardSelector);
                
                if (clickedCard) {
                    console.log("Card match found:", clickedCard);
                    // Prevent default behavior (like navigation for <a> tags on index)
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    
                    yasuoAttack(clickedCard);
                } else {
                    console.log("No matching card element found in click path");
                }
            }, true); // Use capture phase
        } else {
             console.warn("Could not find container element to attach Yasuo click listener:", activeContainerSelector);
        }
    } else {
         console.warn("Cannot attach Yasuo click listener: Active container/card selectors not set.");
    }
});

// Ensure index page has Yasuo mode enabled
window.addEventListener('load', function() {
    console.log("WINDOW LOAD EVENT - Checking name click handler on index");
    
    // Check if we're on index page
    const isIndexPage = window.location.pathname.endsWith('index.html') || 
                        window.location.pathname.endsWith('/') || 
                        window.location.pathname.split('/').pop() === '';
    
    if (isIndexPage) {
        console.log("INDEX PAGE LOAD DETECTED - forcing name click handler attachment");
        
        // Force attach name click handler after a short delay to ensure DOM is fully processed
        setTimeout(() => {
            const attached = attachYasuoNameClickHandler();
            console.log("INDEX Force attachment result:", attached);
            
            // Try multiple times if it fails initially
            if (!attached) {
                console.log("First attempt failed, trying again in 500ms");
                setTimeout(() => {
                    const retryResult = attachYasuoNameClickHandler();
                    console.log("Second attachment attempt result:", retryResult);
                }, 500);
            }
        }, 100);
    }
}); 