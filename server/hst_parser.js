const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');

// MySQL-Verbindungskonfiguration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'historischedaten',
};

// Funktion zur Validierung einer Kerze
function validateCandle(candle) {
  return (
    candle.time > 0 &&
    candle.open > 0 &&
    candle.high > 0 &&
    candle.low > 0 &&
    candle.close > 0 &&
    candle.volume >= 0 &&
    candle.high >= candle.low &&
    candle.high >= candle.open &&
    candle.high >= candle.close &&
    candle.low <= candle.open &&
    candle.low <= candle.close
  );
}

// Funktion zum Extrahieren von Symbol und Zeitrahmen aus dem Dateinamen
function extractSymbolAndTimeframe(filename) {
  const nameWithoutExt = filename.replace('.hst', '');
  const timeframeMatch = nameWithoutExt.match(/\d+$/); // Finde Ziffern am Ende
  if (!timeframeMatch) {
    throw new Error(
      `Ungültiger Dateiname: ${filename}. Zeitrahmen konnte nicht extrahiert werden.`
    );
  }
  const timeframe = timeframeMatch[0];
  const symbol = nameWithoutExt.replace(timeframe, '');
  return { symbol, timeframe: parseInt(timeframe, 10) };
}

// Funktion zum Parsen der .hst-Datei
function parseHstFile(buffer, symbol, timeframe) {
  const candles = [];

  // Header überspringen (148 Bytes in neueren MT4-Versionen)
  const headerSize = 148;
  let offset = headerSize;

  // Jede Kerze ist 60 Bytes groß (neueres Format, Build ≥ 600)
  const candleSize = 60;

  while (offset + candleSize <= buffer.length) {
    const candle = {
      time: buffer.readBigInt64LE(offset), // 8 Bytes, UNIX-Timestamp
      open: buffer.readDoubleLE(offset + 8), // 8 Bytes
      high: buffer.readDoubleLE(offset + 16), // 8 Bytes
      low: buffer.readDoubleLE(offset + 24), // 8 Bytes
      close: buffer.readDoubleLE(offset + 32), // 8 Bytes
      volume: buffer.readDoubleLE(offset + 40), // 8 Bytes
      // Ignoriere restliche 12 Bytes (z. B. Spread, reserved)
    };
    offset += candleSize;

    // Validierung
    if (validateCandle(candle)) {
      // Konvertiere Timestamp in MySQL-kompatibles Format (YYYY-MM-DD HH:MM:SS)
      const date = new Date(Number(candle.time) * 1000);
      const timestamp = date.toISOString().replace('T', ' ').substring(0, 19); // Entferne 'Z' und alles nach Sekunden

      candles.push({
        symbol,
        timeframe,
        timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      });
    } else {
      console.warn(
        `Ungültige Kerze bei Offset ${offset - candleSize}:`,
        candle
      );
    }
  }

  return candles;
}

// Funktion zum Speichern der Kerzen in MySQL
async function saveToDatabase(candles, symbol, timeframe) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    for (const candle of candles) {
      await connection.execute(
        `INSERT INTO market_data (symbol, timeframe, timestamp, open, high, low, close, volume) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         open = ?, high = ?, low = ?, close = ?, volume = ?`,
        [
          candle.symbol,
          candle.timeframe,
          candle.timestamp,
          candle.open,
          candle.high,
          candle.low,
          candle.close,
          candle.volume,
          candle.open,
          candle.high,
          candle.low,
          candle.close,
          candle.volume,
        ]
      );
    }
    console.log(
      `Erfolgreich ${candles.length} Kerzen für ${symbol} (Timeframe: ${timeframe}) gespeichert.`
    );
  } catch (error) {
    console.error('Fehler beim Speichern in die Datenbank:', error.message);
  } finally {
    await connection.end();
  }
}

// Funktion zum Verarbeiten aller .hst-Dateien in einem Verzeichnis
async function processAllHstFiles(directory) {
  try {
    const files = await fs.readdir(directory);
    const hstFiles = files.filter((file) => file.endsWith('.hst'));

    for (const file of hstFiles) {
      console.log(`Verarbeite ${file}...`);
      const filePath = path.join(directory, file);

      // Symbol und Zeitrahmen extrahieren
      const { symbol, timeframe } = extractSymbolAndTimeframe(file);

      // Datei einlesen und parsen
      const buffer = await fs.readFile(filePath);
      const candles = parseHstFile(buffer, symbol, timeframe);

      if (candles.length === 0) {
        console.warn(`Keine gültigen Kerzen in ${file} gefunden.`);
        continue;
      }

      // In die Datenbank speichern
      await saveToDatabase(candles, symbol, timeframe);
    }

    console.log('Alle Dateien verarbeitet.');
  } catch (error) {
    console.error('Fehler beim Verarbeiten der Dateien:', error.message);
  }
}

// Hauptfunktion
async function main() {
  const hstDirectory =
    'C:\\Users\\S2019\\AppData\\Roaming\\MetaQuotes\\Terminal\\BB190E062770E27C3E79391AB0D1A117\\history\\FXCM-AUDDemo01'; // Ersetze mit dem Pfad zu deiner .hst-Datei
  await processAllHstFiles(hstDirectory);
}

// Skript ausführen
main();
