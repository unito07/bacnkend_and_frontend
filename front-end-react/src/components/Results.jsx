import React from "react";

export default function Results({ data }) {
  if (!data) return null;

  // If data is an array of objects, display as table
  if (Array.isArray(data) && data.length && typeof data[0] === "object") {
    const columns = Object.keys(data[0]);
    return (
      <table className="result-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td key={col}>{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // If data is an object, display key-value pairs
  if (typeof data === "object") {
    return (
      <table className="result-table">
        <tbody>
          {Object.entries(data).map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td>{Array.isArray(v) ? v.join(", ") : String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // Otherwise, just display as text
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
