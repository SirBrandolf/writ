import express from 'express';
import cors from 'cors';
import './config/env.js';
import notesRouter from './routes/notes.js';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS ??
   'http://localhost:3000,http://localhost:5175,http://127.0.0.1:3000,http://127.0.0.1:5175')
   .split(',')
   .map((origin) => origin.trim())
   .filter(Boolean);

// Middleware
app.use(
   cors({
      origin(origin, callback) {
         // Allow non-browser or same-origin requests with no Origin header.
         if (!origin) return callback(null, true);
         if (allowedOrigins.includes(origin)) return callback(null, true);
         return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
   })
);
app.use(express.json());

// Routes
app.use('/notes', notesRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(5000, () => {
    console.log('Server is running on port 5000');
});
