import React from 'react';

const DrawingTools: React.FC<{ onToolSelect: (tool: string | null) => void; onCategoryClose: () => void }> = ({ onToolSelect, onCategoryClose }) => {
  console.log('DrawingTools rendering');
  return (
    <div>
      <button onClick={() => onToolSelect('trendline')}>Trendline</button>
      <button onClick={() => onToolSelect(null)}>Close</button>
    </div>
  );
};

export default DrawingTools;