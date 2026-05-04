import { useState } from 'react';
import { Link } from 'react-router-dom';
import NoteCard from './NoteCard';
import type { Note } from './types/Note';

interface NotesProps {
  notes: Note[];
  listError?: string | null;
  listLoading?: boolean;
  onNoteClick: (note: Note) => void;
  onNewNote: () => void;
  onDeleteNote: (id: string) => void;
}

const Notes = ({ notes, listError, listLoading, onNoteClick, onNewNote, onDeleteNote }: NotesProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const q = searchQuery.toLowerCase();
  const filteredNotes = notes.filter((note) => {
    const title = (note.title ?? '').toLowerCase();
    const content = (note.content ?? '').toLowerCase();
    return title.includes(q) || content.includes(q);
  });

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link
            to="/"
            className="text-lg font-bold text-stone-800 tracking-[0.2em] uppercase hover:text-stone-600 transition-colors"
          >
            Writ
          </Link>
          <button
            onClick={onNewNote}
            className="text-xs font-medium text-stone-500 border border-stone-300
                       px-4 py-2 hover:bg-stone-800 hover:text-white hover:border-stone-800
                       transition-all duration-200 tracking-wide"
          >
            + New Note
          </button>
        </div>
      </header>

      {listError ? (
        <div className="max-w-3xl mx-auto px-6 pt-4">
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded">
            {listError}
          </p>
        </div>
      ) : null}

      {/* Search */}
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

      {/* Notes List */}
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
                onDelete={onDeleteNote}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notes;