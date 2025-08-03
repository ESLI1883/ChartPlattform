import React, { useRef, useState, useEffect } from 'react';
import useChart from '../../hooks/useChart.ts';
import { fetchMarketData } from '../Services/DataService.ts'; // Pfad korrigiert
import { CandlestickData } from '../../hooks/useChart.ts';
import DrawingToolMenu from '../DrawingToolMenu.js';

interface ChartContainerProps {
  marketType: string;
  symbol: string;
  timeframe: string;
}

const ChartContainer: React.FC<ChartContainerProps> = ({ marketType, symbol, timeframe }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { chart, candlestickSeries, setCandlestickData } = useChart(chartContainerRef);
  const [data, setData] = useState<CandlestickData[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [onToolDeselect, setOnToolDeselect] = useState<(() => void) | null>(null);
  const [onIndicator, setOnIndicator] = useState<(() => void) | null>(null);
  const [seasonSeries, setSeasonSeries] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log(`Loading data for ${marketType}/${symbol}/${timeframe}`);
        const fetchedData = await fetchMarketData(marketType, symbol, timeframe);
        setData(fetchedData);
      } catch (error) {
        console.error('Fehler beim Abrufen der Chart-Daten:', error);
      }
    };
    loadData();
  }, [marketType, symbol, timeframe]);

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