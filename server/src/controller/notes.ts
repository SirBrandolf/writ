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
        const note = await noteService.createNote(req.body);
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
        const notes = await noteService.getAllNotes();
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
        const note = await noteService.getNoteById(parseInt(req.params.id, 10));
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
        const note = await noteService.updateNote(parseInt(req.params.id, 10), req.body);
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

export const deleteNote = async (
    req: Request<{ id: string }, { message: string } | JsonError, Record<string, never>>,
    res: Response<{ message: string } | JsonError>,
): Promise<void> => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
            res.status(400).json({ error: 'Invalid note id' });
            return;
        }
        const deleted = await noteService.deleteNote(id);
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
    deleteNote,
};
