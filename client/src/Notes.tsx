import { useState } from 'react';
import NoteCard from './NoteCard';
import type { Note } from './types/Note';

interface NotesProps {
  notes: Note[];
  onNoteClick: (id: string) => void;
  onNewNote: () => void;
  onDeleteNote: (id: string) => void;
}

const Notes = ({ notes, onNoteClick, onNewNote, onDeleteNote }: NotesProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-lg font-bold text-stone-800 tracking-[0.2em] uppercase">
            Writ
          </h1>
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
        {filteredNotes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-300 text-sm">
              {notes.length === 0
                ? 'No notes yet. Create your first one.'
                : 'No notes match your search.'}
            </p>
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