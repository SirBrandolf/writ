/**
 * Notes area: loads OpenNote lazily, talks to Express at NOTES_API, and routes /notes/:slug/:id deep links.
 */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import Notes from './Notes';
import type { Note } from '../types/Note';
import { auth } from '../auth/firebase';

/** Markdown editor chunk loaded only when viewing a single note. */
const OpenNote = lazy(() => import('./OpenNote'));

const editorFallback = (
   <div className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-stone-500">
      Loading…
   </div>
);

/** One row from GET/POST/PUT /api/notes; DB uses note_id and formatted_content (often { markdown }). */
type ApiNoteRow = {
   note_id: number;
   title?: string | null;
   formatted_content?: unknown;
   created_at: string;
   updated_at: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/** Collection URL on Express; kept under /api so Vite never proxies browser navigations under /notes/*. */
const NOTES_API = '/api/notes';

/** Absolute or root-relative URL for API paths (empty API_BASE_URL ⇒ same origin + Vite proxy in dev). */
function apiUrl(path: string): string {
   return `${API_BASE_URL}${path}`;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
   const user = auth?.currentUser ?? null;
   if (!user) {
      throw new Error('No authenticated user');
   }
   const token = await user.getIdToken();
   return { Authorization: `Bearer ${token}` };
}

/** Shown when GET /api/notes/:id returns 404 (deleted or invalid deep link). */
function NoteNotFound({ onBack }: { onBack: () => void }) {
   return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6">
         <p className="text-sm font-medium text-stone-800 tracking-wide uppercase">Note does not exist</p>
         <p className="mt-3 text-sm text-stone-600 text-center max-w-sm leading-relaxed">
            This note may have been deleted or the link may be wrong. You won&apos;t be able to recover it from here.
         </p>
         <button
            type="button"
            onClick={onBack}
            className="mt-8 text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                       hover:bg-stone-800 hover:text-white hover:border-stone-800
                       transition-all duration-200 tracking-wide"
         >
            Back to notes
         </button>
      </div>
   );
}

/** Non-404 failure loading a single note (network or 5xx). */
function NoteFetchError({ onBack }: { onBack: () => void }) {
   return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6">
         <p className="text-sm font-medium text-stone-800 tracking-wide uppercase">Could not load note</p>
         <p className="mt-3 text-sm text-stone-600 text-center max-w-sm leading-relaxed">
            Something went wrong while loading this note. Try again from your notes list.
         </p>
         <button
            type="button"
            onClick={onBack}
            className="mt-8 text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                       hover:bg-stone-800 hover:text-white hover:border-stone-800
                       transition-all duration-200 tracking-wide"
         >
            Back to notes
         </button>
      </div>
   );
}

