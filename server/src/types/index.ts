/** Row shape returned by pg for table notes (timestamps may deserialize as strings in JSON responses). */
export interface Note {
    note_id: number;
    user_id: string;
    formatted_content: unknown;
    title?: string;
    created_at: Date;
    updated_at: Date;
}

/** Request body for create/update when formatted_content is JSON (e.g. `{ markdown: string }`). */
export interface NoteCreateBody {
    formatted_content: unknown;
    title?: string;
}

export interface AuthUser {
    uid: string;
}
