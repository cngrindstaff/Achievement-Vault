async function loadGames() {
    try {
        const res = await fetch('/api/db/games/all');
        const games = await res.json();
        console.log('Games:', games)
        const container = document.getElementById('game-list-container');
        games.forEach(game => {
            const p = document.createElement('p');
            p.className = 'game-list-item';
            p.onclick = () => window.location.href = `games/${game.Name}/${game.Name}.html`;
            p.textContent = game.FriendlyName;
            container.appendChild(p);
        });
    } catch (err) {
        console.error('Failed to load games:', err);
    }
}

window.onload = loadGames;
