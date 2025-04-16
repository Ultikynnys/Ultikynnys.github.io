/**
 * Shared functions for loading portfolio sections
 */

/**
 * Loads the game section header and description from a markdown file
 * @param {string} markdownFile - Path to the markdown file containing the game description
 * @param {string} defaultDescription - Default description to use if none is found
 */
function loadGameSectionHeader(markdownFile, defaultDescription) {
    // Load the game section header
    fetch('_includes/game-section-header.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('game-section-header').innerHTML = html;
            
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
        })
        .catch(error => {
            console.error('Failed to load game section header:', error);
        });
} 