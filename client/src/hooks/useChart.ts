import { createChart, IChartApi, ISeriesApi, CandlestickSeries, LineSeries, PriceScaleMode, CrosshairMode } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';

export interface CandlestickData {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SeasonSeries {
  [key: number]: ISeriesApi<'Line'> | null;
  5: ISeriesApi<'Line'> | null;
  10: ISeriesApi<'Line'> | null;
  15: ISeriesApi<'Line'> | null;
  20: ISeriesApi<'Line'> | null;
}

export interface UseChartReturn {
  chart: IChartApi | null;
  candlestickSeries: ISeriesApi<'Candlestick'> | null;
  seasonSeries: SeasonSeries;
  setCandlestickData: (data: CandlestickData[]) => void;
  setSeasonData: (years: number, data: { time: string; value: number }[], visible: boolean) => void;
}

const useChart = (containerRef: React.RefObject<HTMLDivElement>): UseChartReturn => {
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [candlestickSeries, setCandlestickSeries] = useState<ISeriesApi<'Candlestick'> | null>(null);
  const [seasonSeries, setSeasonSeries] = useState<SeasonSeries>({ 5: null, 10: null, 15: null, 20: null });

  useEffect(() => {
    if (!containerRef.current) {
      console.error('Chart-Container nicht verfügbar.');
      return;
    }

    const chartInstance = createChart(containerRef.current, {
      width: 1700,
      height: 720,
      layout: { background: { color: '#ffffff' }, textColor: '#333' },
      timeScale: { timeVisible: true, secondsVisible: false },
      leftPriceScale: { scaleMargins: { top: 0.1, bottom: 0.1 }, mode: PriceScaleMode.Normal },
      rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.1 }, mode: PriceScaleMode.Normal, autoScale: true },
      crosshair: { mode: CrosshairMode.Normal },
    });

    const candlestickSeriesInstance = chartInstance.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceScaleId: 'left',
    });

    const seasonSeriesInstance = {
      5: chartInstance.addSeries(LineSeries, { color: '#FF0000', lineWidth: 2, priceScaleId: 'right', title: '5 Jahre', visible: true }),
      10: chartInstance.addSeries(LineSeries, { color: '#00FF00', lineWidth: 2, priceScaleId: 'right', title: '10 Jahre', visible: true }),
      15: chartInstance.addSeries(LineSeries, { color: '#0000FF', lineWidth: 2, priceScaleId: 'right', title: '15 Jahre', visible: true }),
      20: chartInstance.addSeries(LineSeries, { color: '#FFA500', lineWidth: 2, priceScaleId: 'right', title: '20 Jahre', visible: true }),
    };

    setChart(chartInstance);
    setCandlestickSeries(candlestickSeriesInstance);
    setSeasonSeries(seasonSeriesInstance);

    return () => {
      if (chartInstance) chartInstance.remove();
    };
  }, [containerRef]);

  const setCandlestickData = (data: CandlestickData[]) => {
    if (candlestickSeries) candlestickSeries.setData(data);
  };

  const setSeasonData = (years: number, data: { time: string; value: number }[], visible: boolean) => {
    if (seasonSeries[years]) {
      seasonSeries[years].setData(data);
      seasonSeries[years].applyOptions({ visible });
    }
  };

  return { chart, candlestickSeries, seasonSeries, setCandlestickData, setSeasonData };
};

export default useChart;