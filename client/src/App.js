import logo from './logo.svg';
import './App.css';
import Chart from './components/Chart';

// Dummy-Daten (1 Tag, 5-min-Kerzen)
const dummyData = [
  { time: '2025-03-29 09:00', open: 100, high: 102, low: 99, close: 101 },
  { time: '2025-03-29 09:05', open: 101, high: 103, low: 100, close: 102 },
  { time: '2025-03-29 09:10', open: 102, high: 104, low: 101, close: 103 },
  { time: '2025-03-29 09:15', open: 103, high: 105, low: 102, close: 104 },
];

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Market Simulation</h1>
      <Chart data={dummyData} />
    </div>
  );
}

export default App;
