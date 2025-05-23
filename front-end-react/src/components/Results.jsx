import React from "react";
import { Button } from "@/components/ui/button";

export default function Results({ data }) {
  if (!data) return null;

  const downloadJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "scraper_results.json";
    link.click();
  };

  const renderTable = (tableData) => {
    if (!tableData || tableData.length === 0 || typeof tableData[0] !== "object") {
      return <pre className="mt-4 p-4 bg-slate-700 text-slate-200 rounded-md overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>;
    }
    const columns = Object.keys(tableData[0]);
    return (
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full bg-slate-700 text-slate-200 rounded-md shadow">
          <thead className="bg-slate-600">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-4 py-2 text-left text-sm font-semibold">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => (
              <tr key={i} className="border-b border-slate-600 last:border-b-0 hover:bg-slate-600/50">
                {columns.map(col => (
                  <td key={col} className="px-4 py-2 text-sm">{String(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  let displayData;
  if (typeof data === "object" && data !== null && Array.isArray(data.results)) {
    displayData = data.results;
  } else if (Array.isArray(data)) {
    displayData = data;
  }

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-semibold text-white">Results</h3>
        <Button onClick={downloadJson} variant="outline" className="border-sky-600 text-sky-400 hover:bg-sky-700/20 hover:text-sky-300">
          Download JSON
        </Button>
      </div>
      {displayData ? renderTable(displayData) : (
        <pre className="mt-4 p-4 bg-slate-700 text-slate-200 rounded-md overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
