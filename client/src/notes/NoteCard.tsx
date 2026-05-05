/** Single row in the notes list: preview strip, updated date, delete affordance (opens confirm in parent). */
import type { Note } from '../types/Note';

interface NoteCardProps {
  note: Note;
  onClick: (note: Note) => void;
  onRequestDelete: (note: Note) => void;
}

const NoteCard = ({ note, onClick, onRequestDelete }: NoteCardProps) => {
   const formatDate = (dateString: string) => {
     const date = new Date(dateString);
     return date.toLocaleDateString('en-GB', {
       day: 'numeric',
       month: 'short',
       year: 'numeric',
     });
   };
 
   const getPreview = (content: string) => {
     /* Strip markdown/LaTeX noise so the list snippet stays short and readable. */
     return content
       .replace(/\$\$[\s\S]*?\$\$/g, '[equation]')
       .replace(/\$[^$]*\$/g, '[math]')
       .replace(/#{1,6}\s/g, '')
       .replace(/[*_]{1,2}(.*?)[*_]{1,2}/g, '$1')
       .slice(0, 120);
   };
 
   return (
     <div
       onClick={() => onClick(note)}
       className="group relative w-full border border-stone-200 bg-white
                  px-6 py-4 cursor-pointer transition-all duration-200
                  hover:border-stone-400 hover:shadow-sm"
     >
       <div className="flex items-center justify-between gap-4">
         <div className="min-w-0 flex-1">
           <h3 className="text-sm font-semibold text-stone-800 tracking-wide truncate">
             {note.title || 'Untitled'}
           </h3>
           <p className="mt-1 text-xs text-stone-400 truncate leading-relaxed">
             {getPreview(note.content) || 'Empty note'}
           </p>
         </div>
 
         <div className="flex items-center gap-3 shrink-0">
           <span className="text-[11px] text-stone-300 font-mono">
             {formatDate(note.updated_at)}
           </span>
           <button
             onClick={(e) => {
               e.stopPropagation();
               onRequestDelete(note);
             }}
             className="opacity-0 group-hover:opacity-100 transition-opacity
                        text-stone-300 hover:text-red-400 text-xs px-1"
             title="Delete note"
           >
             ✕
           </button>
         </div>
       </div>
     </div>
   );
 };

 export default NoteCard;
