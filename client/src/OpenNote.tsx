import { useState, useEffect } from 'react';
import type { Note } from './types/Note';

/*
 * LATEX RENDERING SETUP
 * =====================
 * To get LaTeX working, your team needs to install these packages:
 *
 *   npm install react-markdown remark-math rehype-katex
 *   npm install katex
 *
 * Then uncomment the imports and the RenderedContent component below,
 * and comment out the PlainRenderedContent component.
 *
 * You also need to import the KaTeX CSS in your main.tsx:
 *   import 'katex/dist/katex.min.css';
 *
 * After that, you can write LaTeX in notes like:
 *   Inline math: $x^2 + y^2 = z^2$
 *   Display math:
 *   $$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$
 */

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface OpenNoteProps {
  note: Note;
  onSave: (id: string, title: string, content: string) => void;
  onBack: () => void;
}

const OpenNote = ({ note, onSave, onBack }: OpenNoteProps) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setHasChanges(false);
  }, [note]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(note.id, title, content);
    setHasChanges(false);
    setIsEditing(false);
  };

  // --- PLAIN TEXT RENDERER (use this until LaTeX packages are installed) ---
//   const PlainRenderedContent = ({ text }: { text: string }) => (
//     <div className="prose prose-stone max-w-none whitespace-pre-wrap leading-relaxed text-stone-700">
//       {text || <span className="text-stone-300 italic">Click to start writing...</span>}
//     </div>
//   );

  const RenderedContent = ({ text }: { text: string }) => (
    <div className="prose prose-stone max-w-none">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {text || '*Click to start writing...*'}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors
                       flex items-center gap-2"
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            {isEditing && (
              <span className="text-[11px] text-stone-300 font-mono">editing</span>
            )}
            {hasChanges && (
              <button
                onClick={handleSave}
                className="text-xs font-medium text-white bg-stone-800
                           px-4 py-1.5 hover:bg-stone-700 transition-colors tracking-wide"
              >
                Save
              </button>
            )}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs font-medium text-stone-500 border border-stone-300
                           px-4 py-1.5 hover:bg-stone-800 hover:text-white
                           hover:border-stone-800 transition-all duration-200 tracking-wide"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </header>

      {/* A4 Paper */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div
          className="bg-white border border-stone-200 shadow-sm
                     min-h-[85vh] px-16 py-14"
          style={{
            /* A4-ish proportions */
            maxWidth: '210mm',
            margin: '0 auto',
          }}
        >
          {/* Title */}
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Untitled"
              className="w-full text-center text-2xl font-semibold text-stone-800
                         border-none outline-none bg-transparent placeholder:text-stone-300
                         tracking-wide pb-1"
              autoFocus
            />
          ) : (
            <h1 className="text-center text-2xl font-semibold text-stone-800 tracking-wide pb-1">
              {title || 'Untitled'}
            </h1>
          )}

          {/* Subtle divider */}
          <div className="w-16 h-px bg-stone-200 mx-auto mt-4 mb-8" />

          {/* Content */}
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start writing... (use $...$ for inline LaTeX, $$...$$ for display LaTeX)"
              className="w-full min-h-[60vh] text-sm text-stone-700 leading-relaxed
                         border-none outline-none bg-transparent resize-none
                         placeholder:text-stone-300 font-mono"
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className="min-h-[60vh] cursor-text"
            >
              {/* Swap PlainRenderedContent with RenderedContent once LaTeX packages are installed */}
              <RenderedContent text={content} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OpenNote;