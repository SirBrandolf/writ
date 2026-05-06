/** Shown when VITE_FIREBASE_* were not set at build/dev time (see repo-root app.env + client vite.config). */
import { Link } from 'react-router-dom'

export default function FirebaseWebConfigMissing({ heading }: { heading: string }) {
   return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
         <header className="border-b border-stone-200 bg-white">
            <div className="max-w-3xl mx-auto px-6 py-6">
               <Link
                  to="/"
                  className="inline-block text-lg font-bold text-stone-800 tracking-[0.2em] uppercase hover:text-stone-600 transition-colors"
               >
                  Writ
               </Link>
            </div>
         </header>
         <main className="flex-1 max-w-lg mx-auto px-6 py-12 w-full">
            <h1 className="text-sm font-medium text-stone-800 tracking-wide uppercase">{heading}</h1>
            <p className="mt-4 text-sm text-stone-600 leading-relaxed">
               Firebase web configuration is missing (empty build-time <code className="text-stone-800">VITE_FIREBASE_*</code>{' '}
               variables). The app cannot load authentication until those keys are baked into the client bundle.
            </p>
            <p className="mt-4 text-sm text-stone-600 leading-relaxed">
               Add the Firebase web keys to repo-root <code className="text-stone-800">app.env</code> using the same{' '}
               <code className="text-stone-800">FIREBASE_*</code> names as in your Firebase console (see{' '}
               <code className="text-stone-800">client/vite.config.ts</code>), then restart{' '}
               <code className="text-stone-800">npm run dev</code> or run <code className="text-stone-800">npm run build</code>{' '}
               again for production.
            </p>
            <p className="mt-4">
               <Link to="/" className="text-xs font-medium text-stone-500 underline underline-offset-2 hover:text-stone-800">
                  Back home
               </Link>
            </p>
         </main>
      </div>
   )
}
