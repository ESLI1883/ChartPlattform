const express = require('express');
const app = express();

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend läuft!' });
});

app.listen(3001, () => console.log('Server auf Port 3001'));
