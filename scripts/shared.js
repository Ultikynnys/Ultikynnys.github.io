// Shared JavaScript functions for both portfolios


// Grab the overlay element
const overlay = document.getElementById('overlay');

// Attach click listeners to each project card
function attachExpandListeners() {
  const projectCards = document.querySelectorAll('.project-card');
  projectCards.forEach(card => {
    card.addEventListener('click', event => {
      // If user clicked the "back button" or something similar, you may want separate logic
      if (
        event.target.classList.contains('back-button') ||
        event.target.closest('.back-button')
      ) {
        // If there's a dedicated back-button inside the card, close it
        closeCard(card);
        return;
      }

      // Otherwise, toggle the expanded state
      if (card.classList.contains('expanded')) {
        // Shrink it back
        closeCard(card);
      } else {
        // Expand it to center
        openCard(card);
      }
    });
  });
}

// Show expanded card + overlay
function openCard(card) {
  card.classList.add('expanded');
  overlay.classList.add('visible');
}

// Hide expanded card + overlay
function closeCard(card) {
  card.classList.remove('expanded');
  overlay.classList.remove('visible');
}

// Call attachExpandListeners() once your projects are all rendered in the DOM
document.addEventListener('DOMContentLoaded', () => {
  attachExpandListeners();
});


// Image comparison slider functionality
function initializeImageComparisons() {
    document.querySelectorAll('.image-comparison').forEach(comparison => {
        const slider = comparison.querySelector('.slider');
        const before = comparison.querySelector('.before');
        let isDragging = false;

        slider.addEventListener('mousedown', () => {
            isDragging = true;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const rect = comparison.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const percentage = (x / rect.width) * 100;
            
            before.style.width = `${percentage}%`;
            slider.style.left = `${percentage}%`;
        });
    });
}

// Contact form submission handler
function handleSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    
    const subject = `Contact from ${name}`;
    const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
    
    window.location.href = `mailto:Hussein.Ubeid@outlook.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    return false;
}

// Initialize all shared functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeImageComparisons();
}); 