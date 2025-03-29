import { createChart, CandlestickSeries } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

const Chart = ({ data }) => {
  const chartContainerRef = useRef();

  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: 1400,
      height: 600,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    candlestickSeries.setData(data);

    return () => chart.remove();
  }, [data]);

  return <div ref={chartContainerRef} />;
};

export default Chart;
