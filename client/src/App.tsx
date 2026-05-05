/** Top-level routes: marketing home, auth screens, and notes SPA behind RequireAuth. */
import { Route, Routes } from 'react-router-dom';
import Home from './Home';
import Login from './auth/Login';
import NotesApp from './notes/NotesApp';
import RequireAuth from './auth/RequireAuth';
import SignUp from './auth/SignUp';

export default function App() {
   return (
      <Routes>
         <Route path="/" element={<Home />} />
         <Route path="/login" element={<Login />} />
         <Route path="/signup" element={<SignUp />} />
         <Route
            path="/notes/*"
            element={
               <RequireAuth>
                  <NotesApp />
               </RequireAuth>
            }
         />
      </Routes>
   );
}
