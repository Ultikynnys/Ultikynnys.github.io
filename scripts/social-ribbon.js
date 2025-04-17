// Social Ribbon Component
function createSocialRibbon() {
    // Create the ribbon container *first*
    const ribbonContainer = document.createElement('div');
    ribbonContainer.className = 'social-ribbon';

    // Create the container for the main social buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'social-buttons';
    buttonsContainer.innerHTML = `
        <a href="https://ko-fi.com/r60dr60d" target="_blank" class="kofi-notch">
            <i class="fas fa-mug-hot"></i> Support on Ko-fi
        </a>
        <a href="https://discord.gg/J7kWSfM4jw" target="_blank" class="discord-notch">
            <i class="fab fa-discord"></i> Join Discord
        </a>
        <a href="https://www.artstation.com/r60d" target="_blank" class="artstation-header-notch">
            <i class="fab fa-artstation"></i> ArtStation
        </a>
        <a href="https://www.fab.com/sellers/Ultikynnys%20Productions" target="_blank" class="fab-notch">
            <i class="fas fa-cube"></i> Fab Store
        </a>
        <a href="cv_template.html" target="_blank" class="cv-notch">
            <i class="fas fa-file-alt"></i> View CV
        </a>
        <a href="mailto:Hussein.Ubeid@outlook.com" class="email-notch">
            <i class="fas fa-envelope"></i> Email Me
        </a>
        <a href="https://www.linkedin.com/in/ubeid-hussein-31ba59204/" target="_blank" class="linkedin-notch">
            <i class="fab fa-linkedin"></i> LinkedIn
        </a>
        <a href="https://github.com/Ultikynnys" target="_blank" class="github-notch">
            <i class="fab fa-github"></i> GitHub
        </a>
    `;

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
document.addEventListener('DOMContentLoaded', function() {
    createSocialRibbon();
}); 