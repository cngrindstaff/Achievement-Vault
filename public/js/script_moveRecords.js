/**
 * Move records between sections (same game) from the checklist page.
 */
import * as dbUtils from './script_db_helper.js';

function recordToUpdatePayload(record, sectionId, listOrder, gameIdInt) {
    return {
        recordName: record.Name,
        description: record.Description || '',
        sectionId: Number(sectionId),
        gameId: gameIdInt,
        numberOfCheckboxes: record.NumberOfCheckboxes ?? 0,
        numberAlreadyCompleted: record.NumberAlreadyCompleted ?? 0,
        listOrder,
        longDescription: record.LongDescription || '',
        hidden: Number(record.Hidden) === 1 ? 1 : 0,
    };
}

function updateSucceeded(result) {
    return result && typeof result === 'object' && !Array.isArray(result) && result.message;
}

export function initMoveRecords({
    gameId,
    getCurrentSectionGroupId,
    getShowHidden,
    findRecordById,
    onMoved,
}) {
    let activeSectionId = null;
    let activeSectionName = '';
    const selectedIds = new Set();

    const actionBar = document.createElement('div');
    actionBar.id = 'move-records-action-bar';
    actionBar.className = 'move-records-action-bar hidden';
    actionBar.innerHTML = `
        <span class="move-records-action-summary"></span>
        <div class="move-records-action-buttons">
            <button type="button" class="add-section-btn move-records-select-all-btn">Select all</button>
            <button type="button" class="save-button move-records-confirm-btn" disabled>Move to section…</button>
            <button type="button" class="reset-button move-records-cancel-btn">Cancel</button>
        </div>
    `;

    const modal = document.createElement('div');
    modal.id = 'move-records-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3>Move records</h3>
            <p class="move-records-modal-intro"></p>
            <form id="move-records-form" class="add-record-container">
                <label class="add-record">Section group:
                    <select id="move-records-section-group" class="add-record" required></select>
                </label>
                <label class="add-record">Section:
                    <select id="move-records-section" class="add-record" required disabled></select>
                </label>
                <div class="button-container">
                    <button type="submit" class="save-button" id="move-records-submit">Move</button>
                    <button type="button" class="reset-button move-records-modal-cancel">Cancel</button>
                </div>
                <div id="move-records-modal-message" class="error-message hidden"></div>
            </form>
        </div>
    `;

    document.body.appendChild(actionBar);
    document.body.appendChild(modal);

    const gridSelector = '#grid-checklist-container';
    const summaryEl = actionBar.querySelector('.move-records-action-summary');
    const confirmBtn = actionBar.querySelector('.move-records-confirm-btn');
    const selectAllBtn = actionBar.querySelector('.move-records-select-all-btn');
    const sectionGroupSelect = modal.querySelector('#move-records-section-group');
    const sectionSelect = modal.querySelector('#move-records-section');
    const modalIntro = modal.querySelector('.move-records-modal-intro');
    const modalMessage = modal.querySelector('#move-records-modal-message');
    const moveForm = modal.querySelector('#move-records-form');
    const submitBtn = modal.querySelector('#move-records-submit');

    function setModalMessage(text) {
        if (!text) {
            modalMessage.textContent = '';
            modalMessage.classList.add('hidden');
            return;
        }
        modalMessage.textContent = text;
        modalMessage.classList.remove('hidden');
    }

    function updateActionBar() {
        const n = selectedIds.size;
        summaryEl.textContent = n === 0
            ? `Select records in “${activeSectionName}”`
            : `${n} record${n === 1 ? '' : 's'} selected from “${activeSectionName}”`;
        confirmBtn.disabled = n === 0;
    }

    function getSourceSectionBody() {
        if (activeSectionId == null) return null;
        return document.querySelector(
            `${gridSelector} .section.move-select-source[data-section-id="${activeSectionId}"]`
        );
    }

    function syncRowSelectionUi() {
        const body = getSourceSectionBody();
        if (!body) return;
        body.querySelectorAll('.checklist-item[data-record-id]').forEach((row) => {
            const id = row.dataset.recordId;
            const checked = selectedIds.has(String(id));
            const input = row.querySelector('.record-move-select');
            if (input) input.checked = checked;
            row.classList.toggle('checklist-item--move-selected', checked);
        });
    }

    function exitMoveSelectMode() {
        activeSectionId = null;
        activeSectionName = '';
        selectedIds.clear();

        const grid = document.querySelector(gridSelector);
        if (grid) grid.classList.remove('move-select-mode');

        document.querySelectorAll('.section-header--move-select-active').forEach((el) => {
            el.classList.remove('section-header--move-select-active');
        });
        document.querySelectorAll('.section-move-records-btn--active').forEach((el) => {
            el.classList.remove('section-move-records-btn--active');
        });
        document.querySelectorAll('.section.move-select-source').forEach((el) => {
            el.classList.remove('move-select-source');
        });
        document.querySelectorAll('.checklist-item--move-selected').forEach((el) => {
            el.classList.remove('checklist-item--move-selected');
        });
        document.querySelectorAll('.record-move-select').forEach((el) => {
            el.checked = false;
        });
        document.querySelectorAll('.completion-checkbox').forEach((el) => {
            el.disabled = false;
        });
        document.querySelectorAll('.checklist-edit-btn').forEach((el) => {
            el.disabled = false;
        });

        actionBar.classList.add('hidden');
        closeMoveModal();
    }

    function closeMoveModal() {
        modal.classList.add('hidden');
        setModalMessage('');
        sectionSelect.innerHTML = '';
        sectionSelect.disabled = true;
    }

    function enterMoveSelectMode(sectionId, sectionName) {
        if (activeSectionId != null && String(activeSectionId) !== String(sectionId)) {
            if (!confirm('Start selecting records in this section? Your current selection will be cleared.')) {
                return;
            }
            exitMoveSelectMode();
        }

        activeSectionId = sectionId;
        activeSectionName = sectionName || 'Section';
        selectedIds.clear();

        const grid = document.querySelector(gridSelector);
        if (!grid) return;
        grid.classList.add('move-select-mode');

        const header = grid.querySelector(`.section-header[data-section-id="${sectionId}"]`);
        const body = grid.querySelector(`.section[data-section-id="${sectionId}"]`);
        if (header) {
            header.classList.add('section-header--move-select-active');
            header.classList.add('open');
            header.querySelector('.section-move-records-btn')?.classList.add('section-move-records-btn--active');
        }
        if (body) {
            body.classList.add('move-select-source');
            body.style.display = 'block';
            body.querySelectorAll('.completion-checkbox').forEach((el) => {
                el.disabled = true;
            });
            body.querySelectorAll('.checklist-edit-btn').forEach((el) => {
                el.disabled = true;
            });
        }

        updateActionBar();
        syncRowSelectionUi();
        actionBar.classList.remove('hidden');
    }

    async function loadSectionGroupsIntoModal() {
        sectionGroupSelect.innerHTML = '';
        sectionSelect.innerHTML = '';
        sectionSelect.disabled = true;

        const groups = await dbUtils.getSectionGroupsByGameId(gameId, 'all');
        if (!Array.isArray(groups) || groups.length === 0) {
            setModalMessage('No section groups found for this game.');
            syncMoveSubmitEnabled();
            return;
        }

        for (const g of groups) {
            const opt = document.createElement('option');
            opt.value = g.ID;
            opt.textContent = g.FriendlyName || g.Name || `Group ${g.ID}`;
            sectionGroupSelect.appendChild(opt);
        }

        const currentSg = getCurrentSectionGroupId();
        if (currentSg != null) {
            sectionGroupSelect.value = String(currentSg);
        }
        await loadSectionsForSelectedGroup();
    }

    async function loadSectionsForSelectedGroup() {
        const sgId = sectionGroupSelect.value;
        sectionSelect.innerHTML = '';
        sectionSelect.disabled = true;
        if (!sgId) {
            syncMoveSubmitEnabled();
            return;
        }

        const sections = await dbUtils.getSectionsBySectionGroupId(sgId, 'all');
        if (!Array.isArray(sections) || sections.length === 0) {
            setModalMessage('No sections in this section group.');
            syncMoveSubmitEnabled();
            return;
        }
        setModalMessage('');

        for (const s of sections) {
            const opt = document.createElement('option');
            opt.value = s.ID;
            let label = s.Name || `Section ${s.ID}`;
            if (Number(s.Hidden) === 1) label += ' (hidden)';
            opt.textContent = label;
            sectionSelect.appendChild(opt);
        }
        sectionSelect.disabled = false;

        const preferred = sections.find((s) => String(s.ID) !== String(activeSectionId));
        if (preferred) {
            sectionSelect.value = String(preferred.ID);
        }
        syncMoveSubmitEnabled();
    }

    function syncMoveSubmitEnabled() {
        submitBtn.disabled =
            sectionGroupSelect.options.length === 0 ||
            sectionSelect.disabled ||
            !sectionSelect.value;
    }

    async function openMoveModal() {
        if (selectedIds.size === 0) return;
        const n = selectedIds.size;
        modalIntro.textContent = `Move ${n} record${n === 1 ? '' : 's'} to another section in this game.`;
        setModalMessage('');
        sectionGroupSelect.innerHTML = '';
        sectionSelect.innerHTML = '';
        sectionSelect.disabled = true;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Loading…';
        modal.classList.remove('hidden');

        try {
            await loadSectionGroupsIntoModal();
        } catch (err) {
            console.error('[move records] failed to load destinations', err);
            setModalMessage(
                'Could not load section groups. Check your connection, sign in if required, then try again.'
            );
        } finally {
            submitBtn.textContent = 'Move';
            syncMoveSubmitEnabled();
        }
    }

    async function executeMove(targetSectionId) {
        if (String(targetSectionId) === String(activeSectionId)) {
            setModalMessage('Choose a different section than the source.');
            return false;
        }

        const gameIdInt = parseInt(gameId, 10);
        const targetRecords = await dbUtils.getRecordsBySectionIdV2(
            targetSectionId,
            null,
            'all'
        );
        let nextListOrder = (Array.isArray(targetRecords) ? targetRecords : []).reduce(
            (max, r) => Math.max(max, Number(r.ListOrder) || 0),
            0
        );

        const ids = [...selectedIds];
        let failed = 0;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Moving…';

        for (const recordId of ids) {
            const record = findRecordById(recordId);
            if (!record) {
                failed += 1;
                continue;
            }
            nextListOrder += 1;
            const payload = recordToUpdatePayload(record, targetSectionId, nextListOrder, gameIdInt);
            const result = await dbUtils.moveGameRecord(recordId, payload);
            if (!updateSucceeded(result)) failed += 1;
        }

        submitBtn.disabled = false;
        submitBtn.textContent = 'Move';

        if (failed > 0) {
            setModalMessage(
                failed === ids.length
                    ? 'Could not move records. Please try again.'
                    : `${ids.length - failed} moved; ${failed} failed. Refresh the page to verify.`
            );
            return failed < ids.length;
        }
        return true;
    }

    sectionGroupSelect.addEventListener('change', () => {
        void loadSectionsForSelectedGroup()
            .catch((err) => {
                console.error('[move records] section group change', err);
                setModalMessage('Could not load sections for that group.');
            })
            .finally(() => syncMoveSubmitEnabled());
    });

    moveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setModalMessage('');
        const targetSectionId = sectionSelect.value;
        if (!targetSectionId) {
            setModalMessage('Select a destination section.');
            return;
        }
        const ok = await executeMove(targetSectionId);
        if (!ok) return;

        exitMoveSelectMode();
        closeMoveModal();
        if (onMoved) await onMoved();
    });

    modal.querySelector('.close-modal').addEventListener('click', closeMoveModal);
    modal.querySelector('.move-records-modal-cancel').addEventListener('click', closeMoveModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeMoveModal();
    });

    actionBar.querySelector('.move-records-cancel-btn').addEventListener('click', exitMoveSelectMode);
    confirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        void openMoveModal().catch((err) => {
            console.error('[move records] openMoveModal', err);
            modal.classList.remove('hidden');
            setModalMessage('Something went wrong. Try again or refresh the page.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Move';
        });
    });
    selectAllBtn.addEventListener('click', () => {
        const body = getSourceSectionBody();
        if (!body) return;
        body.querySelectorAll('.checklist-item[data-record-id]').forEach((row) => {
            if (row.dataset.recordId) selectedIds.add(String(row.dataset.recordId));
        });
        updateActionBar();
        syncRowSelectionUi();
    });

    function bind(containerEl) {
        if (!containerEl) return;

        containerEl.addEventListener('click', (e) => {
            const moveBtn = e.target.closest('.section-move-records-btn');
            if (moveBtn) {
                e.stopPropagation();
                const header = moveBtn.closest('.section-header');
                if (!header) return;
                const sectionId = header.dataset.sectionId;
                const sectionName =
                    header.querySelector('.section-header-text')?.dataset?.sectionTitle ||
                    header.dataset.sectionName ||
                    'Section';
                if (activeSectionId != null && String(activeSectionId) === String(sectionId)) {
                    exitMoveSelectMode();
                } else {
                    enterMoveSelectMode(sectionId, sectionName);
                }
                return;
            }

            if (e.target.closest('.checklist-edit-btn, .section-add-btn, .section-reorder-btn, .section-edit-desc-btn')) {
                return;
            }
        });

        containerEl.addEventListener('change', (e) => {
            if (!e.target.classList.contains('record-move-select')) return;
            if (activeSectionId == null) return;

            const row = e.target.closest('.checklist-item');
            if (!row || !row.dataset.recordId) return;
            const body = getSourceSectionBody();
            if (!body || !body.contains(row)) return;

            const id = String(row.dataset.recordId);
            if (e.target.checked) selectedIds.add(id);
            else selectedIds.delete(id);

            row.classList.toggle('checklist-item--move-selected', e.target.checked);
            updateActionBar();
        });
    }

    return {
        bind,
        exitMoveSelectMode,
        isActive: () => activeSectionId != null,
    };
}

