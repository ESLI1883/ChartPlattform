import { createChart } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

const Chart = ({ data }) => {
  const chartContainerRef = useRef();

  useEffect(() => {
    // Erstelle das Chart
    const chart = createChart(chartContainerRef.current, {
      width: 800,
      height: 400,
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    // Füge Candlestick-Serie hinzu
    const candlestickSeries = chart.addCandlestickSeries();
    candlestickSeries.setData(data);

    // Cleanup beim Unmount
    return () => chart.remove();
  }, [data]);

  return <div ref={chartContainerRef} />;
};

export default Chart;
