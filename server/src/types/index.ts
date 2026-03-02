export interface Note {
    note_id: number;
    formatted_content: unknown;
    title?: string;
    created_at: Date;
    updated_at: Date;
}

export interface NoteCreateBody {
    formatted_content: unknown;
    title?: string;
}
