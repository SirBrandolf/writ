/** Postgres queries for notes; formatted_content is stored as JSON-compatible values. */
import pool from '../config/db.js';
import { Note, NoteCreateBody } from '../types/index.js';

export const noteService = {
    async createNote(uid: string, body: NoteCreateBody): Promise<Note> {
        const result = await pool.query<Note>(
            'INSERT INTO notes (user_id, formatted_content, title) VALUES($1, $2, $3) RETURNING *',
            [uid, body.formatted_content, body.title || null],
        );
        return result.rows[0];
    },

    async getAllNotes(uid: string): Promise<Note[]> {
        const result = await pool.query<Note>('SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC', [uid]);
        return result.rows;
    },

    async getNoteById(uid: string, id: number): Promise<Note | null> {
        const result = await pool.query<Note>('SELECT * FROM notes WHERE note_id = $1 AND user_id = $2', [id, uid]);
        return result.rows[0] || null;
    },

    /** Partial update: only supplied columns are written; no-op bodies throw before touching SQL. */
    async updateNote(uid: string, id: number, body: Partial<NoteCreateBody>): Promise<Note> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramCount = 1;

        if (body.formatted_content !== undefined) {
            updates.push(`formatted_content = $${paramCount++}`);
            values.push(body.formatted_content);
        }
        if (body.title !== undefined) {
            updates.push(`title = $${paramCount++}`);
            values.push(body.title);
        }

        if (updates.length === 0) {
            throw new Error('At least one of "title" or "formatted_content" is required');
        }

        values.push(id);
        values.push(uid);
        const query = `UPDATE notes SET ${updates.join(', ')} WHERE note_id = $${paramCount} AND user_id = $${
            paramCount + 1
        } RETURNING *`;
        const result = await pool.query<Note>(query, values);
        if (result.rows.length === 0) {
            throw new Error('Note not found');
        }
        return result.rows[0];
    },

    async deleteNote(uid: string, id: number): Promise<boolean> {
        const result = await pool.query('DELETE FROM notes WHERE note_id = $1 AND user_id = $2', [id, uid]);
        return (result.rowCount ?? 0) > 0;
    },

    /** Removes every note owned by uid (account teardown before Firebase user deletion). */
    async deleteAllNotesForUser(uid: string): Promise<number> {
        const result = await pool.query('DELETE FROM notes WHERE user_id = $1', [uid]);
        return result.rowCount ?? 0;
    },
};
