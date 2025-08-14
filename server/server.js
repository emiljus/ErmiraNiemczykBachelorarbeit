require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const leonardoRoutes = require('./routes/leonardoRoutes');

// Middleware
app.use(express.json());

// Statische Dateien für Client
app.use(express.static(path.join(__dirname, '../client')));

// Statische Bilder vom Server bereitstellen
app.use('/i2i', express.static(path.join(__dirname, 'i2i')));

// API-Routen
app.use('/api', leonardoRoutes);

// Alle anderen Anfragen an index.html weiterleiten
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/hauptseite.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});