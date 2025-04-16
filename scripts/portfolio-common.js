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
            }
        }
        
        if (Object.keys(project).length > 0) {
            result.projects.push(project);
        }
    }
    
    return result;
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
    const container = document.getElementById(containerId);
    if (!container) return;
    
    console.log("Initializing all comparison sliders in container:", containerId);
    
    const comparisonContainers = container.querySelectorAll('.comparison-container');
    comparisonContainers.forEach(compContainer => {
        const projectCard = compContainer.closest('.project-card');
        const projectId = projectCard ? projectCard.getAttribute('data-project-id') : null;
        
        if (projectId) {
            console.log("Initializing comparison slider for project:", projectId);
            
            const slider = compContainer.querySelector('.comparison-slider');
            const overlay = compContainer.querySelector('.comparison-overlay');
            
            // Set initial positions
            if (slider && overlay) {
                // Ensure the slider is visible
                slider.style.display = 'block';
                slider.style.visibility = 'visible';
                slider.style.left = '50%';
                slider.style.zIndex = '10';
                
                // Ensure the overlay is visible and properly clipped
                overlay.style.display = 'block';
                overlay.style.visibility = 'visible';
                overlay.style.clipPath = 'inset(0 50% 0 0)';
                
                // Make sure all images are visible
                const images = compContainer.querySelectorAll('img');
                images.forEach((img, index) => {
                    img.style.opacity = '1';
                    img.style.visibility = 'visible';
                    img.style.display = 'block';
                    img.style.zIndex = index === 0 ? '5' : '6';
                    
                    // Force image load if not already loaded
                    if (!img.complete) {
                        img.onload = function() {
                            // Re-apply the clip path after image loads
                            overlay.style.clipPath = 'inset(0 50% 0 0)';
                        };
                    }
                });
                
                // Force a redraw
                compContainer.style.opacity = '0.99';
                setTimeout(() => {
                    compContainer.style.opacity = '1';
                    
                    // Ensure the clip path is still set
                    overlay.style.clipPath = 'inset(0 50% 0 0)';
                    
                    // Trigger the comparison slider initialization
                    startComparison(projectId, null);
                }, 50);
            }
        }
    });
}

// Initialize a MutationObserver to monitor DOM changes
function setupComparisonObserver() {
    // Create an observer to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
        let shouldCheckComparisons = false;
        
        // Check if any mutations affect project cards or comparison sliders
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && 
                            (node.classList.contains('project-card') || 
                             node.classList.contains('comparison-container') ||
                             node.querySelector('.comparison-container'))) {
                            shouldCheckComparisons = true;
                        }
                    }
                });
            }
        });
        
        // If relevant changes detected, initialize comparison sliders
        if (shouldCheckComparisons) {
            console.log("DOM changes detected, re-initializing comparison sliders");
            setTimeout(() => {
                initAllComparisonSliders();
                initAllComparisonSliders('games-container');
            }, 100);
        }
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { 
        childList: true, 
        subtree: true
    });
    
    return observer;
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
        // Use global createComparisonSlider function defined in comparison-slider.js
        mediaContent = window.createComparisonSlider(project.media, index);
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
    // All comparison slider functionality is now handled in comparison-slider.js
});

// Add more aggressive initialization for comparison sliders
window.addEventListener('load', function() {
    console.log("Window load complete - Executing emergency comparison slider fix");
    
    // First, try to directly set styles on all comparison elements
    const allOverlays = document.querySelectorAll('.comparison-overlay');
    console.log(`Found ${allOverlays.length} comparison overlays to fix`);
    
    allOverlays.forEach((overlay) => {
        // Force the overlay to be visible with the correct clip path
        overlay.style.display = 'block';
        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        overlay.style.clipPath = 'inset(0 50% 0 0)';
        overlay.style.zIndex = '6';
        
        // Force the overlay image to be visible
        const overlayImg = overlay.querySelector('img');
        if (overlayImg) {
            overlayImg.style.display = 'block';
            overlayImg.style.visibility = 'visible';
            overlayImg.style.opacity = '1';
            overlayImg.style.zIndex = '6';
        }
        
        // Position the handle
        const container = overlay.closest('.custom-comparison-container');
        if (container) {
            const handle = container.querySelector('.comparison-handle');
            if (handle) {
                handle.style.display = 'block';
                handle.style.visibility = 'visible';
                handle.style.left = '50%';
                handle.style.zIndex = '10';
            }
            
            // Force a redraw of the container
            container.style.opacity = '0.99';
            setTimeout(() => {
                container.style.opacity = '1';
            }, 10);
        }
    });
    
    // Then try to initialize each comparison slider
    document.querySelectorAll('.custom-comparison-container').forEach((container) => {
        if (typeof window.initComparisonSlider === 'function' && 
            !container.hasAttribute('data-custom-slider-initialized')) {
            try {
                window.initComparisonSlider(container);
            } catch (err) {
                console.error("Error initializing slider:", err);
            }
        }
    });
});

// Add a function to manually position all sliders on load
function positionAllSliders() {
    document.querySelectorAll('.custom-comparison-container').forEach(container => {
        const handle = container.querySelector('.comparison-handle');
        const overlay = container.querySelector('.comparison-overlay');
        
        if (handle && overlay) {
            // Get the current left position as percentage if set, or default to 50%
            const percentStr = handle.style.left || '50%';
            let percent = 50;
            
            // Parse the percentage value
            if (percentStr.endsWith('%')) {
                percent = parseFloat(percentStr);
            } else {
                // If it's a pixel value, convert to percentage
                const width = container.clientWidth;
                const pixelValue = parseFloat(percentStr);
                if (!isNaN(pixelValue)) {
                    percent = (pixelValue / width) * 100;
                }
            }
            
            // Make sure percent is between 0 and 100
            percent = Math.max(0, Math.min(percent, 100));
            
            // Set the handle position
            handle.style.left = `${percent}%`;
            
            // Set the overlay clip path
            overlay.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
        }
    });
}

// Call this function on load
window.addEventListener('load', function() {
    // Wait for a moment to ensure everything is rendered
    setTimeout(positionAllSliders, 100);
    // Try again a bit later in case of slow loading
    setTimeout(positionAllSliders, 500);
});

// Also call when the page is resized
window.addEventListener('resize', positionAllSliders); 