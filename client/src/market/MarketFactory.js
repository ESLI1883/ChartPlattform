class MarketFactory {
  static async fetchMarketData(marketType, symbol) {
    try {
      const response = await fetch(
        `http://localhost:3001/api/market-data/${marketType}/${symbol}`
      );
      const data = await response.json();
      console.log('Daten vom Backend:', data); // Debugging
      return data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Daten vom Backend:', error);
      return [];
    }
  }

  static createMarketData(marketType, startDate, numDays) {
    const data = [];
    let price = 100;
    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < numDays; i++) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      const open = price;
      const high = open + Math.random() * 2;
      const low = open - Math.random() * 2;
      const close = open + (Math.random() - 0.5) * 2;
      price = close;

      data.push({
        time: dateStr,
        open,
        high,
        low,
        close,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (marketType === 'forex') {
      data.forEach((d) => {
        d.open = Number(d.open.toFixed(5));
        d.high = Number(d.high.toFixed(5));
        d.low = Number(d.low.toFixed(5));
        d.close = Number(d.close.toFixed(5));
      });
    } else if (marketType === 'crypto') {
      data.forEach((d) => {
        d.open = Number(d.open.toFixed(8));
        d.high = Number(d.high.toFixed(8));
        d.low = Number(d.low.toFixed(8));
        d.close = Number(d.close.toFixed(8));
      });
    }

    return data;
  }
}

export default MarketFactory;
