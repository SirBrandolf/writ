/** Thin HTTP adapters: validate ids, map service errors to status codes, JSON bodies. */
import { Request, Response } from 'express';
import { noteService } from '../services/notes.js';
import { Note, NoteCreateBody } from '../types/index.js';

type JsonError = { error: string };

export const createNote = async (
    req: Request<Record<string, never>, Note | JsonError, NoteCreateBody>,
    res: Response<Note | JsonError>,
): Promise<void> => {
    try {
        const uid = req.authUser?.uid;
        if (!uid) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const note = await noteService.createNote(uid, req.body);
        res.status(201).json(note);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create note' });
    }
};

export const getAllNotes = async (
    req: Request<Record<string, never>, Note[] | JsonError, Record<string, never>>,
    res: Response<Note[] | JsonError>,
): Promise<void> => {
    try {
        const uid = req.authUser?.uid;
        if (!uid) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const notes = await noteService.getAllNotes(uid);
        res.json(notes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
};

export const getNoteById = async (
    req: Request<{ id: string }, Note | JsonError, Record<string, never>>,
    res: Response<Note | JsonError>,
): Promise<void> => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
            res.status(400).json({ error: 'Invalid note id' });
            return;
        }
        const uid = req.authUser?.uid;
        if (!uid) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const note = await noteService.getNoteById(uid, id);
        if (!note) {
            res.status(404).json({ error: 'Note not found' });
            return;
        }
        res.json(note);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch note' });
    }
};

export const updateNote = async (
    req: Request<{ id: string }, Note | JsonError, Partial<NoteCreateBody>>,
    res: Response<Note | JsonError>,
): Promise<void> => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
            res.status(400).json({ error: 'Invalid note id' });
            return;
        }
        const uid = req.authUser?.uid;
        if (!uid) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const note = await noteService.updateNote(uid, id, req.body);
        res.json(note);
    } catch (err) {
        if (err instanceof Error && err.message === 'At least one of "title" or "formatted_content" is required') {
            res.status(400).json({ error: err.message });
            return;
        }
        if (err instanceof Error && err.message === 'Note not found') {
            res.status(404).json({ error: err.message });
            return;
        }
        console.error(err);
        res.status(500).json({ error: 'Failed to update note' });
    }
};

/** Deletes all notes for the authenticated user (used when deleting an account). */
export const deleteAllNotesForUser = async (
    req: Request<Record<string, never>, { deleted_count: number } | JsonError, Record<string, never>>,
    res: Response<{ deleted_count: number } | JsonError>,
): Promise<void> => {
    try {
        const uid = req.authUser?.uid;
        if (!uid) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const deleted_count = await noteService.deleteAllNotesForUser(uid);
        res.json({ deleted_count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete notes' });
    }
};

export const deleteNote = async (
    req: Request<{ id: string }, { message: string } | JsonError, Record<string, never>>,
    res: Response<{ message: string } | JsonError>,
): Promise<void> => {
    try {
        const uid = req.authUser?.uid;
        if (!uid) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
            res.status(400).json({ error: 'Invalid note id' });
            return;
        }
        const deleted = await noteService.deleteNote(uid, id);
        if (!deleted) {
            res.status(404).json({ error: 'Note does not exist' });
            return;
        }
        res.json({ message: 'Note deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
};


export const noteController = {
    createNote,
    getAllNotes,
    getNoteById,
    updateNote,
    deleteAllNotesForUser,
    deleteNote,
};
