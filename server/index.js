const express = require('express');
const yahooFinance = require('yahoo-finance2').default;
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

app.get('/api/market-data/:marketType/:symbol', async (req, res) => {
  const { marketType, symbol } = req.params;
  const { timeframe } = req.query;

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

    let interval;
    switch (timeframe) {
      case 'D1':
        interval = '1d';
        break;
      case 'W1':
        interval = '1wk';
        break;
      case 'MN':
        interval = '1mo';
        break;
      default:
        interval = '1d';
    }

    // Maximaler Zeitraum: Setze period1 auf ein sehr frühes Datum (1. Januar 1970)
    const period1 = new Date('1970-01-01');

    const response = await yahooFinance.historical(query, {
      period1: period1,
      interval: interval,
    });

    console.log('Rohdaten von Yahoo Finance:', response);

    const chartData = response.map((entry) => ({
      time: Math.floor(new Date(entry.date).getTime() / 1000),
      open: entry.open,
      high: entry.high,
      low: entry.low,
      close: entry.close,
    }));

    if (marketType === 'forex') {
      chartData.forEach((d) => {
        d.open = Number(d.open.toFixed(5));
        d.high = Number(d.high.toFixed(5));
        d.low = Number(d.low.toFixed(5));
        d.close = Number(d.close.toFixed(5));
      });
    } else if (marketType === 'crypto') {
      chartData.forEach((d) => {
        d.open = Number(d.open.toFixed(8));
        d.high = Number(d.high.toFixed(8));
        d.low = Number(d.low.toFixed(8));
        d.close = Number(d.close.toFixed(8));
      });
    }

    chartData.sort((a, b) => a.time - b.time);
    res.json(chartData);
  } catch (error) {
    console.error('Fehler beim Abrufen der Daten:', error.message);
    console.error('Stacktrace:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('Server auf Port 3001'));
