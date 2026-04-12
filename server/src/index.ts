import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import notesRouter from './routes/notes.js';

const app = express();

// Middleware
app.use(cors({
   origin: 'http://localhost:5175'
 }));
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
