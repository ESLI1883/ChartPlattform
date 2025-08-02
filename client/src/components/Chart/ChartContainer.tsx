import React, { useRef, useState, useEffect } from 'react';
import useChart from '../../hooks/useChart';
import { fetchChartData } from '../../services/api';
import { CandlestickData } from '../../hooks/useChart';
import DrawingToolMenu from '../DrawingToolMenu';

interface ChartContainerProps {
  symbol: string;
  timeframe: string;
}

const ChartContainer: React.FC<ChartContainerProps> = ({ symbol, timeframe }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { chart, candlestickSeries, setCandlestickData } = useChart(chartContainerRef);
  const [data, setData] = useState<CandlestickData[]>([]);
  const [marketType, setMarketType] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [onToolDeselect, setOnToolDeselect] = useState<(() => void) | null>(null);
  const [onIndicator, setOnIndicator] = useState<(() => void) | null>(null);
  const [seasonSeries, setSeasonSeries] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchedData = await fetchChartData(symbol, timeframe);
        setData(fetchedData);
      } catch (error) {
        console.error('Fehler beim Abrufen der Chart-Daten:', error);
      }
    };
    loadData();
  }, [symbol, timeframe]);

  useEffect(() => {
    if (candlestickSeries && data.length > 0) {
      setCandlestickData(data);
    }
  }, [data, candlestickSeries, setCandlestickData]);

  return (
    <div>
      <div ref={chartContainerRef} style={{ width: '100%', height: '500px' }} />
      <DrawingToolMenu
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        onToolDeselect={onToolDeselect}
        setOnToolDeselect={setOnToolDeselect}
        onIndicator={onIndicator}
        setOnIndicator={setOnIndicator}
      />
    </div>
  );
};

export default ChartContainer;