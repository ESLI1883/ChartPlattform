import { SeasonalityData } from './api';

export const processSeasonalityData = (data: SeasonalityData[], symbol: string, candlestickData: any[]): { [key: number]: { time: string; value: number }[] } => {
  const result: { [key: number]: { time: string; value: number }[] } = { 5: [], 10: [], 15: [], 20: [] };
  const currentYear = new Date().getFullYear();
  const businessDaysOfCurrentYear = [];
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(currentYear, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, m, d);
      const weekday = date.getDay();
      if (weekday !== 0 && weekday !== 6) {
        const mm = String(m + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        businessDaysOfCurrentYear.push(`${currentYear}-${mm}-${dd}`);
      }
    }
  }

  [5, 10, 15, 20].forEach((N) => {
    if (candlestickData.length < N * 365) return;
    const yearData = data.filter((s) => s.years_back === N);
    const avgPctByDay: { [key: number]: number } = {};
    yearData.forEach((entry) => {
      avgPctByDay[entry.trading_day_index] = entry.avg_pct || 0;
    });

    result[N] = businessDaysOfCurrentYear.map((day, i) => {
      const tradingIdx = i + 1;
      const pctValue = avgPctByDay[tradingIdx];
      return pctValue !== null && typeof pctValue === 'number' && !Number.isNaN(pctValue)
        ? { time: day, value: pctValue }
        : { time: day, value: 0 };
    });
  });

  return result;
};