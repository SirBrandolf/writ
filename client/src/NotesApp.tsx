import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import Notes from './Notes';
import type { Note } from './types/Note';

const OpenNote = lazy(() => import('./OpenNote'));

const editorFallback = (
   <div className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-stone-500">
      Loading…
   </div>
);

/** Row shape returned by the Express + pg API (differs from client `Note`). */
type ApiNoteRow = {
   note_id: number;
   title?: string | null;
   formatted_content?: unknown;
   created_at: string;
   updated_at: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

function apiUrl(path: string): string {
   return `${API_BASE_URL}${path}`;
}

/** URL path segment from title; falls back to `untitled`. */
function slugifyTitle(title: string): string {
   const raw = (title ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
   return raw || 'untitled';
}

function notePath(note: Pick<Note, 'id' | 'title'>): string {
   return `/notes/${slugifyTitle(note.title)}/${note.id}`;
}

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

type NoteDetailProps = {
   notes: Note[];
   setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
   listLoading: boolean;
   listLoaded: boolean;
   onSave: (id: string, title: string, content: string) => Promise<void>;
};

function NoteDetail({ notes, setNotes, listLoading, listLoaded, onSave }: NoteDetailProps) {
   const { slug, noteId } = useParams();
   const navigate = useNavigate();
   const [fetchingSingle, setFetchingSingle] = useState(false);
   const idValid = Boolean(noteId && /^\d+$/.test(noteId));
   const slugPresent = Boolean(slug && slug.length > 0);
   const activeNote = noteId ? notes.find((n) => n.id === noteId) : undefined;

   useEffect(() => {
      if (!idValid || !listLoaded) return;
      if (notes.some((n) => n.id === noteId)) return;

      let cancelled = false;
      setFetchingSingle(true);
      fetch(apiUrl(`/notes/${noteId}`))
         .then(async (res) => {
            if (cancelled) return;
            if (res.status === 404) {
               navigate('/notes', { replace: true });
               return;
            }
            if (!res.ok) {
               navigate('/notes', { replace: true });
               return;
            }
            const row: unknown = await res.json();
            const note = fromApiNote(row as ApiNoteRow);
            setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [note, ...prev]));
         })
         .catch(() => {
            if (!cancelled) navigate('/notes', { replace: true });
         })
         .finally(() => {
            if (!cancelled) setFetchingSingle(false);
         });

      return () => {
         cancelled = true;
      };
   }, [idValid, listLoaded, noteId, navigate, setNotes, notes]);

   useEffect(() => {
      if (!idValid || !slugPresent || !activeNote || !noteId) return;
      const canonical = slugifyTitle(activeNote.title);
      if (slug !== canonical) {
         navigate(`/notes/${canonical}/${noteId}`, { replace: true });
      }
   }, [idValid, slugPresent, activeNote, slug, noteId, navigate]);

   if (!idValid || !slugPresent) {
      return <Navigate to="/notes" replace />;
   }

   if (listLoading || fetchingSingle || !activeNote) {
      return (
         <div className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-stone-500">
            Loading…
         </div>
      );
   }

   return (
      <Suspense fallback={editorFallback}>
         <OpenNote
            note={activeNote}
            onSave={onSave}
            onBack={() => navigate('/notes')}
         />
      </Suspense>
   );
}

function LegacyNoteIdRedirect({ setNotes }: { setNotes: React.Dispatch<React.SetStateAction<Note[]>> }) {
   const { noteId } = useParams();
   const navigate = useNavigate();

   useEffect(() => {
      if (!noteId || !/^\d+$/.test(noteId)) {
         navigate('/notes', { replace: true });
         return;
      }

      let cancelled = false;
      fetch(apiUrl(`/notes/${noteId}`))
         .then(async (res) => {
            if (cancelled) return;
            if (!res.ok) {
               navigate('/notes', { replace: true });
               return;
            }
            const row: unknown = await res.json();
            const note = fromApiNote(row as ApiNoteRow);
            setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [note, ...prev]));
            navigate(notePath(note), { replace: true });
         })
         .catch(() => {
            if (!cancelled) navigate('/notes', { replace: true });
         });

      return () => {
         cancelled = true;
      };
   }, [noteId, navigate, setNotes]);

   return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-stone-500">
         Loading…
      </div>
   );
}

export default function NotesApp() {
   const navigate = useNavigate();
   const [notes, setNotes] = useState<Note[]>([]);
   const [listError, setListError] = useState<string | null>(null);
   const [listLoading, setListLoading] = useState(true);
   const [listLoaded, setListLoaded] = useState(false);

   useEffect(() => {
      setListError(null);
      setListLoading(true);
      fetch(apiUrl('/notes'))
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
         })
         .finally(() => {
            setListLoading(false);
            setListLoaded(true);
         });
   }, []);

   const handleNewNote = useCallback(async () => {
      const res = await fetch(apiUrl('/notes'), {
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
      setNotes((prev) => [clientNote, ...prev]);
      navigate(notePath(clientNote));
   }, [navigate]);

   const handleSave = useCallback(async (id: string, title: string, content: string) => {
      const res = await fetch(apiUrl(`/notes/${id}`), {
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
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
   }, []);

   const handleDelete = useCallback(
      async (id: string) => {
         const res = await fetch(apiUrl(`/notes/${id}`), { method: 'DELETE' });
         if (!res.ok) {
            let errorMessage = 'Delete note failed';
            try {
               const payload: unknown = await res.json();
               if (
                  payload &&
                  typeof payload === 'object' &&
                  'error' in payload &&
                  typeof (payload as { error: unknown }).error === 'string'
               ) {
                  errorMessage = (payload as { error: string }).error;
               }
            } catch {
               // Ignore JSON parse errors and log default message.
            }
            console.error(errorMessage);
            return;
         }
         setNotes((prev) => prev.filter((n) => n.id !== id));
      },
      [],
   );

   return (
      <Routes>
         <Route
            index
            element={
               <Notes
                  notes={notes}
                  listError={listError}
                  listLoading={listLoading}
                  onNoteClick={(note) => navigate(notePath(note))}
                  onNewNote={handleNewNote}
                  onDeleteNote={handleDelete}
               />
            }
         />
         <Route
            path=":slug/:noteId"
            element={
               <NoteDetail
                  notes={notes}
                  setNotes={setNotes}
                  listLoading={listLoading}
                  listLoaded={listLoaded}
                  onSave={handleSave}
               />
            }
         />
         <Route path=":noteId" element={<LegacyNoteIdRedirect setNotes={setNotes} />} />
      </Routes>
   );
}
