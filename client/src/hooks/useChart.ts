import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';

export interface CandlestickData {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface UseChartReturn {
  chart: IChartApi | null;
  candlestickSeries: ISeriesApi<'Candlestick'> | null;
  setCandlestickData: (data: CandlestickData[]) => void;
}

const useChart = (containerRef: React.RefObject<HTMLDivElement>): UseChartReturn => {
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [candlestickSeries, setCandlestickSeries] = useState<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      const chartInstance = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 500,
        layout: { background: { color: '#ffffff' }, textColor: '#333' },
        grid: { vertLines: { color: '#e1e1e1' }, horzLines: { color: '#e1e1e1' } },
        timeScale: { timeVisible: true, secondsVisible: false },
      });
      const series = chartInstance.addCandlestickSeries();
      setChart(chartInstance);
      setCandlestickSeries(series);

      const handleResize = () => {
        chartInstance.resize(containerRef.current!.clientWidth, 500);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstance.remove();
      };
    }
  }, [containerRef]);

  const setCandlestickData = (data: CandlestickData[]) => {
    if (candlestickSeries) {
      candlestickSeries.setData(data);
    }
  };

  return { chart, candlestickSeries, setCandlestickData };
};

export default useChart;