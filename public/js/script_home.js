import { initNav } from './script_nav.js';

const gameListItemTemplate = document.getElementById('game-list-item-template');

// Home page — no back button, no game context
initNav({ currentPage: 'home' });

async function loadGames() {
    try {
        const res = await fetch('/api/db/games/all');
        const games = await res.json();
        console.log('Games:', games);
        const container = document.getElementById('game-list-container');
        const fragment = document.createDocumentFragment();

        games.forEach(game => {
            const clone = gameListItemTemplate.content.cloneNode(true);
            const p = clone.querySelector('.game-list-item');
            p.textContent = game.FriendlyName;
            p.onclick = () => window.location.href = `game?id=${game.ID}&name=${game.Name}`;
            fragment.appendChild(clone);
        });

        container.appendChild(fragment);
    } catch (err) {
        console.error('Failed to load games:', err);
    }
}

window.onload = loadGames;