/** Derives the middle segment of /notes/:slug/:id for readable URLs; empty titles become `untitled`. */
function slugifyTitle(title: string): string {
   const raw = (title ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
   return raw || 'untitled';
}

/** Canonical client path for a note (slug is recomputed when the title changes). */
function notePath(note: Pick<Note, 'id' | 'title'>): string {
   return `/notes/${slugifyTitle(note.title)}/${note.id}`;
}

/** Converts DB formatted_content (string or { markdown }) into plain markdown for the editor. */
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

/** Maps API row → UI Note (string id, flattened markdown body). */
function fromApiNote(row: ApiNoteRow): Note {
   return {
      id: String(row.note_id),
      title: row.title ?? '',
      content: formattedContentToString(row.formatted_content),
      created_at: row.created_at,
      updated_at: row.updated_at,
   };
}

/** Body shape expected by POST/PUT handlers (markdown stored as JSON in formatted_content). */
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

/**
 * Deep-linked note view: after the list loads, fetches by id if missing, fixes slug from title, surfaces 404/errors.
 */
function NoteDetail({ notes, setNotes, listLoading, listLoaded, onSave }: NoteDetailProps) {
   const { slug, noteId } = useParams();
   const navigate = useNavigate();
   const [fetchingSingle, setFetchingSingle] = useState(false);
   const [singleFetchStatus, setSingleFetchStatus] = useState<'idle' | 'missing' | 'error'>('idle');
   const idValid = Boolean(noteId && /^\d+$/.test(noteId));
   const slugPresent = Boolean(slug && slug.length > 0);
   const activeNote = noteId ? notes.find((n) => n.id === noteId) : undefined;

   useEffect(() => {
      setSingleFetchStatus('idle');
   }, [noteId]);

   useEffect(() => {
      if (!idValid || !listLoaded) return;
      if (notes.some((n) => n.id === noteId)) return;

      let cancelled = false;
      setFetchingSingle(true);
      getAuthHeaders()
         .then((headers) =>
            fetch(apiUrl(`${NOTES_API}/${noteId}`), {
               headers,
            }),
         )
         .then(async (res) => {
            if (cancelled) return;
            if (res.status === 404) {
               setSingleFetchStatus('missing');
               return;
            }
            if (!res.ok) {
               setSingleFetchStatus('error');
               return;
            }
            const row: unknown = await res.json();
            const note = fromApiNote(row as ApiNoteRow);
            setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [note, ...prev]));
         })
         .catch(() => {
            if (!cancelled) setSingleFetchStatus('error');
         })
         .finally(() => {
            if (!cancelled) setFetchingSingle(false);
         });

      return () => {
         cancelled = true;
      };
   }, [idValid, listLoaded, noteId, setNotes, notes]);

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

   if (singleFetchStatus === 'missing') {
      return <NoteNotFound onBack={() => navigate('/notes')} />;
   }
   if (singleFetchStatus === 'error') {
      return <NoteFetchError onBack={() => navigate('/notes')} />;
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

/** Supports older links `/notes/:id` by resolving the note then redirecting to `/notes/:slug/:id`. */
function LegacyNoteIdRedirect({ setNotes }: { setNotes: React.Dispatch<React.SetStateAction<Note[]>> }) {
   const { noteId } = useParams();
   const navigate = useNavigate();
   const [status, setStatus] = useState<'pending' | 'missing' | 'error'>('pending');

   useEffect(() => {
      setStatus('pending');
      if (!noteId || !/^\d+$/.test(noteId)) {
         navigate('/notes', { replace: true });
         return;
      }

      let cancelled = false;
      getAuthHeaders()
         .then((headers) =>
            fetch(apiUrl(`${NOTES_API}/${noteId}`), {
               headers,
            }),
         )
         .then(async (res) => {
            if (cancelled) return;
            if (res.status === 404) {
               setStatus('missing');
               return;
            }
            if (!res.ok) {
               setStatus('error');
               return;
            }
            const row: unknown = await res.json();
            const note = fromApiNote(row as ApiNoteRow);
            setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [note, ...prev]));
            navigate(notePath(note), { replace: true });
         })
         .catch(() => {
            if (!cancelled) setStatus('error');
         });

      return () => {
         cancelled = true;
      };
   }, [noteId, navigate, setNotes]);

   if (status === 'missing') {
      return <NoteNotFound onBack={() => navigate('/notes')} />;
   }
   if (status === 'error') {
      return <NoteFetchError onBack={() => navigate('/notes')} />;
   }

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
      getAuthHeaders()
         .then((headers) =>
            fetch(apiUrl(NOTES_API), {
               headers,
            }),
         )
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
      const res = await fetch(apiUrl(NOTES_API), {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders()),
         },
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
      const res = await fetch(apiUrl(`${NOTES_API}/${id}`), {
         method: 'PUT',
         headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders()),
         },
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

   const handleDelete = useCallback(async (id: string): Promise<{ ok: true } | { ok: false; message: string }> => {
      const res = await fetch(apiUrl(`${NOTES_API}/${id}`), {
         method: 'DELETE',
         headers: await getAuthHeaders(),
      });

      let payload: unknown = null;
      try {
         payload = await res.json();
      } catch {
         /* DELETE may return an empty body; parsing failure still lets us branch on status. */
      }

      if (res.status === 404) {
         const message =
            payload &&
            typeof payload === 'object' &&
            'error' in payload &&
            typeof (payload as { error: unknown }).error === 'string'
               ? (payload as { error: string }).error
               : 'Note does not exist';
         setNotes((prev) => prev.filter((n) => n.id !== id));
         return { ok: false, message };
      }

      if (!res.ok) {
         let errorMessage = 'Delete note failed';
         if (
            payload &&
            typeof payload === 'object' &&
            'error' in payload &&
            typeof (payload as { error: unknown }).error === 'string'
         ) {
            errorMessage = (payload as { error: string }).error;
         }
         console.error(errorMessage);
         return { ok: false, message: errorMessage };
      }

      setNotes((prev) => prev.filter((n) => n.id !== id));
      return { ok: true };
   }, []);

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
