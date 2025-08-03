import React, { useState, useEffect } from 'react';
import { Tabs, Tab, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import Chart from '../Chart/Chart.tsx';
import { fetchMarketData } from '../Services/DataService.ts';

interface ChartTab {
  id: number;
  symbol: string;
  timeframe: string;
  marketType: string;
  data: any[];
  selectedTool: string | null;
}

interface ChartManagerProps {
  onChartUpdate: (marketType: string, symbol: string, timeframe: string) => void;
  onToolSelect: (tool: string | null) => void;
}

const ChartManager: React.FC<ChartManagerProps> = ({ onChartUpdate, onToolSelect }) => {
  const [charts, setCharts] = useState<ChartTab[]>([
    { id: 1, symbol: 'EURUSD', timeframe: 'D1', marketType: 'forex', data: [], selectedTool: null },
  ]);
  const [selectedTab, setSelectedTab] = useState(1);

  const loadChartData = async (marketType: string, symbol: string, timeframe: string): Promise<any[]> => {
    try {
      const data = await fetchMarketData(marketType, symbol, timeframe);
      console.log('ChartManager: Loaded Chart Data for:', { marketType, symbol, timeframe }, data);
      return data || [];
    } catch (err) {
      console.error('ChartManager: Fehler beim Laden der Daten:', err);
      return [];
    }
  };

  const updateChart = async (marketType: string, symbol: string, timeframe: string, chartId: number) => {
    console.log('ChartManager: Updating chart with:', { marketType, symbol, timeframe, chartId });
    const data = await loadChartData(marketType, symbol, timeframe);
    setCharts(prevCharts => prevCharts.map(c => c.id === chartId ? { ...c, marketType, symbol, timeframe, data } : c));
    onChartUpdate(marketType, symbol, timeframe); // Weiterleitung an App
  };

  const addNewChart = async (marketType: string, symbol: string, timeframe: string) => {
    const newId = Math.max(...charts.map(c => c.id), 0) + 1;
    const data = await loadChartData(marketType, symbol, timeframe);
    setCharts(prevCharts => [...prevCharts, { id: newId, symbol, timeframe, marketType, data, selectedTool: null }]);
    setSelectedTab(newId);
  };

  // Entferne die statische Initialisierung, da sie durch handleUpdateFromControl ersetzt wird
  // useEffect(() => { ... }, []); wird entfernt

  const handleUpdateFromControl = (marketType: string, symbol: string, timeframe: string) => {
    console.log('ChartManager: Update from ControlPanel received:', { marketType, symbol, timeframe });
    const currentChart = charts.find(c => c.id === selectedTab);
    if (currentChart) {
      updateChart(marketType, symbol, timeframe, currentChart.id);
    }
  };

  return (
    <div>
      <Tabs selectedIndex={charts.findIndex(c => c.id === selectedTab)} onSelect={(index) => setSelectedTab(charts[index].id)}>
        {charts.map(chart => (
          <Tab key={chart.id}>{chart.symbol} - {chart.timeframe}</Tab>
        ))}
        <TabPanel>
          {charts.map(chart => (
            selectedTab === chart.id && (
              <Chart
                key={chart.id}
                chartId={chart.id}
                data={chart.data}
                marketType={chart.marketType}
                symbol={chart.symbol}
                timeframe={chart.timeframe}
                selectedTool={chart.selectedTool}
                onToolDeselect={() => setCharts(prevCharts => prevCharts.map(c => c.id === chart.id ? { ...c, selectedTool: null } : c))}
                onAddIndicator={() => {}}
                onChartUpdate={handleUpdateFromControl}
              />
            )
          ))}
        </TabPanel>
      </Tabs>
      <button onClick={() => addNewChart('forex', 'GBPUSD', 'H4')}>Add New Chart</button>
    </div>
  );
};

export default ChartManager;