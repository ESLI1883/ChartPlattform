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

app.get('/api/market-data/:marketType/:symbol', async (req, res) => {
  const { marketType, symbol } = req.params;
  const { timeframe } = req.query;

  try {
    console.log(
      `Abfrage für Symbol: ${symbol}, MarketType: ${marketType}, Timeframe: ${timeframe}`
    );

    // Mappe die Timeframes zu den Tabellenendungen
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

    // Bestimme die Tabelle basierend auf Symbol und Zeitrahmen
    const tableName = `${symbol.toLowerCase()}_${dbTimeframe}`;
    console.log(`Verwende Tabelle: ${tableName}`);

    // Prüfe, ob die Tabelle existiert
    const connection = await pool.getConnection();
    const tableExists = await checkTableExists(connection, tableName);
    if (!tableExists) {
      console.error(`Tabelle ${tableName} existiert nicht in der Datenbank.`);
      connection.release();
      return res
        .status(404)
        .json({ error: `Tabelle ${tableName} existiert nicht.` });
    }
    console.log('QUERY TABLE NAME: ', tableName);
    // Abfrage der Daten aus der Datenbank
    const [rows] = await connection.query(
      `SELECT timestamp, open, high, low, close 
       FROM \`${tableName}\` 
       ORDER BY timestamp ASC`,
      []
    );
    connection.release();

    console.log('Daten aus der Datenbank:', rows);

    if (!rows || rows.length === 0) {
      console.error('Keine Daten aus der Datenbank erhalten für:', {
        symbol,
        timeframe: dbTimeframe,
      });
      return res
        .status(404)
        .json({ error: `Keine Daten in der Tabelle ${tableName} gefunden.` });
    }

    // Daten im richtigen Format für Lightweight Charts bereitstellen
    const chartData = rows
      .map((entry, index) => {
        // Prüfe, ob timestamp ein gültiges Datum ist
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

    console.log('Formatierte chartData:', chartData);

    if (chartData.length === 0) {
      console.error('Keine gültigen Daten nach Formatierung:', rows);
      return res
        .status(404)
        .json({ error: 'Keine gültigen Daten nach Formatierung.' });
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
      return res
        .status(404)
        .json({ error: 'Keine gültigen Daten nach Duplikat-Entfernung.' });
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

/**
+ * GET /api/seasonality
+ * Query-Params:
+ *   marketType – z.B. "forex" oder "commodities"
+ *   symbol     – z.B. "EURUSD" oder "GOLD"
+ *   years      – 5, 10, 15 oder 20
+ */

// --- 1) API: Rohe Tages-History (z. B. Candlestick) für ein Symbol laden ---
app.get('/api/raw-history', async (req, res) => {
  const symbolParam = req.query.symbol;
  if (!symbolParam) {
    return res.status(400).json({
      error: 'Bitte Symbol als Query-Parameter angeben, z.B. ?symbol=EURUSD',
    });
  }

  // 1.a) Symbol validieren und in lower-case umwandeln
  const symbol = sanitizeSymbol(symbolParam);
  if (!symbol) {
    return res.status(400).json({ error: 'Ungültiges Symbol.' });
  }

  // 1.b) Tabellennamen aufbauen (z.B. eurusd_d1)
  //       Falls du stattdessen nur eine Tabelle mit Spalte „symbol“ hast,
  //       musst du die SQL-Query entsprechend anpassen.
  const tableName = `${symbol}_d1`;

  try {
    // 1.c) Query dynamisch erzeugen (auf deine tatsächliche Schema-Struktur anpassen)
    //      Wir holen alle Einträge ab 2005-01-01, aufsteigend sortiert
    const [rows] = await pool.query(
      `SELECT timestamp AS time, close 
       FROM \`${tableName}\` 
       WHERE timestamp >= '2005-01-01' 
       ORDER BY timestamp ASC`
    );

    // 1.d) Wir müssen rows in das Format bringen, das das Frontend erwartet:
    //      [{ time: 1609459200, close: 1.2234 }, …] oder time als ISO-String, je nachdem.
    //      Angenommen, das Frontend rechnet mit Unix-Sekunden im field „time“:
    const transformed = rows.map((r) => ({
      time: Math.floor(new Date(r.time).getTime() / 1000),
      close: parseFloat(r.close),
    }));

    return res.json(transformed);
  } catch (err) {
    console.error('Fehler beim Abrufen der Rohdaten:', err);
    return res
      .status(500)
      .json({ error: 'Datenbankfehler beim Abrufen der Rohdaten.' });
  }
});

/**
 * GET /api/seasonality?symbol=XYZ
 * ---------------------------------------------------------
 * Liefert für die letzten 5, 10, 15 und 20 Jahre (sofern vorhanden)
 * pro Tag im Jahr (day_of_year: 1–365/366) den durchschnittlichen
 * Prozent-Return relativ zum Kurs am Jahresanfang.
 **/
// --- Utility: prüfe, ob der symbol-Parameter „sauber“ ist (nur A-Z, a-z, 0-9 und evtl. Unterstrich) ---

function sanitizeSymbol(sym) {
  if (typeof sym !== 'string') return null;
  const cleaned = sym.trim().toLowerCase();
  // Erlaube nur Buchstaben, Ziffern und Unterstrich
  if (!/^[a-z0-9_]+$/.test(cleaned)) return null;
  return cleaned;
}

// --- 2) API: Saisonale Daten (Durchschnitts-Returns) für ein Symbol berechnen und zurückgeben ---
app.get('/api/seasonality', async (req, res) => {
  const symbolParam = req.query.symbol;
  if (!symbolParam) {
    return res
      .status(400)
      .json({ error: 'Bitte Symbol angeben, z.B. ?symbol=EURUSD' });
  }

  // 2.a) Symbol validieren und in lower-case umwandeln
  const symbol = sanitizeSymbol(symbolParam);
  if (!symbol) {
    return res.status(400).json({ error: 'Ungültiges Symbol.' });
  }

  // 2.b) Tabellennamen wie oben
  const tableName = `${symbol}_d1`;

  try {
    // 2.c) Lade alle historischen Schlusskurse (D1) ab 2005
    const [rows] = await pool.query(
      `SELECT timestamp, close
       FROM \`${tableName}\`
       WHERE timestamp >= '2005-01-01'
       ORDER BY timestamp ASC`
    );
    if (!rows || rows.length === 0) {
      console.log('🚨 Keine Rohdaten gefunden für', symbol);
      return res.status(404).json({ error: 'Keine Daten gefunden.' });
    }
    console.log(
      `ℹ️ ${rows.length} Zeilen historische Daten geladen für ${symbol}.`
    );

    // 2.d) Transformiere in ein Array von { date: Date, close: Number }
    const priceData = rows.map((r) => ({
      date: new Date(r.timestamp),
      close: parseFloat(r.close),
    }));

    // 2.e) Gruppiere priceData nach Kalenderjahr
    const priceDataByYear = {};
    priceData.forEach((p) => {
      const y = p.date.getUTCFullYear();
      if (!priceDataByYear[y]) priceDataByYear[y] = [];
      priceDataByYear[y].push(p);
    });
    // Sortiere innerhalb jedes Jahres chronologisch
    Object.keys(priceDataByYear).forEach((yearStr) => {
      priceDataByYear[yearStr].sort((a, b) => a.date - b.date);
    });
    const allYears = Object.keys(priceDataByYear)
      .map((y) => parseInt(y, 10))
      .sort((a, b) => a - b);
    console.log(`✅ Verfügbare Jahre im Datensatz für ${symbol}:`, allYears);

    // 2.f) Ermittle für jedes Jahr den ersten Schlusskurs
    const firstCloseByYear = {};
    Object.keys(priceDataByYear).forEach((yearStr) => {
      const year = parseInt(yearStr, 10);
      const arr = priceDataByYear[year];
      if (arr && arr.length > 0) {
        firstCloseByYear[year] = arr[0].close;
      }
    });

    // 2.g) Baue dailyReturns: { year, trading_day_index, pctReturn }
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
    console.log(
      `ℹ️ dailyReturns enthält ${dailyReturns.length} Einträge über alle Jahre.`
    );

    // 2.h) Jetzt berechne Saisonalität für N = 5, 10, 15, 20 Jahre
    const seasons = [5, 10, 15, 20];
    const seasonalityResults = [];

    seasons.forEach((N) => {
      if (allYears.length < N) {
        console.log(
          `⚠️ Nur ${allYears.length} Jahre vorhanden, weniger als N=${N}. Überspringe N=${N}.`
        );
        return;
      }
      const yearsForN = allYears.slice(allYears.length - N);
      console.log(`🔍 Berechne für die letzten ${N} Jahre:`, yearsForN);

      const subsetForN = dailyReturns.filter((e) => yearsForN.includes(e.year));
      console.log(`   → subsetForN (N=${N}) hat ${subsetForN.length} Einträge`);

      // Gruppiere subsetForN nach trading_day_index
      const byTradingDay = {};
      subsetForN.forEach((e) => {
        const idx = e.trading_day_index;
        if (!byTradingDay[idx]) byTradingDay[idx] = [];
        byTradingDay[idx].push(e.pctReturn);
      });
      console.log(
        `   → byTradingDay Keys (N=${N}):`,
        Object.keys(byTradingDay).slice(0, 10),
        '(…)'
      );

      // Für jeden trading_day_index: Mittelwert aller pctReturn
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

    console.log(
      `✅ seasonalityResults befüllt mit ${seasonalityResults.length} Einträgen insgesamt.`
    );
    return res.json(seasonalityResults);
  } catch (err) {
    console.error('❌ Fehler beim Berechnen der Seasonality:', err);
    return res.status(500).json({ error: 'Serverfehler.' });
  }
});

app.listen(3001, () => console.log('Server auf Port 3001'));
