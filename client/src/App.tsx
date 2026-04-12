import { useEffect, useState } from 'react';
import Notes from './Notes';
import OpenNote from './OpenNote';
import type { Note } from './types/Note';

/** Row shape returned by the Express + pg API (differs from client `Note`). */
type ApiNoteRow = {
   note_id: number;
   title?: string | null;
   formatted_content?: unknown;
   created_at: string;
   updated_at: string;
};

function formattedContentToString(fc: unknown): string {
   if (fc == null) return '';
   if (typeof fc === 'string') return fc;
   if (typeof fc === 'object' && !Array.isArray(fc) && fc !== null && 'markdown' in fc) {
      const m = (fc as { markdown?: unknown }).markdown;
      if (typeof m === 'string') return m;
   }
   if (typeof fc === 'object') return JSON.stringify(fc);
   return String(fc);
}

function fromApiNote(row: ApiNoteRow): Note {
   return {
      id: String(row.note_id),
      title: row.title ?? '',
      content: formattedContentToString(row.formatted_content),
      created_at: row.created_at,
      updated_at: row.updated_at,
   };
}

function toApiWriteBody(title: string, content: string): { title: string; formatted_content: { markdown: string } } {
   return {
      title,
      formatted_content: { markdown: content },
   };
}

/*
 * APP STATE MANAGEMENT
 * ====================
 * Right now this uses local state with dummy data so you can see how the UI works.
 *
 * Once your backend team has the Express API ready, you'll replace the
 * dummy data and the handler functions with fetch() calls like:
 *
 *   // Fetch all notes
 *   const res = await fetch('/notes');
 *   const data = await res.json();
 *   setNotes(data);
 *
 *   // Create a note (new)
 *   const res = await fetch('/notes', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ title: 'New Note', content: '', userId: '...' })
 *   });
 *
 *   // Update a note (save)
 *   await fetch(`/notes/${id}`, {
 *     method: 'PUT',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ title, content })
 *   });
 *
 *   // Delete a note
 *   await fetch(`/notes/${id}`, { method: 'DELETE' });
 */

// Dummy data so you can see the UI right away
// const DUMMY_NOTES: Note[] = [
//   {
//     id: '1',
//     title: 'Linear Algebra — Eigenvalues',
//     content:
//       'Given a matrix $A$, we find eigenvalues by solving $\\det(A - \\lambda I) = 0$.\n\nFor a 2x2 matrix:\n$$\\det \\begin{pmatrix} a - \\lambda & b \\\\ c & d - \\lambda \\end{pmatrix} = 0$$\n\nThis gives us the characteristic polynomial.',
//     created_at: '2026-02-20T10:00:00Z',
//     updated_at: '2026-02-28T14:30:00Z',
//   },
//   {
//     id: '2',
//     title: 'Real Analysis — Continuity',
//     content:
//       'A function $f: \\mathbb{R} \\to \\mathbb{R}$ is continuous at $a$ if:\n$$\\forall \\epsilon > 0, \\exists \\delta > 0 : |x - a| < \\delta \\implies |f(x) - f(a)| < \\epsilon$$\n\nKey theorems:\n- Intermediate Value Theorem\n- Extreme Value Theorem',
//     created_at: '2026-02-18T09:00:00Z',
//     updated_at: '2026-02-27T11:15:00Z',
//   },
//   {
//     id: '3',
//     title: 'LSE100 Policy Proposal Notes',
//     content:
//       'Working on the AI Education Affordability Standard proposal for UNESCO.\n\nKey points:\n- Income-adjusted pricing for educational AI tools\n- Binding standards, not voluntary guidelines\n- Need data on current pricing disparities across countries',
//     created_at: '2026-02-15T16:00:00Z',
//     updated_at: '2026-02-26T10:00:00Z',
//   },
//   {
//     id: '4',
//     title: 'Probability — Bayes Theorem',
//     content:
//       "Bayes' theorem:\n$$P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}$$\n\nUseful for updating beliefs given new evidence. Prior $P(A)$ gets updated to posterior $P(A|B)$ after observing $B$.",
//     created_at: '2026-02-10T13:00:00Z',
//     updated_at: '2026-02-25T09:45:00Z',
//   },
// ];

function App() {
   const [notes, setNotes] = useState<Note[]>([]);
   const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
   const [listError, setListError] = useState<string | null>(null);

   useEffect(() => {
      setListError(null);
      fetch('/notes')
         .then(async (res) => {
            const data: unknown = await res.json();
            if (!res.ok) {
               const msg =
                  data &&
                  typeof data === 'object' &&
                  'error' in data &&
                  typeof (data as { error: unknown }).error === 'string'
                     ? (data as { error: string }).error
                     : 'Failed to load notes';
               throw new Error(msg);
            }
            if (!Array.isArray(data)) {
               throw new Error('Invalid response from server');
            }
            return (data as ApiNoteRow[]).map(fromApiNote);
         })
         .then(setNotes)
         .catch((err: unknown) => {
            setNotes([]);
            setListError(err instanceof Error ? err.message : 'Failed to load notes');
         });
   }, []);

   // Find the note being edited
   const activeNote = notes.find((n) => n.id === activeNoteId);

   // --- Handlers (replace with API calls once backend is ready) ---

   const handleNewNote = async () => {
      const res = await fetch('/notes', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(toApiWriteBody('', '')),
      });
      const payload: unknown = await res.json();
      if (!res.ok) {
         console.error('Create note failed:', payload);
         return;
      }
      const clientNote = fromApiNote(payload as ApiNoteRow);
      setNotes([clientNote, ...notes]);
      setActiveNoteId(clientNote.id);
   };

   const handleSave = async (id: string, title: string, content: string) => {
      const res = await fetch(`/notes/${id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(toApiWriteBody(title, content)),
      });
      const payload: unknown = await res.json();
      if (!res.ok) {
         console.error('Save note failed:', payload);
         return;
      }
      const updated = fromApiNote(payload as ApiNoteRow);
      setNotes(notes.map((n) => (n.id === id ? updated : n)));
   };

   const handleDelete = async (id: string) => {
      await fetch(`/notes/${id}`, { method: 'DELETE' });
      setNotes(notes.filter((n) => n.id !== id));
      if (activeNoteId === id) setActiveNoteId(null);
   };

   // --- Render ---

   // If a note is selected, show the editor
   if (activeNote) {
      return (
         <OpenNote
            note={activeNote}
            onSave={handleSave}
            onBack={() => setActiveNoteId(null)}
         />
      );
   }

   // Otherwise show the notes list
   return (
      <Notes
         notes={notes}
         listError={listError}
         onNoteClick={(id) => setActiveNoteId(id)}
         onNewNote={handleNewNote}
         onDeleteNote={handleDelete}
      />
   );
}

export default App;