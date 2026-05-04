import { Link } from 'react-router-dom';

export default function Home() {
   return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
         <header className="border-b border-stone-200 bg-white">
            <div className="max-w-3xl mx-auto px-6 py-6">
               <Link
                  to="/"
                  reloadDocument
                  className="inline-block text-lg font-bold text-stone-800 tracking-[0.2em] uppercase hover:text-stone-600 transition-colors"
               >
                  Writ
               </Link>
            </div>
         </header>

         <main className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full">
            <p className="text-sm text-stone-600 leading-relaxed max-w-xl">
               Writ is a minimal note-taking app for Markdown and math. Capture ideas, draft with clarity, and pick up
               where you left off.
            </p>
            <div className="mt-10">
               <Link
                  to="/notes"
                  className="inline-block text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                             hover:bg-stone-800 hover:text-white hover:border-stone-800
                             transition-all duration-200 tracking-wide"
               >
                  Open notes
               </Link>
            </div>
         </main>
      </div>
   );
}
