/** Read/write note UI: toggles between markdown textarea + KaTeX preview (remark-math / rehype-katex). */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Note } from '../types/Note';
import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface OpenNoteProps {
  note: Note;
  onSave: (id: string, title: string, content: string) => Promise<void>;
  onBack: () => void;
}

const OpenNote = ({ note, onSave, onBack }: OpenNoteProps) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveInFlightRef = useRef(false);
  const titleRef = useRef(note.title);
  const contentRef = useRef(note.content);
  const hasChangesRef = useRef(false);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setHasChanges(false);
    hasChangesRef.current = false;
    titleRef.current = note.title;
    contentRef.current = note.content;
    setSaveStatus('idle');
    setSaveError(null);
  }, [note]);

  useEffect(() => {
    titleRef.current = title;
    contentRef.current = content;
    hasChangesRef.current = hasChanges;
  }, [title, content, hasChanges]);

  const saveCurrent = useCallback(async (): Promise<boolean> => {
    if (saveInFlightRef.current || !hasChangesRef.current) return true;
    saveInFlightRef.current = true;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      await onSave(note.id, titleRef.current, contentRef.current);
      setHasChanges(false);
      hasChangesRef.current = false;
      setSaveStatus('saved');
      return true;
    } catch {
      setSaveStatus('error');
      setSaveError('Autosave failed. Please try Save again.');
      return false;
    } finally {
      saveInFlightRef.current = false;
    }
  }, [note.id, onSave]);

  useEffect(() => {
    if (!isEditing || !hasChanges) return;
    const timeout = window.setTimeout(() => {
      void saveCurrent();
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [title, content, hasChanges, isEditing, saveCurrent]);

  useEffect(() => {
    return () => {
      if (hasChangesRef.current) {
        void saveCurrent();
      }
    };
  }, [saveCurrent]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
    setSaveStatus('idle');
    setSaveError(null);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
    setSaveStatus('idle');
    setSaveError(null);
  };

  const handleSave = async () => {
    const ok = await saveCurrent();
    if (ok) setIsEditing(false);
  };

  const handleBack = async () => {
    await saveCurrent();
    onBack();
  };

  const RenderedContent = ({ text }: { text: string }) => (
    <div className="prose prose-stone max-w-none">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {text || '*Click to start writing...*'}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 min-h-[56px] flex items-center justify-between">
          <button
            onClick={() => {
              void handleBack();
            }}
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors
                       flex items-center gap-2"
          >
            ← Back
          </button>

          <div className="h-8 min-w-[280px] flex items-center justify-end gap-3">
            {isEditing ? <span className="text-[11px] text-stone-300 font-mono">editing</span> : null}
            {saveStatus === 'saving' ? <span className="text-[11px] text-stone-400 font-mono">saving...</span> : null}
            {saveStatus === 'saved' && !hasChanges ? <span className="text-[11px] text-green-700 font-mono">saved</span> : null}
            {saveStatus === 'error' ? <span className="text-[11px] text-red-700 font-mono">save failed</span> : null}
            {hasChanges && (
              <button
                onClick={() => {
                  void handleSave();
                }}
                className="text-xs font-medium text-white bg-stone-800
                           px-4 py-1.5 hover:bg-stone-700 transition-colors tracking-wide"
              >
                Save
              </button>
            )}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs font-medium text-stone-500 border border-stone-300
                           px-4 py-1.5 hover:bg-stone-800 hover:text-white
                           hover:border-stone-800 transition-all duration-200 tracking-wide"
              >
                Edit
              </button>
            ) : (
              <span className="inline-block w-[74px]" aria-hidden />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div
          className="bg-white border border-stone-200 shadow-sm
                     min-h-[85vh] px-16 py-14"
          style={{
            maxWidth: '210mm',
            margin: '0 auto',
          }}
        >
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
            <h1
              onClick={() => setIsEditing(true)}
              className="text-center text-2xl font-semibold text-stone-800 tracking-wide pb-1 cursor-text"
            >
              {title || 'Untitled'}
            </h1>
          )}

          <div className="w-16 h-px bg-stone-200 mx-auto mt-4 mb-8" />
          {saveError ? <p className="mb-5 text-center text-xs text-red-700">{saveError}</p> : null}

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
              <RenderedContent text={content} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OpenNote;