import type { Note } from './types/Note';

interface NoteCardProps {
  note: Note;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
}

const NoteCard = ({ note, onClick, onDelete }: NoteCardProps) => {
   const formatDate = (dateString: string) => {
     const date = new Date(dateString);
     return date.toLocaleDateString('en-GB', {
       day: 'numeric',
       month: 'short',
       year: 'numeric',
     });
   };
 
   // Strip LaTeX and markdown for preview
   const getPreview = (content: string) => {
     return content
       .replace(/\$\$[\s\S]*?\$\$/g, '[equation]')  // block LaTeX
       .replace(/\$[^$]*\$/g, '[math]')               // inline LaTeX
       .replace(/#{1,6}\s/g, '')                       // headers
       .replace(/[*_]{1,2}(.*?)[*_]{1,2}/g, '$1')     // bold/italic
       .slice(0, 120);
   };
 
   return (
     <div
       onClick={() => onClick(note.id)}
       className="group relative w-full border border-stone-200 bg-white
                  px-6 py-4 cursor-pointer transition-all duration-200
                  hover:border-stone-400 hover:shadow-sm"
     >
       <div className="flex items-center justify-between gap-4">
         {/* Left side: title + preview */}
         <div className="min-w-0 flex-1">
           <h3 className="text-sm font-semibold text-stone-800 tracking-wide truncate">
             {note.title || 'Untitled'}
           </h3>
           <p className="mt-1 text-xs text-stone-400 truncate leading-relaxed">
             {getPreview(note.content) || 'Empty note'}
           </p>
         </div>
 
         {/* Right side: date + delete */}
         <div className="flex items-center gap-3 shrink-0">
           <span className="text-[11px] text-stone-300 font-mono">
             {formatDate(note.updated_at)}
           </span>
           <button
             onClick={(e) => {
               e.stopPropagation();
               onDelete(note.id);
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
 
 
 