/**
 * Notes index: search/filter list, delete confirmation modal, post-sign-up toast, and header actions.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthBar from '../auth/AuthBar';
import NoteCard from './NoteCard';
import type { Note } from '../types/Note';

type DeleteNoteResult = { ok: true } | { ok: false; message: string };

interface NotesProps {
  notes: Note[];
  listError?: string | null;
  listLoading?: boolean;
  onNoteClick: (note: Note) => void;
  onNewNote: () => void;
  onDeleteNote: (id: string) => Promise<DeleteNoteResult>;
}

type NotesLocationState = {
  accountCreated?: boolean;
};

const Notes = ({ notes, listError, listLoading, onNoteClick, onNewNote, onDeleteNote }: NotesProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const [deleteConfirmBusy, setDeleteConfirmBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAccountCreated, setShowAccountCreated] = useState(
    () => Boolean((location.state as NotesLocationState | null)?.accountCreated),
  );

  /** Clear sign-up flash state from history after first paint so reload does not reopen the dialog. */
  useEffect(() => {
    const created = (location.state as NotesLocationState | null)?.accountCreated;
    if (!created) return;
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: {} },
    );
  }, [location.state, location.pathname, location.search, location.hash, navigate]);

  const q = searchQuery.toLowerCase();
  const filteredNotes = notes.filter((note) => {
    const title = (note.title ?? '').toLowerCase();
    const content = (note.content ?? '').toLowerCase();
    return title.includes(q) || content.includes(q);
  });

  return (
    <div className="min-h-screen bg-stone-50">
      {showAccountCreated ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/35 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setShowAccountCreated(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-created-title"
            className="w-full max-w-sm border border-stone-200 bg-white px-6 py-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="account-created-title" className="text-sm font-medium text-stone-800 tracking-wide uppercase">
              Account created
            </h2>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">
              You&apos;re signed in. Start a note whenever you&apos;re ready.
            </p>
            <button
              type="button"
              onClick={() => setShowAccountCreated(false)}
              className="mt-6 text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                         hover:bg-stone-800 hover:text-white hover:border-stone-800
                         transition-all duration-200 tracking-wide"
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/35 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => {
            if (!deleteConfirmBusy) setPendingDelete(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-note-title"
            className="w-full max-w-sm border border-stone-200 bg-white px-6 py-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-note-title" className="text-sm font-medium text-stone-800 tracking-wide uppercase">
              Delete this note?
            </h2>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">
              This will permanently delete{' '}
              <span className="font-medium text-stone-800">
                {pendingDelete.title?.trim() ? `"${pendingDelete.title.trim()}"` : 'this note'}
              </span>
              . You won&apos;t be able to recover its contents.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={deleteConfirmBusy}
                onClick={() => setPendingDelete(null)}
                className="text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                           hover:bg-stone-100 transition-all duration-200 tracking-wide
                           disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmBusy}
                onClick={async () => {
                  setDeleteError(null);
                  setDeleteConfirmBusy(true);
                  try {
                    const result = await onDeleteNote(pendingDelete.id);
                    if (result.ok) {
                      setPendingDelete(null);
                    } else {
                      setDeleteError(result.message);
                      setPendingDelete(null);
                    }
                  } finally {
                    setDeleteConfirmBusy(false);
                  }
                }}
                className="text-xs font-medium text-white bg-red-700 border border-red-700 px-4 py-2
                           hover:bg-red-800 hover:border-red-800 transition-all duration-200 tracking-wide
                           disabled:opacity-50"
              >
                {deleteConfirmBusy ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="text-lg font-bold text-stone-800 tracking-[0.2em] uppercase hover:text-stone-600 transition-colors"
          >
            Writ
          </Link>
          <div className="flex items-center gap-4">
            <AuthBar />
            <button
              onClick={onNewNote}
              className="text-xs font-medium text-stone-500 border border-stone-300
                         px-4 py-2 hover:bg-stone-800 hover:text-white hover:border-stone-800
                         transition-all duration-200 tracking-wide"
            >
              + New Note
            </button>
          </div>
        </div>
      </header>

      {listError ? (
        <div className="max-w-3xl mx-auto px-6 pt-4">
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded">
            {listError}
          </p>
        </div>
      ) : null}

      {deleteError ? (
        <div className="max-w-3xl mx-auto px-6 pt-4">
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded">
            {deleteError}
          </p>
        </div>
      ) : null}

      <div className="max-w-3xl mx-auto px-6 pt-6">
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-b border-stone-200 pb-3
                     text-sm text-stone-600 placeholder:text-stone-300
                     focus:outline-none focus:border-stone-400 transition-colors"
        />
      </div>

      <main className="max-w-3xl mx-auto px-6 py-6">
        {listLoading && !listError ? (
          <div className="text-center py-20">
            <p className="text-stone-400 text-sm">Loading notes…</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-20">
            {!listError ? (
              <p className="text-stone-300 text-sm">
                {notes.length === 0
                  ? 'No notes yet. Create your first one.'
                  : 'No notes match your search.'}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-stone-100">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={onNoteClick}
                onRequestDelete={(n) => {
                  setDeleteError(null);
                  setPendingDelete(n);
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notes;