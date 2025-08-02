import { Request, Response } from 'express';
const yahooFinance = require('yahoo-finance2').default;

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const getChartData = async (req: Request, res: Response): Promise<void> => {
  const { symbol } = req.params;
  const { timeframe } = req.query;
  try {
    const result = await yahooFinance.historical(symbol, {
      period1: '1y',
      interval: timeframe || '1d',
    });
    const formattedData: ChartData[] = result.map((item: any) => ({
      time: Math.floor(item.date.getTime() / 1000),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));
    res.json(formattedData);
  } catch (error) {
    console.error('Fehler beim Abrufen der Daten von Yahoo Finance:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
  }
};