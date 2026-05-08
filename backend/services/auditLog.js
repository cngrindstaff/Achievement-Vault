// backend/services/auditLog.js — append-only audit trail via InsertAuditLog SP.
import db from '../config/mysqlConnector.js';

/** JSON-style quoting for safe, readable messages (escapes quotes in names). */
export function q(text) {
    return JSON.stringify(text == null ? '' : String(text));
}

export async function insertAuditLogSafe(row) {
    const { changeDescription, gameId, sectionGroupId, sectionId, recordId } = row;
    if (changeDescription == null || String(changeDescription).trim() === '') return;
    try {
        await db.query('CALL InsertAuditLog(?, ?, ?, ?, ?)', [
            changeDescription,
            gameId ?? null,
            sectionGroupId ?? null,
            sectionId ?? null,
            recordId ?? null,
        ]);
    } catch (err) {
        console.error('[AuditLog] insert failed:', err.message);
    }
}

export async function withConnection(fn) {
    const conn = await db.getConnection();
    try {
        return await fn(conn);
    } finally {
        conn.release();
    }
}

async function callFirstRow(proc, params) {
    const [rows] = await db.query(proc, params);
    const set = rows[0];
    return Array.isArray(set) && set.length ? set[0] : null;
}

export async function fetchSectionById(sectionId) {
    if (sectionId == null || sectionId === '') return null;
    return callFirstRow('CALL GetSectionById(?)', [sectionId]);
}

export async function fetchSectionGroupById(sectionGroupId) {
    if (sectionGroupId == null || sectionGroupId === '') return null;
    return callFirstRow('CALL GetSectionGroupById(?)', [sectionGroupId]);
}

export async function fetchRecordById(recordId) {
    if (recordId == null || recordId === '') return null;
    return callFirstRow('CALL GetGameRecordByRecordID(?)', [recordId]);
}

/** @returns {{ gameId: number|null, sectionGroupId: number|null, sectionId: number|null }} */
export async function contextFromRecordRow(rec) {
    if (!rec) return { gameId: null, sectionGroupId: null, sectionId: null };
    const sectionId = rec.SectionID ?? rec.SectionId ?? null;
    const gameId = rec.GameID != null ? Number(rec.GameID) : null;
    let sectionGroupId = null;
    if (sectionId != null) {
        const sec = await fetchSectionById(sectionId);
        if (sec && sec.SectionGroupID != null) sectionGroupId = Number(sec.SectionGroupID);
    }
    return {
        gameId,
        sectionGroupId,
        sectionId: sectionId != null ? Number(sectionId) : null,
    };
}

export function coalesceUpdate(bodyVal, previous) {
    if (bodyVal === undefined) return previous;
    return bodyVal;
}

/**
 * @param {object} oldRow - GameRecords row
 * @param {object} body - request body
 */
export function describeGameRecordUpdate(oldRow, body) {
    const id = oldRow.ID;
    const parts = [];
    const nameNew = coalesceUpdate(body.recordName, oldRow.Name);
    if (String(nameNew ?? '') !== String(oldRow.Name ?? '')) {
        parts.push(`RecordID ${id} was renamed from ${q(oldRow.Name)} to ${q(nameNew)}`);
    }
    const descNew = coalesceUpdate(body.description, oldRow.Description);
    if (String(descNew ?? '') !== String(oldRow.Description ?? '')) {
        parts.push(`RecordID ${id} description was updated`);
    }
    const longNew = coalesceUpdate(body.longDescription, oldRow.LongDescription);
    if (String(longNew ?? '') !== String(oldRow.LongDescription ?? '')) {
        parts.push(`RecordID ${id} long description was updated`);
    }
    const hidNew = coalesceUpdate(body.hidden, oldRow.Hidden);
    if (Number(hidNew) !== Number(oldRow.Hidden)) {
        parts.push(`RecordID ${id} hidden flag changed from ${oldRow.Hidden} to ${hidNew}`);
    }
    const ncbNew = coalesceUpdate(body.numberOfCheckboxes, oldRow.NumberOfCheckboxes);
    if (Number(ncbNew) !== Number(oldRow.NumberOfCheckboxes)) {
        parts.push(`RecordID ${id} number of checkboxes changed from ${oldRow.NumberOfCheckboxes} to ${ncbNew}`);
    }
    const nacNew = coalesceUpdate(body.numberAlreadyCompleted, oldRow.NumberAlreadyCompleted);
    if (Number(nacNew) !== Number(oldRow.NumberAlreadyCompleted)) {
        parts.push(
            `RecordID ${id} completion count changed from ${oldRow.NumberAlreadyCompleted} to ${nacNew}`
        );
    }
    const loNew = coalesceUpdate(body.listOrder, oldRow.ListOrder);
    if (Number(loNew) !== Number(oldRow.ListOrder)) {
        parts.push(`RecordID ${id} list order changed from ${oldRow.ListOrder} to ${loNew}`);
    }
    const secNew = coalesceUpdate(body.sectionId, oldRow.SectionID ?? oldRow.SectionId);
    const oldSec = oldRow.SectionID ?? oldRow.SectionId;
    if (Number(secNew) !== Number(oldSec)) {
        parts.push(`RecordID ${id} was moved from SectionID ${oldSec} to SectionID ${secNew}`);
    }
    const gNew = coalesceUpdate(body.gameId, oldRow.GameID);
    if (Number(gNew) !== Number(oldRow.GameID)) {
        parts.push(`RecordID ${id} GameID changed from ${oldRow.GameID} to ${gNew}`);
    }
    return parts.length ? parts.join('; ') : null;
}

