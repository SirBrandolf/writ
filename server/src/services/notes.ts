import pool from '../config/db.js';
import { Note, NoteCreateBody } from '../types/index.js';

export const noteService = {
    async createNote(body: NoteCreateBody): Promise<Note> {
        const result = await pool.query<Note>(
            'INSERT INTO notes (formatted_content, title) VALUES($1, $2) RETURNING *',
            [body.formatted_content, body.title || null],
        );
        return result.rows[0];
    },

    async getAllNotes(): Promise<Note[]> {
        const result = await pool.query<Note>('SELECT * FROM notes ORDER BY created_at DESC');
        return result.rows;
    },

    async getNoteById(id: number): Promise<Note | null> {
        const result = await pool.query<Note>('SELECT * FROM notes WHERE note_id = $1', [id]);
        return result.rows[0] || null;
    },

    async updateNote(id: number, body: Partial<NoteCreateBody>): Promise<Note> {
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
        const query = `UPDATE notes SET ${updates.join(', ')} WHERE note_id = $${paramCount} RETURNING *`;
        const result = await pool.query<Note>(query, values);
        if (result.rows.length === 0) {
            throw new Error('Note not found');
        }
        return result.rows[0];
    },

    async deleteNote(id: number): Promise<void> {
        await pool.query('DELETE FROM notes WHERE note_id = $1', [id]);
    },
};
