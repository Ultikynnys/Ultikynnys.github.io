/**
 * Shared functions for loading portfolio sections
 */

/**
 * Loads the game section header and description from a markdown file
 * @param {string} markdownFile - Path to the markdown file containing the game description
 * @param {string} defaultDescription - Default description to use if none is found
 */
function loadGameSectionHeader(markdownFile, defaultDescription) {
    // Insert the static game section header HTML directly
    document.getElementById('game-section-header').innerHTML = `
        <!-- Games Section -->
        <div class="section-divider">
            <h2>Games</h2>
            <p id="games-description"></p>
        </div>
    `;
    
    // Load the games description from the markdown file
    fetch(markdownFile)
        .then(response => response.text())
        .then(text => {
            // Look for a game description section in the markdown file
            const gamesSectionRegex = /## Games Description\s*?\n(.*?)(?=\n##|\n$)/s;
            const match = text.match(gamesSectionRegex);
            
            let description = "";
            if (match && match[1]) {
                description = match[1].trim();
            } else {
                // Use the provided default description if not found
                description = defaultDescription;
            }
            
            document.getElementById('games-description').textContent = description;
        })
        .catch(error => {
            console.error(`Failed to load games description from ${markdownFile}:`, error);
            // Set default description if failed to load
            document.getElementById('games-description').textContent = defaultDescription;
        });
}