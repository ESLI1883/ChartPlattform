const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// MySQL-Datenbankverbindung konfigurieren
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'historischedaten',
};

const pool = mysql.createPool(dbConfig);

app.get('/api/market-data/:marketType/:symbol', async (req, res) => {
  const { marketType, symbol } = req.params;
  const { timeframe } = req.query;

  try {
    console.log(
      `Abfrage für Symbol: ${symbol}, MarketType: ${marketType}, Timeframe: ${timeframe}`
    );

    // Mappe die Timeframes zu den Werten in der Datenbank
    let dbTimeframe;
    switch (timeframe) {
      case 'M15':
        dbTimeframe = 'M15';
        break;
      case 'H1':
        dbTimeframe = 'H1';
        break;
      case 'H4':
        dbTimeframe = 'H4';
        break;
      case 'D1':
        dbTimeframe = 'Day';
        break;
      case 'W1':
        dbTimeframe = 'Week';
        break;
      case 'MN':
        dbTimeframe = 'Month';
        break;
      default:
        dbTimeframe = 'Day';
    }

    // Bestimme die Tabelle basierend auf dem Symbol
    const tableName = symbol.toLowerCase();
    console.log(`Verwende Tabelle: ${tableName}`);

    // Abfrage der Daten aus der Datenbank, ohne GROUP BY
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT datum_zeit, open, high, low, close 
       FROM \`${tableName}\` 
       WHERE timeframe = ? 
       ORDER BY datum_zeit ASC`,
      [dbTimeframe]
    );
    connection.release();

    console.log('Daten aus der Datenbank:', rows);

    if (!rows || rows.length === 0) {
      console.error('Keine Daten aus der Datenbank erhalten für:', {
        symbol,
        timeframe: dbTimeframe,
      });
      return res.status(404).json([]);
    }

    // Daten im richtigen Format für Lightweight Charts bereitstellen
    const chartData = rows
      .map((entry) => {
        const time = entry.datum_zeit
          ? Math.floor(new Date(entry.datum_zeit).getTime() / 1000)
          : null;
        if (!time || !entry.open || !entry.high || !entry.low || !entry.close) {
          console.warn('Ungültiger Datensatz:', entry);
          return null;
        }
        return {
          time: time,
          open: Number(entry.open),
          high: Number(entry.high),
          low: Number(entry.low),
          close: Number(entry.close),
        };
      })
      .filter((entry) => entry !== null);

    console.log('Formatierte chartData:', chartData);

    if (chartData.length === 0) {
      console.error('Keine gültigen Daten nach Formatierung:', rows);
      return res.status(404).json([]);
    }

    // Entferne Duplikate basierend auf dem Zeitstempel
    const uniqueChartData = [];
    const seenTimes = new Set();
    for (const entry of chartData) {
      if (!seenTimes.has(entry.time)) {
        seenTimes.add(entry.time);
        uniqueChartData.push(entry);
      } else {
        console.warn('Duplizierter Zeitstempel gefunden:', entry.time);
      }
    }

    console.log('Unique chartData nach Duplikat-Entfernung:', uniqueChartData);

    if (uniqueChartData.length === 0) {
      console.error(
        'Keine gültigen Daten nach Duplikat-Entfernung:',
        chartData
      );
      return res.status(404).json([]);
    }

    // Anpassung der Dezimalstellen basierend auf marketType
    if (marketType === 'forex') {
      uniqueChartData.forEach((d) => {
        d.open = Number(d.open.toFixed(5));
        d.high = Number(d.high.toFixed(5));
        d.low = Number(d.low.toFixed(5));
        d.close = Number(d.close.toFixed(5));
      });
    } else if (marketType === 'crypto') {
      uniqueChartData.forEach((d) => {
        d.open = Number(d.open.toFixed(8));
        d.high = Number(d.high.toFixed(8));
        d.low = Number(d.low.toFixed(8));
        d.close = Number(d.close.toFixed(8));
      });
    }

    uniqueChartData.sort((a, b) => a.time - b.time);

    console.log('Sortierte chartData:', uniqueChartData);

    res.json(uniqueChartData);
  } catch (error) {
    console.error('Fehler beim Abrufen der Daten:', error.message);
    console.error('Stacktrace:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('Server auf Port 3001'));
