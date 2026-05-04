import { Route, Routes } from 'react-router-dom';
import Home from './Home';
import NotesApp from './NotesApp';

export default function App() {
   return (
      <Routes>
         <Route path="/" element={<Home />} />
         <Route path="/notes/*" element={<NotesApp />} />
      </Routes>
   );
}
