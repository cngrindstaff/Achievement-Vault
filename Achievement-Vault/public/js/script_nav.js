/**
 * Shared slide-out navigation menu.
 *
 * Usage:
 *   import { initNav } from './script_nav.js';
 *
 *   initNav({
 *       currentPage: 'checklist',      // one of: 'home','game','checklistGroups','checklist','table','manage_sections','manage_sectionRecords'
 *       gameId: 5,                      // optional — needed for back/game links
 *       gameNameFriendly: 'Elden Ring', // optional — shown in menu
 *   });
 */

export function initNav({ currentPage, gameId, gameNameFriendly }) {

    // Build nav items based on current page context
    const items = [];

    // 1. Home — always, unless already there
    if (currentPage !== 'home') {
        items.push({ label: 'Home', icon: 'fa-house', href: './' });
    }

    // 2. Back button — always, unless on Home
    if (currentPage !== 'home') {
        const backHref = getBackHref(currentPage, gameId);
        if (backHref) {
            items.push({ label: 'Back', icon: 'fa-arrow-left', href: backHref });
        }
    }

    // 3. Game page link — if not on home or the game page itself, and we have a gameId
    if (currentPage !== 'home' && currentPage !== 'game' && gameId) {
        items.push({
            label: gameNameFriendly || 'Game Page',
            icon: 'fa-gamepad',
            href: `/game?id=${gameId}`
        });
    }

    // 4. Checklist Groups — if not on home, game, or checklistGroups itself
    if (currentPage !== 'home' && currentPage !== 'game' && currentPage !== 'checklistGroups' && gameId) {
        items.push({
            label: 'Checklist Groups',
            icon: 'fa-list',
            href: `/checklistGroups?gameId=${gameId}`
        });
    }

    // Build the DOM
    const navHTML = `
        <button id="nav-hamburger" class="nav-hamburger" aria-label="Open navigation">
            <i class="fa fa-bars"></i>
        </button>
        <div id="nav-overlay" class="nav-overlay hidden"></div>
        <nav id="nav-slideout" class="nav-slideout">
            <div class="nav-header">
                <span class="nav-title">Navigation</span>
                <button id="nav-close" class="nav-close" aria-label="Close navigation">
                    <i class="fa fa-times"></i>
                </button>
            </div>
            <ul class="nav-links">
                ${items.map(item => `
                    <li>
                        <a href="${item.href}" class="nav-link">
                            <i class="fa ${item.icon}"></i>
                            <span>${item.label}</span>
                        </a>
                    </li>
                `).join('')}
            </ul>
        </nav>
    `;

    document.body.insertAdjacentHTML('afterbegin', navHTML);

    // Wire up open/close
    const hamburger = document.getElementById('nav-hamburger');
    const slideout = document.getElementById('nav-slideout');
    const overlay = document.getElementById('nav-overlay');
    const closeBtn = document.getElementById('nav-close');

    function openNav() {
        slideout.classList.add('open');
        overlay.classList.remove('hidden');
    }

    function closeNav() {
        slideout.classList.remove('open');
        overlay.classList.add('hidden');
    }

    hamburger.addEventListener('click', openNav);
    closeBtn.addEventListener('click', closeNav);
    overlay.addEventListener('click', closeNav);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && slideout.classList.contains('open')) {
            closeNav();
        }
    });

    // Inject site footer
    const footerHTML = `
        <footer class="site-footer">
            <p>Site designed and created by Chelsea Grindstaff</p>
            <p><a href="https://www.flaticon.com/free-icons/gaming" title="gaming icons">Gaming favicon created by Us and Up - Flaticon</a></p>
        </footer>
    `;
    document.body.insertAdjacentHTML('beforeend', footerHTML);
}

function getBackHref(currentPage, gameId) {
    switch (currentPage) {
        case 'game':
            return './'; // back to home
        case 'checklistGroups':
        case 'checklist':
        case 'table':
        case 'manage_sections':
        case 'manage_sectionRecords':
            return gameId ? `/game?id=${gameId}` : './';
        default:
            return './';
    }
}
