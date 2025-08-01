export interface DrawingTool {
  id: string;
  type: string;
  points: { x: number; y: number }[];
  options: { [key: string]: any };
  createdAt: number;
}

export interface ChartData {
  id: string;
  symbol: string;
  drawingTools: DrawingTool[];
  createdAt: number;
}