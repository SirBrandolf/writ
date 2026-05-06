/** Maps HTTP verbs on /api/notes to controller handlers (mounted at /api/notes in index). */
import { Router } from 'express';
import { noteController } from '../controller/notes.js';

const router = Router();

router.post('/', noteController.createNote);
router.get('/', noteController.getAllNotes);
/** Purge all notes for the signed-in user; must be registered before "/:id" so DELETE "/" matches. */
router.delete('/', noteController.deleteAllNotesForUser);
router.get('/:id', noteController.getNoteById);
router.put('/:id', noteController.updateNote);
router.delete('/:id', noteController.deleteNote);

export default router;
