import { Request, Response } from 'express';
import { noteService } from '../services/notes';
import { NoteCreateBody } from '../types';

export const noteController = {
    async createNote(req: Request<{}, any, NoteCreateBody>, res: Response) {
        try {
        const note = await noteService.createNote(req.body);
        res.status(201).json(note);
        } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create note' });
        }
    },

    async getAllNotes(_req: Request, res: Response) {
        try {
        const notes = await noteService.getAllNotes();
        res.json(notes);
        } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch notes' });
        }
    },

    async getNoteById(req: Request<{ id: string }>, res: Response) {
        try {
        const id = parseInt(req.params.id, 10);
        const note = await noteService.getNoteById(id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json(note);
        } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch note' });
        }
    },

    async updateNote(req: Request<{ id: string }, any, Partial<NoteCreateBody>>, res: Response) {
        try {
        const id = parseInt(req.params.id, 10);
        const note = await noteService.updateNote(id, req.body);
        res.json(note);
        } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update note' });
        }
    },

    async deleteNote(req: Request<{ id: string }>, res: Response) {
        try {
        const id = parseInt(req.params.id, 10);
        await noteService.deleteNote(id);
        res.json({ message: 'Note deleted successfully' });
        } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete note' });
        }
    },
};
