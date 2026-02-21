const express = require('express');
const app = express();
const cors = require('cors');
const pool = require('./db');

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// create a note
app.post('/notes', async (req, res) => {
  try {
    const { content } = req.body;
    const newNote = await pool.query(
      "INSERT INTO note (content) VALUES($1) RETURNING *", 
      [content]
    );
    res.json(newNote.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
})

// get all notes
app.get('/notes', async (req, res) => {
  try {
    const allNotes = await pool.query("SELECT * FROM notes");
    res.json(allNotes.rows);
  } catch (err) {
    console.error(err.message);
  }
})

// get a note
app.get('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const note = await pool.query("SELECT * FROM notes WHERE note_id = $1", [id]);
    res.json(note.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
})

// update a note
app.put('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const updateNote = await pool.query(
      "UPDATE notes SET content = $1 WHERE note_id = $2 RETURNING *",
      [content, id]
    );
    res.json(updateNote.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
})

// delete a note
app.delete('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM notes WHERE note_id = $1", [id]);
    res.json("Note was deleted!");
  } catch (err) {
    console.error(err.message);
  }
})

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
