import { initNav } from './script_nav.js';
import * as dbUtils from './script_db_helper.js';

const gameListItemTemplate = document.getElementById('game-list-item-template');
const gameListContainer = document.getElementById('game-list-container');
const addGameButton = document.getElementById('add-game-btn');
const gameNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Home page — no back button, no game context
initNav({ currentPage: 'home' });

function renderGames(games) {
    gameListContainer.querySelectorAll('.game-list-item').forEach((node) => node.remove());

    const fragment = document.createDocumentFragment();
    games.forEach(game => {
        const clone = gameListItemTemplate.content.cloneNode(true);
        const gameLink = clone.querySelector('.game-list-item');
        gameLink.textContent = game.FriendlyName;
        gameLink.onclick = () => {
            window.location.href = `game?id=${game.ID}&name=${game.Name}`;
        };
        fragment.appendChild(clone);
    });

    gameListContainer.appendChild(fragment);
}

async function loadGames() {
    try {
        const res = await dbUtils.apiFetch('/api/db/games');
        const games = await res.json();
        renderGames(games);
        return games;
    } catch (err) {
        console.error('Failed to load games:', err);
        return [];
    }
}

function initAddGameModal() {
    const modalHtml = `
        <div id="game-edit-modal" class="modal hidden">
            <div class="modal-content">
                <span id="game-edit-close" class="close-modal">&times;</span>
                <h3>Add Game</h3>
                <form id="game-edit-form" class="add-record-container">
                    <label class="add-record">Name:<input type="text" id="game-edit-name" class="add-record" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" title="Use lowercase letters, numbers, and hyphens only." required></label>
                    <label class="add-record">Friendly Name:<input type="text" id="game-edit-friendly-name" class="add-record" required></label>
                    <label class="add-record">
                        <input type="checkbox" id="game-edit-has-data-tables"> Has Data Tables
                    </label>
                    <button type="submit" class="save-btn">Save</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('game-edit-modal');
    const closeButton = document.getElementById('game-edit-close');
    const form = document.getElementById('game-edit-form');
    const nameInput = document.getElementById('game-edit-name');
    const friendlyNameInput = document.getElementById('game-edit-friendly-name');
    const hasDataTablesInput = document.getElementById('game-edit-has-data-tables');

    function openModal() {
        nameInput.value = '';
        nameInput.setCustomValidity('');
        friendlyNameInput.value = '';
        hasDataTablesInput.checked = false;
        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    addGameButton?.addEventListener('click', openModal);
    closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const gameName = nameInput.value.trim();
        const gameFriendlyName = friendlyNameInput.value.trim();
        const hasDataTables = hasDataTablesInput.checked ? 1 : 0;

        if (!gameNamePattern.test(gameName)) {
            nameInput.setCustomValidity('Use lowercase letters, numbers, and hyphens only.');
            nameInput.reportValidity();
            return;
        }
        nameInput.setCustomValidity('');

        if (!gameName || !gameFriendlyName) {
            alert('Please provide both Name and Friendly Name.');
            return;
        }

        const response = await dbUtils.insertGame({
            gameName,
            gameFriendlyName,
            hasDataTables
        });

        if (!response || !response.gameId) {
            alert('Unable to create game.');
            return;
        }

        closeModal();
        await loadGames();
    });
}

window.onload = async () => {
    initAddGameModal();
    await loadGames();
};
