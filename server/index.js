const express = require('express');
const yahooFinance = require('yahoo-finance2').default;
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

app.get('/api/market-data/:marketType/:symbol', async (req, res) => {
  const { marketType, symbol } = req.params;
  try {
    let query;
    if (marketType === 'stock') {
      query = symbol;
    } else if (marketType === 'forex') {
      query = `${symbol}=X`;
    } else if (marketType === 'crypto') {
      query = `${symbol}-USD`;
    } else {
      throw new Error('Unbekannter Markt-Typ');
    }

    console.log(`Abfrage für Symbol: ${query}`);

    // Berechne period1 (10 Tage zurück)
    const period1 = new Date();
    period1.setDate(period1.getDate() - 10);

    const response = await yahooFinance.historical(query, {
      period1: period1, // Datum 10 Tage zurück
      interval: '1d',
    });

    console.log('Rohdaten von Yahoo Finance:', response);

    const chartData = response.map((entry) => ({
      time: new Date(entry.date).toISOString().slice(0, 10),
      open: entry.open,
      high: entry.high,
      low: entry.low,
      close: entry.close,
    }));

    chartData.sort((a, b) => new Date(a.time) - new Date(b.time));
    res.json(chartData);
  } catch (error) {
    console.error('Fehler beim Abrufen der Daten:', error.message);
    console.error('Stacktrace:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('Server auf Port 3001'));
