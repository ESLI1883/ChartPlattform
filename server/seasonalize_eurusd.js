const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'historischedaten',
  });

  const symbols = ['EURUSD', 'AUDUSD', 'GBPUSD', 'USDJPY']; // Beispiel-Symbole
  const yearsList = [5, 10, 15, 20];
  const thisYear = new Date().getFullYear();

  // Erstelle die Tabelle mit einer symbol-Spalte
  await pool.query(`
    CREATE TABLE IF NOT EXISTS seasonal_eurusd (
      symbol VARCHAR(10),
      years_back INT,
      day_of_year INT,
      avg_pct FLOAT,
      PRIMARY KEY (symbol, years_back, day_of_year)
    )
  `);

  for (const symbol of symbols) {
    const sourceTable = `${symbol.toLowerCase()}_d1`; // z. B. eurusd_d1, audusd_d1
    const targetTable = 'seasonal_eurusd';

    for (const yearsBack of yearsList) {
      const startDate = `${thisYear - yearsBack}-01-01`;
      const endDate = `${thisYear}-01-01`;

      // Gruppieren nach Kalendertag
      const [rows] = await pool.query(
        `SELECT
           DAYOFYEAR(FROM_UNIXTIME(timestamp)) AS day_of_year,
           AVG((close - open) / open * 100) AS avg_pct
         FROM \`${sourceTable}\`
         WHERE FROM_UNIXTIME(timestamp) >= ? AND FROM_UNIXTIME(timestamp) < ?
         GROUP BY day_of_year
         ORDER BY day_of_year`,
        [startDate, endDate]
      );

      // Upsert in seasonal_eurusd
      for (const { day_of_year, avg_pct } of rows) {
        await pool.query(
          `INSERT INTO \`${targetTable}\`
             (symbol, years_back, day_of_year, avg_pct)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             avg_pct = VALUES(avg_pct)`,
          [symbol, yearsBack, day_of_year, avg_pct]
        );
      }
      console.log(
        `✅ ${symbol} – ${yearsBack} Jahre: ${rows.length} Tage aktualisiert`
      );
    }
  }

  await pool.end();
  console.log('✔ Fertig mit allen Symbolen.');
  process.exit(0);
})();
