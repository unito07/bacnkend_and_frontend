import React from "react";
import { Button } from "@/components/ui/button";

export default function Results({ data, fieldOrder }) { // Added fieldOrder prop
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

  // NEW FUNCTION
  const downloadCsv = () => {
    if (!displayData || displayData.length === 0) return;

    const escapeCsvCell = (cell) => {
      if (cell === null || cell === undefined) {
        return '';
      }
      const cellString = String(cell);
      // If the cell contains a comma, newline, or double quote, enclose in double quotes
      // and double up any existing double quotes.
      if (cellString.search(/[,\\n"]/) >= 0) {
        return `"${cellString.replace(/"/g, '""')}"`;
      }
      return cellString;
    };

    // Use fieldOrder for headers if available, otherwise fallback to object keys
    const headers = (fieldOrder && fieldOrder.length > 0 && displayData && displayData.length > 0)
      ? fieldOrder
      : (displayData && displayData.length > 0 ? Object.keys(displayData[0]) : []);

    if (headers.length === 0) return; // Cannot generate CSV without headers

    const csvRows = [
      headers.map(escapeCsvCell).join(','), // Header row
      ...displayData.map(row => 
        headers.map(header => escapeCsvCell(row[header])).join(',')
      ) // Data rows
    ];
    const csvString = csvRows.join('\n'); // Corrected: Use actual newline character

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "scraper_results.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderTable = (tableData) => {
    if (!tableData || tableData.length === 0 || typeof tableData[0] !== "object") {
      return <pre className="mt-4 p-4 bg-slate-700 text-slate-200 rounded-md overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>;
    }
    // Use fieldOrder for columns if available, otherwise fallback to object keys
    const columns = (fieldOrder && fieldOrder.length > 0)
      ? fieldOrder
      : Object.keys(tableData[0]);
      
    // Filter out columns from fieldOrder that might not exist in the actual data
    // (e.g. if a field was defined but backend didn't return it for some reason)
    // This also ensures that if fieldOrder is not provided, all keys from data are used.
    const displayColumns = columns.filter(col => tableData[0].hasOwnProperty(col));

    if (displayColumns.length === 0 && Object.keys(tableData[0]).length > 0) {
      // Fallback if fieldOrder resulted in no displayable columns but data exists
      // This case should be rare if fieldOrder is derived from fields that produce the data
      const fallbackColumns = Object.keys(tableData[0]);
      return (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full bg-slate-700 text-slate-200 rounded-md shadow">
            <thead className="bg-slate-600">
              <tr>
                {fallbackColumns.map(col => (
                  <th key={col} className="px-4 py-2 text-left text-sm font-semibold">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className="border-b border-slate-600 last:border-b-0 hover:bg-slate-600/50">
                  {fallbackColumns.map(col => (
                    <td key={col} className="px-4 py-2 text-sm">{String(row[col])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    
    if (displayColumns.length === 0) {
       return <pre className="mt-4 p-4 bg-slate-700 text-slate-200 rounded-md overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>;
    }

    return (
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full bg-slate-700 text-slate-200 rounded-md shadow">
          <thead className="bg-slate-600">
            <tr>
              {displayColumns.map(col => (
                <th key={col} className="px-4 py-2 text-left text-sm font-semibold">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => (
              <tr key={i} className="border-b border-slate-600 last:border-b-0 hover:bg-slate-600/50">
                {displayColumns.map(col => (
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
        <div className="flex space-x-2"> {/* Wrapper for buttons */}
          <Button onClick={downloadJson} variant="outline" className="border-sky-600 text-sky-400 hover:bg-sky-700/20 hover:text-sky-300">
            Download JSON
          </Button>
          {/* NEW BUTTON */}
          <Button onClick={downloadCsv} variant="outline" className="border-green-600 text-green-400 hover:bg-green-700/20 hover:text-green-300">
            Download CSV
          </Button>
        </div>
      </div>
      {displayData ? renderTable(displayData) : (
        <pre className="mt-4 p-4 bg-slate-700 text-slate-200 rounded-md overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
