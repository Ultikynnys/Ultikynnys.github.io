function loadFooter() {
    fetch('footer.html')
        .then(response => response.text())
        .then(html => {
            const container = document.getElementById('footer-container');
            container.innerHTML = html;
            container.querySelectorAll('script').forEach(oldScript => {
                const newScript = document.createElement('script');
                newScript.textContent = oldScript.textContent;
                document.body.appendChild(newScript);
            });
        })
        .catch(error => console.error('Failed to load footer:', error));
}

document.addEventListener('DOMContentLoaded', loadFooter);
