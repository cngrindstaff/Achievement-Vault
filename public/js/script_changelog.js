import { initNav } from './script_nav.js';

$(document).ready(async function () {
    initNav({ currentPage: 'changelog' });

    try {
        const res = await fetch('/api/changelog');
        const markdown = await res.text();
        const content = markdown.split('\n# Format')[0].trim();
        document.getElementById('changelog-content').innerHTML = marked.parse(content);
    } catch (err) {
        console.error('Error loading changelog:', err);
        document.getElementById('changelog-content').textContent = 'Failed to load changelog.';
    }
});