export function describeRecordCompletionChange(recordId, oldRow, newCount) {
    const id = recordId;
    const oldC = Number(oldRow.NumberAlreadyCompleted) || 0;
    const newC = Number(newCount) || 0;
    const total = Number(oldRow.NumberOfCheckboxes) || 0;
    if (oldC === newC) return null;
    if (total <= 1) {
        if (newC >= 1 && oldC < 1) return `RecordID ${id} was checked`;
        if (newC < 1 && oldC >= 1) return `RecordID ${id} was unchecked`;
    }
    return `RecordID ${id} checkbox progress changed from ${oldC} to ${newC}` +
        (total > 0 ? ` (of ${total})` : '');
}

export function describeSectionUpdate(oldRow, body) {
    const id = oldRow.ID;
    const parts = [];
    const nameNew = coalesceUpdate(body.sectionName, oldRow.Name);
    if (String(nameNew ?? '') !== String(oldRow.Name ?? '')) {
        parts.push(`SectionID ${id} was renamed from ${q(oldRow.Name)} to ${q(nameNew)}`);
    }
    const loNew = coalesceUpdate(body.listOrder, oldRow.ListOrder);
    if (body.listOrder !== undefined && Number(loNew) !== Number(oldRow.ListOrder)) {
        parts.push(`SectionID ${id} list order changed from ${oldRow.ListOrder} to ${loNew}`);
    }
    const roNew = coalesceUpdate(body.recordOrderPreference, oldRow.RecordOrderPreference);
    if (
        body.recordOrderPreference !== undefined &&
        String(roNew ?? '') !== String(oldRow.RecordOrderPreference ?? '')
    ) {
        parts.push(`SectionID ${id} record order preference changed from ${q(oldRow.RecordOrderPreference)} to ${q(roNew)}`);
    }
    const hidNew = coalesceUpdate(body.hidden, oldRow.Hidden);
    if (body.hidden !== undefined && Number(hidNew) !== Number(oldRow.Hidden)) {
        parts.push(`SectionID ${id} hidden flag changed from ${oldRow.Hidden} to ${hidNew}`);
    }
    const descNew = coalesceUpdate(body.description, oldRow.Description);
    if (body.description !== undefined && String(descNew ?? '') !== String(oldRow.Description ?? '')) {
        parts.push(`SectionID ${id} description was updated`);
    }
    return parts.length ? parts.join('; ') : null;
}

export function describeSectionGroupUpdate(oldRow, body) {
    const id = oldRow.ID;
    const parts = [];
    const nameNew = coalesceUpdate(body.sectionGroupName, oldRow.Name);
    if (String(nameNew ?? '') !== String(oldRow.Name ?? '')) {
        parts.push(`SectionGroupID ${id} slug was changed from ${q(oldRow.Name)} to ${q(nameNew)}`);
    }
    const fnNew = coalesceUpdate(body.sectionGroupFriendlyName, oldRow.FriendlyName);
    if (String(fnNew ?? '') !== String(oldRow.FriendlyName ?? '')) {
        parts.push(
            `SectionGroupID ${id} friendly name was changed from ${q(oldRow.FriendlyName)} to ${q(fnNew)}`
        );
    }
    const loNew = coalesceUpdate(body.listOrder, oldRow.ListOrder);
    if (Number(loNew) !== Number(oldRow.ListOrder)) {
        parts.push(`SectionGroupID ${id} list order changed from ${oldRow.ListOrder} to ${loNew}`);
    }
    const descNew = coalesceUpdate(body.description, oldRow.Description);
    if (body.description !== undefined && String(descNew ?? '') !== String(oldRow.Description ?? '')) {
        parts.push(`SectionGroupID ${id} description was updated`);
    }
    return parts.length ? parts.join('; ') : null;
}
