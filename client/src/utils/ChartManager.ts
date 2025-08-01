import { ChartData, DrawingTool } from '../types';
import { db } from '../db'; // MySQL-Verbindung (z.B. mit mysql2)

export class ChartManager {
  static async createChart(symbol: string): Promise<string> {
    const chartId = crypto.randomUUID();
    const query = `
      INSERT INTO charts (id, symbol, created_at)
      VALUES (?, ?, ?)
    `;
    await db.execute(query, [chartId, symbol, new Date().toISOString()]);
    return chartId;
  }

  static async saveChart(chartId: string, drawingTools: DrawingTool[]): Promise<void> {
    const deleteQuery = `DELETE FROM drawing_tools WHERE chart_id = ?`;
    await db.execute(deleteQuery, [chartId]);

    const insertQuery = `
      INSERT INTO drawing_tools (id, chart_id, type, points, options, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    for (const tool of drawingTools) {
      await db.execute(insertQuery, [
        tool.id,
        chartId,
        tool.type,
        JSON.stringify(tool.points),
        JSON.stringify(tool.options),
        new Date(tool.createdAt).toISOString(),
      ]);
    }
  }

  static async getChart(chartId: string): Promise<ChartData> {
    const [charts] = await db.query(`SELECT * FROM charts WHERE id = ?`, [chartId]);
    if (!charts.length) throw new Error('Chart nicht gefunden');

    const [tools] = await db.query(`SELECT * FROM drawing_tools WHERE chart_id = ?`, [chartId]);
    return {
      id: charts[0].id,
      symbol: charts[0].symbol,
      createdAt: new Date(charts[0].created_at).getTime(),
      drawingTools: tools.map((tool: any) => ({
        id: tool.id,
        type: tool.type,
        points: JSON.parse(tool.points),
        options: JSON.parse(tool.options),
        createdAt: new Date(tool.created_at).getTime(),
      })),
    };
  }

  static async getSavedCharts(): Promise<ChartData[]> {
    const [charts] = await db.query(`SELECT * FROM charts`);
    return Promise.all(
      charts.map(async (chart: any) => {
        const [tools] = await db.query(`SELECT * FROM drawing_tools WHERE chart_id = ?`, [chart.id]);
        return {
          id: chart.id,
          symbol: chart.symbol,
          createdAt: new Date(chart.created_at).getTime(),
          drawingTools: tools.map((tool: any) => ({
            id: tool.id,
            type: tool.type,
            points: JSON.parse(tool.points),
            options: JSON.parse(tool.options),
            createdAt: new Date(tool.created_at).getTime(),
          })),
        };
      })
    );
  }
}