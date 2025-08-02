const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const crypto = require('crypto');

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

// Funktion, um zu prüfen, ob die Tabelle existiert
async function checkTableExists(connection, tableName) {
  try {
    console.log('Abfrage Tables');
    const [result] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
      [dbConfig.database, tableName]
    );
    return result[0].count > 0;
  } catch (error) {
    console.error('Fehler beim Prüfen der Tabelle:', error.message);
    return false;
  }
}

// Initialisiere Tabellen für charts und drawing_tools
(async () => {
  try {
    const connection = await pool.getConnection();
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS charts (
        id VARCHAR(36) PRIMARY KEY,
        symbol_timeframe VARCHAR(100) NOT NULL, -- Anpassung für Symbol_Timeframe
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS drawing_tools (
        id VARCHAR(36) PRIMARY KEY,
        chart_id VARCHAR(36) NOT NULL,
        type VARCHAR(50) NOT NULL,
        points JSON NOT NULL,
        options JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chart_id) REFERENCES charts(id) ON DELETE CASCADE
      );
    `);
    connection.release();
    console.log('Tabellen charts und drawing_tools erstellt oder vorhanden');
  } catch (error) {
    console.error('Fehler beim Erstellen der Tabellen:', error);
  }
})();

app.get('/api/market-data/:marketType/:symbol', async (req, res) => {
  const { marketType, symbol } = req.params;
  const { timeframe } = req.query;

  try {
    console.log(
      `Abfrage für Symbol: ${symbol}, MarketType: ${marketType}, Timeframe: ${timeframe}`
    );

    let dbTimeframe;
    switch (timeframe) {
      case 'M1':
        dbTimeframe = 'm1';
        break;
      case 'M5':
        dbTimeframe = 'm5';
        break;
      case 'M15':
        dbTimeframe = 'm15';
        break;
      case 'M30':
        dbTimeframe = 'm30';
        break;
      case 'H1':
        dbTimeframe = 'h1';
        break;
      case 'H4':
        dbTimeframe = 'h4';
        break;
      case 'D1':
        dbTimeframe = 'd1';
        break;
      case 'W1':
        dbTimeframe = 'w1';
        break;
      case 'MN':
        dbTimeframe = 'mn';
        break;
      default:
        dbTimeframe = 'd1'; // Standardwert
    }

    const tableName = `${symbol.toLowerCase()}_${dbTimeframe}`;
    console.log(`Verwende Tabelle: ${tableName}`);

    const connection = await pool.getConnection();
    const tableExists = await checkTableExists(connection, tableName);
    if (!tableExists) {
      connection.release();
      return res
        .status(404)
        .json({ error: `Tabelle ${tableName} existiert nicht.` });
    }

    const [rows] = await connection.query(
      `SELECT timestamp, open, high, low, close FROM \`${tableName}\` ORDER BY timestamp ASC`,
      []
    );
    connection.release();

    if (!rows || rows.length === 0) {
      return res
        .status(404)
        .json({ error: `Keine Daten in der Tabelle ${tableName} gefunden.` });
    }

    const chartData = rows
      .map((entry, index) => {
        const parsedDate = new Date(entry.timestamp);
        if (isNaN(parsedDate.getTime())) {
          console.warn(
            `Ungültiger timestamp bei Datensatz ${index}:`,
            entry.timestamp
          );
          return null;
        }
        const time = Math.floor(parsedDate.getTime() / 1000);
        if (
          !time ||
          !entry.open ||
          !entry.high ||
          !entry.low ||
          !entry.close ||
          isNaN(entry.open) ||
          isNaN(entry.high) ||
          isNaN(entry.low) ||
          isNaN(entry.close)
        ) {
          console.warn(`Ungültiger Datensatz ${index}:`, entry);
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

    if (chartData.length === 0) {
      return res
        .status(404)
        .json({ error: 'Keine gültigen Daten nach Formatierung.' });
    }

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

    if (uniqueChartData.length === 0) {
      return res
        .status(404)
        .json({ error: 'Keine gültigen Daten nach Duplikat-Entfernung.' });
    }

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

    res.json(uniqueChartData);
  } catch (error) {
    console.error('Fehler beim Abrufen der Daten:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/raw-history', async (req, res) => {
  const symbolParam = req.query.symbol;
  if (!symbolParam) {
    return res
      .status(400)
      .json({
        error: 'Bitte Symbol als Query-Parameter angeben, z.B. ?symbol=EURUSD',
      });
  }

  const symbol = sanitizeSymbol(symbolParam);
  if (!symbol) {
    return res.status(400).json({ error: 'Ungültiges Symbol.' });
  }

  const tableName = `${symbol}_d1`;

  try {
    const [rows] = await pool.query(
      `SELECT timestamp AS time, close FROM \`${tableName}\` WHERE timestamp >= '2005-01-01' ORDER BY timestamp ASC`
    );

    const transformed = rows.map((r) => ({
      time: Math.floor(new Date(r.time).getTime() / 1000),
      close: parseFloat(r.close),
    }));

    res.json(transformed);
  } catch (err) {
    console.error('Fehler beim Abrufen der Rohdaten:', err);
    res
      .status(500)
      .json({ error: 'Datenbankfehler beim Abrufen der Rohdaten.' });
  }
});

function sanitizeSymbol(sym) {
  if (typeof sym !== 'string') return null;
  const cleaned = sym.trim().toLowerCase();
  if (!/^[a-z0-9_]+$/.test(cleaned)) return null;
  return cleaned;
}

app.get('/api/seasonality', async (req, res) => {
  const symbolParam = req.query.symbol;
  if (!symbolParam) {
    return res
      .status(400)
      .json({ error: 'Bitte Symbol angeben, z.B. ?symbol=EURUSD' });
  }

  const symbol = sanitizeSymbol(symbolParam);
  if (!symbol) {
    return res.status(400).json({ error: 'Ungültiges Symbol.' });
  }

  const tableName = `${symbol}_d1`;

  try {
    const [rows] = await pool.query(
      `SELECT timestamp, close FROM \`${tableName}\` WHERE timestamp >= '2005-01-01' ORDER BY timestamp ASC`
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Keine Daten gefunden.' });
    }

    const priceData = rows.map((r) => ({
      date: new Date(r.timestamp),
      close: parseFloat(r.close),
    }));

    const priceDataByYear = {};
    priceData.forEach((p) => {
      const y = p.date.getUTCFullYear();
      if (!priceDataByYear[y]) priceDataByYear[y] = [];
      priceDataByYear[y].push(p);
    });
    Object.keys(priceDataByYear).forEach((yearStr) => {
      priceDataByYear[yearStr].sort((a, b) => a.date - b.date);
    });
    const allYears = Object.keys(priceDataByYear)
      .map((y) => parseInt(y, 10))
      .sort((a, b) => a - b);

    const firstCloseByYear = {};
    Object.keys(priceDataByYear).forEach((yearStr) => {
      const year = parseInt(yearStr, 10);
      const arr = priceDataByYear[year];
      if (arr && arr.length > 0) {
        firstCloseByYear[year] = arr[0].close;
      }
    });

    const dailyReturns = [];
    Object.keys(priceDataByYear).forEach((yearStr) => {
      const year = parseInt(yearStr, 10);
      const arr = priceDataByYear[year];
      const firstClose = firstCloseByYear[year];
      if (!firstClose || firstClose <= 0) return;
      arr.forEach((p, idx) => {
        const tradingDayIndex = idx + 1;
        const pctReturn = (p.close / firstClose - 1) * 100;
        dailyReturns.push({
          year,
          trading_day_index: tradingDayIndex,
          pctReturn,
        });
      });
    });

    const seasons = [5, 10, 15, 20];
    const seasonalityResults = [];

    seasons.forEach((N) => {
      if (allYears.length < N) return;
      const yearsForN = allYears.slice(allYears.length - N);

      const subsetForN = dailyReturns.filter((e) => yearsForN.includes(e.year));
      const byTradingDay = {};
      subsetForN.forEach((e) => {
        const idx = e.trading_day_index;
        if (!byTradingDay[idx]) byTradingDay[idx] = [];
        byTradingDay[idx].push(e.pctReturn);
      });

      Object.keys(byTradingDay).forEach((idxStr) => {
        const idx = parseInt(idxStr, 10);
        const arr = byTradingDay[idx];
        if (arr.length > 0) {
          const sum = arr.reduce((acc, v) => acc + v, 0);
          const avg = sum / arr.length;
          seasonalityResults.push({
            years_back: N,
            trading_day_index: idx,
            avg_pct: parseFloat(avg.toFixed(4)),
          });
        }
      });
    });

    res.json(seasonalityResults);
  } catch (err) {
    console.error('Fehler beim Berechnen der Seasonality:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
});

app.post('/api/charts', async (req, res) => {
  const { symbol_timeframe } = req.body; // Anpassung für Symbol_Timeframe
  if (!symbol_timeframe)
    return res.status(400).json({ message: 'Symbol_Timeframe erforderlich' });
  const chartId = crypto.randomUUID();
  await pool.execute(
    'INSERT INTO charts (id, symbol_timeframe, created_at) VALUES (?, ?, NOW())',
    [chartId, symbol_timeframe]
  );
  res.json({ id: chartId });
});

app.put('/api/charts/:chartId', async (req, res) => {
  const { chartId } = req.params;
  const { drawingTools } = req.body;
  if (!drawingTools)
    return res.status(400).json({ message: 'DrawingTools erforderlich' });
  await pool.execute('DELETE FROM drawing_tools WHERE chart_id = ?', [chartId]);
  const insertQuery =
    'INSERT INTO drawing_tools (id, chart_id, type, points, options, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
  for (const tool of drawingTools) {
    await pool.execute(insertQuery, [
      tool.id,
      chartId,
      tool.type,
      JSON.stringify(tool.points),
      JSON.stringify(tool.options),
    ]);
  }
  res.sendStatus(200);
});

app.get('/api/charts/:chartId', async (req, res) => {
  const { chartId } = req.params;
  const [charts] = await pool.execute('SELECT * FROM charts WHERE id = ?', [
    chartId,
  ]);
  if (!charts.length)
    return res.status(404).json({ message: 'Chart nicht gefunden' });
  const [tools] = await pool.execute(
    'SELECT * FROM drawing_tools WHERE chart_id = ?',
    [chartId]
  );
  res.json({
    id: charts[0].id,
    symbol_timeframe: charts[0].symbol_timeframe, // Anpassung für Symbol_Timeframe
    createdAt: new Date(charts[0].created_at).getTime(),
    drawingTools: tools.map((tool) => ({
      id: tool.id,
      type: tool.type,
      points: JSON.parse(tool.points),
      options: JSON.parse(tool.options),
      createdAt: new Date(tool.created_at).getTime(),
    })),
  });
});

app.get('/api/charts', async (req, res) => {
  const [charts] = await pool.execute('SELECT * FROM charts');
  const chartData = await Promise.all(
    charts.map(async (chart) => {
      const [tools] = await pool.execute(
        'SELECT * FROM drawing_tools WHERE chart_id = ?',
        [chart.id]
      );
      return {
        id: chart.id,
        symbol_timeframe: chart.symbol_timeframe, // Anpassung für Symbol_Timeframe
        createdAt: new Date(chart.created_at).getTime(),
        drawingTools: tools.map((tool) => ({
          id: tool.id,
          type: tool.type,
          points: JSON.parse(tool.points),
          options: JSON.parse(tool.options),
          createdAt: new Date(tool.created_at).getTime(),
        })),
      };
    })
  );
  res.json(chartData);
});

app.listen(3001, () => console.log('Server auf Port 3001'));
