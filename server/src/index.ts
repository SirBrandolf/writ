/**
 * Writ API: JSON notes under /api/notes, CORS allow-list from env, Postgres via routes → services.
 */
import express from 'express';
import cors from 'cors';
import './config/env.js';
import notesRouter from './routes/notes.js';

const app = express();

/** Origins permitted for cross-origin browser requests (comma-separated CORS_ORIGINS or FRONTEND_URL). */
const allowedOrigins = (process.env.CORS_ORIGINS ??
   process.env.FRONTEND_URL ??
   'http://localhost:3000,http://localhost:5175,http://127.0.0.1:3000,http://127.0.0.1:5175')
   .split(',')
   .map((origin) => origin.trim())
   .filter(Boolean)
   .map((origin) => origin.replace(/\/$/, ''));

const port = Number(process.env.PORT) || 5000;

app.use(
   cors({
      origin(origin, callback) {
         /* Requests without Origin (curl, server-to-server): allow. Disallowed origins: deny quietly (no thrown Error). */
         if (!origin) return callback(null, true);
         const normalizedOrigin = origin.replace(/\/$/, '');
         if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
         return callback(null, false);
      },
   })
);
app.use(express.json());

/** REST notes API lives under /api so SPA routers can own browser-facing /notes/*. */
app.use('/api/notes', notesRouter);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
