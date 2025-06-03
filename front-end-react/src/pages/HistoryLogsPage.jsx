import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner'; // Assuming sonner is used for notifications as per Shadcn typical setup
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, RotateCw, FolderCog, Eye, XCircle, Download, ChevronLeft, ChevronRight } from 'lucide-react'; // Added Download, ChevronLeft, ChevronRight icons
import DateRangePicker from '@/components/custom/DateRangePicker'; // Import the new component
import StatusPicker from '@/components/custom/StatusPicker'; // Import the new StatusPicker
import { format } from 'date-fns'; // Import format

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const ROWS_PER_PAGE = 10;

function HistoryLogsPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logPath, setLogPath] = useState('');
  const [newLogPath, setNewLogPath] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false); // For modal loading
  const [filterStartDate, setFilterStartDate] = useState(null);
  const [filterEndDate, setFilterEndDate] = useState(null);
  const [filterStatus, setFilterStatus] = useState(''); // For status filter
  const [currentTablePage, setCurrentTablePage] = useState(1); // State for client-side table pagination

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/logs`;
      const params = new URLSearchParams();
      if (filterStartDate) {
        params.append('start_date', format(filterStartDate, 'yyyy-MM-dd'));
      }
      if (filterEndDate) {
        params.append('end_date', format(filterEndDate, 'yyyy-MM-dd'));
      }
      if (filterStatus) {
        params.append('status', filterStatus);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setLogs(data);
    } catch (e) {
      setError(e.message);
      toast.error(`Failed to fetch logs: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [filterStartDate, filterEndDate, filterStatus]);

  const fetchLogPath = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/logs/config/path`);
      if (!response.ok) throw new Error('Failed to fetch log path');
      const data = await response.json();
      setLogPath(data.path);
      setNewLogPath(data.path);
    } catch (e) {
      toast.error(`Failed to fetch log path: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchLogPath();
  }, [fetchLogs, fetchLogPath]);

  const handleDateRangeApply = (start, end) => {
    setFilterStartDate(start);
    setFilterEndDate(end);
  };

  const handleSetLogPath = async () => {
    if (!newLogPath.trim()) {
        toast.error("Log path cannot be empty.");
        return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/logs/config/path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newLogPath }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to set log path');
      }
      const result = await response.json();
      setLogPath(result.path);
      toast.success(result.message);
      fetchLogs();
    } catch (e) {
      toast.error(`Error setting log path: ${e.message}`);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm("Are you sure you want to delete this log entry?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/logs/${logId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to delete log');
      }
      toast.success('Log entry deleted successfully.');
      fetchLogs();
    } catch (e) {
      toast.error(`Error deleting log: ${e.message}`);
    }
  };

  const handleClearAllLogs = async () => {
    const filtersActive = filterStartDate || filterEndDate || filterStatus;
    let confirmMessage = "Are you sure you want to delete ALL log entries? This action cannot be undone.";
    let url = `${API_BASE_URL}/logs/clear`;
    const params = new URLSearchParams();

    if (filtersActive) {
      let filterDetails = [];
      if (filterStartDate) {
        params.append('start_date', format(filterStartDate, 'yyyy-MM-dd'));
        filterDetails.push(`Start Date: ${format(filterStartDate, 'MMM d, yyyy')}`);
      }
      if (filterEndDate) {
        params.append('end_date', format(filterEndDate, 'yyyy-MM-dd'));
        filterDetails.push(`End Date: ${format(filterEndDate, 'MMM d, yyyy')}`);
      }
      if (filterStatus) {
        params.append('status', filterStatus);
        filterDetails.push(`Status: ${filterStatus}`);
      }
      confirmMessage = `Are you sure you want to delete logs matching the current filters (${filterDetails.join(', ')})? This action cannot be undone.`;
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    if (!window.confirm(confirmMessage)) return;

    if (!filtersActive) {
      // Second confirmation only if no filters are active (deleting all)
      if (!window.confirm("This will delete ALL logs permanently. Are you absolutely sure?")) return;
    }

    try {
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to clear logs');
      }
      const result = await response.json();
      toast.success(result.message || `${result.deleted_count || 0} log(s) cleared.`);
      fetchLogs(); // Refresh the logs list
    } catch (e) {
      toast.error(`Error clearing logs: ${e.message}`);
    }
  };

  const openDetailModal = async (logSummary) => {
    setIsFetchingDetail(true);
    setSelectedLog(null);
    setCurrentTablePage(1); // Reset table page when opening new modal
    setIsDetailModalOpen(true);
    try {
      const response = await fetch(`${API_BASE_URL}/logs/${logSummary.id}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `Failed to fetch log details: ${response.status}`);
      }
      const fullLogData = await response.json();
      setSelectedLog(fullLogData);
    } catch (e) {
      toast.error(`Failed to load log details: ${e.message}`);
    } finally {
      setIsFetchingDetail(false);
    }
  };
  
 const formatTimestamp = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const options = {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
      };
      return new Intl.DateTimeFormat('en-US', options).format(new Date(isoString));
    } catch (e) {
      console.error("Error formatting timestamp:", e, "Original string:", isoString);
      return isoString;
    }
  };

  const getProcessedDataForDisplayAndDownload = (scrapedData, requestPayload, scrapeType) => {
    const isTableDisplayType = scrapeType === 'Dynamic' || scrapeType === 'Dynamic (Paginated)' || scrapeType === 'interactive-scrape' || scrapeType === 'Interactive';
    if (isTableDisplayType && Array.isArray(scrapedData) && scrapedData.length > 0) {
      let columns = [];
      if (requestPayload && Array.isArray(requestPayload.custom_fields) && requestPayload.custom_fields.length > 0) {
        columns = requestPayload.custom_fields.map(field => field.name);
      } else if (scrapedData.length > 0 && typeof scrapedData[0] === 'object' && scrapedData[0] !== null) {
        columns = Object.keys(scrapedData[0]);
      }
      let dataToProcess = [...scrapedData];
      if (columns.length > 0 && dataToProcess.length > 0 && dataToProcess[0]) {
        const commonKeyNames = ["name", "title", "product", "item", "heading", "header"];
        let identifiedKeyField = null;
        for (const fieldNameFromOrder of columns) {
          if (dataToProcess[0].hasOwnProperty(fieldNameFromOrder) && commonKeyNames.includes(fieldNameFromOrder.toLowerCase())) {
            identifiedKeyField = fieldNameFromOrder;
            break;
          }
        }
        if (identifiedKeyField) {
          dataToProcess = dataToProcess.filter(row => {
            const keyValue = row[identifiedKeyField];
            return keyValue !== null && keyValue !== undefined && String(keyValue).trim() !== '';
          });
        }
      }
      const displayTableColumns = (columns.length > 0 && dataToProcess.length > 0 && dataToProcess[0])
        ? columns.filter(col => dataToProcess[0].hasOwnProperty(col))
        : (dataToProcess.length > 0 && dataToProcess[0] ? Object.keys(dataToProcess[0]) : []);
      return { processedData: dataToProcess, columns: displayTableColumns, isEmpty: dataToProcess.length === 0 };
    }
    return { processedData: scrapedData, columns: [], isEmpty: scrapedData === null || typeof scrapedData === 'undefined' || (Array.isArray(scrapedData) && scrapedData.length === 0) };
  };

  const downloadJsonData = (data, filename = 'scraped_data.json') => {
    if (data === null || typeof data === 'undefined') {
      toast.error("No data available to download.");
      return;
    }
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = filename;
    link.click();
    toast.success("JSON download started.");
  };

  const downloadCsvData = (data, columns, filename = 'scraped_data.csv') => {
    if (!data || data.length === 0) {
      toast.error("No data available to download for CSV.");
      return;
    }
    const escapeCsvCell = (cell) => {
      if (cell === null || cell === undefined) return '';
      const cellString = String(cell);
      if (cellString.search(/[,\\n"]/) >= 0) return `"${cellString.replace(/"/g, '""')}"`;
      return cellString;
    };
    const headers = columns && columns.length > 0 ? columns : (data.length > 0 ? Object.keys(data[0]) : []);
    if (headers.length === 0) {
      toast.error("Cannot generate CSV without headers.");
      return;
    }
    const csvRows = [
      headers.map(escapeCsvCell).join(','),
      ...data.map(row => headers.map(header => escapeCsvCell(row[header])).join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV download started.");
  };

  const handleDownloadFiltered = (formatType) => {
    if (logs.length === 0) {
      toast.info("No logs to download based on current filters.");
      return;
    }

    if (logs.length > 10 && !window.confirm(`This will initiate ${logs.length} separate file downloads. Are you sure you want to proceed?`)) {
      toast.info("Download cancelled by user.");
      return;
    }
    
    toast.info(`Initiating ${logs.length} file download(s)...`);

    logs.forEach((log, index) => {
      // Add a delay for each download to help browsers manage multiple downloads
      setTimeout(() => {
        // Get processed (filtered) data and columns
        const { processedData, columns: derivedColumns, isEmpty } = getProcessedDataForDisplayAndDownload(
          log.scrapedData,
          log.requestPayload,
          log.scrapeType
        );

        const filename = `log_${log.id}_${log.scrapeType.replace(/[\s()]/g, '_')}_${new Date(log.timestamp).toISOString().split('T')[0]}.${formatType}`;

        if (isEmpty && formatType === "csv") { // For CSV, if processed data is empty, toast and skip.
          toast.warn(`Skipping CSV download for log ${log.id}: No data after filtering or data is empty.`);
          return;
        }
        if (processedData === null || typeof processedData === 'undefined') { // For JSON, check if processedData is null/undefined
          toast.warn(`Skipping download for log ${log.id}: Scraped data is null or undefined.`);
          return;
        }
        
        if (formatType === "json") {
          // For JSON, we typically download the original structure if it exists,
          // or the processedData if it's more relevant (e.g. if filtering also implies structural changes, though not in this case)
          // Here, downloading log.scrapedData (original) might be preferred by users for JSON.
          // However, to be consistent with "what you see is what you get", using processedData.
          // If original is strictly needed, this could be `downloadJsonData(log.scrapedData, filename);`
          downloadJsonData(processedData, filename);
        } else if (formatType === "csv") {
          // For Static type, if processedData is a string, wrap it for CSV
          if (log.scrapeType === 'Static' && typeof processedData === 'string') {
            if (processedData.trim() !== '') {
              const staticCsvData = [{ scrapedData: processedData }];
              downloadCsvData(staticCsvData, ["scrapedData"], filename);
            } else {
              toast.warn(`Skipping CSV download for log ${log.id} (Static): Scraped data string is empty after processing.`);
            }
          } else if (Array.isArray(processedData)) {
            // For table-like data, use processedData and derivedColumns
            downloadCsvData(processedData, derivedColumns, filename);
          } else {
            toast.warn(`Skipping CSV download for log ${log.id}: Data is not in a recognized format for CSV after processing (Type: ${log.scrapeType}).`);
          }
        }
      }, index * 500); // 500ms delay between each download initiation
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">History Logs</h1>
      <div className="mb-6 p-4 border rounded-lg shadow-sm bg-card">
        <h2 className="text-xl font-semibold mb-2">Log Storage Configuration</h2>
        <p className="text-sm text-muted-foreground mb-1">Current log storage path: <code>{logPath || 'Not set or loading...'}</code></p>
        <div className="flex items-center gap-2 mt-2">
          <Input type="text" value={newLogPath} onChange={(e) => setNewLogPath(e.target.value)} placeholder="Enter new absolute log path" className="max-w-md" />
          <Button onClick={handleSetLogPath} variant="outline" size="sm"><FolderCog className="mr-2 h-4 w-4" /> Set Path</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Note: The path must be accessible by the backend server. Changes may require a server restart if the old path was cached.</p>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <h2 className="text-2xl font-semibold">Scrape History</h2>
        <div className="flex flex-wrap gap-2">
          <DateRangePicker onApply={handleDateRangeApply} initialStartDate={filterStartDate} initialEndDate={filterEndDate} />
          <StatusPicker currentStatus={filterStatus} onStatusChange={setFilterStatus} />
          <Button onClick={fetchLogs} variant="outline" size="sm" disabled={isLoading}><RotateCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh</Button>
          <Button onClick={handleClearAllLogs} variant="destructive" size="sm" disabled={isLoading || logs.length === 0}><XCircle className="mr-2 h-4 w-4" /> Clear Logs</Button>
          <Button onClick={() => handleDownloadFiltered("json")} variant="outline" size="sm" disabled={isLoading || logs.length === 0}><Download className="mr-2 h-4 w-4" /> Download JSON</Button>
          <Button onClick={() => handleDownloadFiltered("csv")} variant="outline" size="sm" disabled={isLoading || logs.length === 0}><Download className="mr-2 h-4 w-4" /> Download CSV</Button>
        </div>
      </div>
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}
      {isLoading && logs.length === 0 && <p>Loading logs...</p>}
      {!isLoading && !error && logs.length === 0 && (<p className="text-muted-foreground">No log entries found. Perform some scrapes to see history here.</p>)}
      {logs.length > 0 && (
        <ScrollArea className="h-[500px] w-full rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Type</TableHead><TableHead>URL</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                  <TableCell>{log.scrapeType}</TableCell>
                  <TableCell className="max-w-xs truncate" title={log.targetUrl}>{log.targetUrl}</TableCell>
                  <TableCell><span className={`px-2 py-1 text-xs font-semibold rounded-full ${log.status === 'Success' ? 'bg-green-100 text-green-800' : log.status === 'Failed' ? 'bg-red-100 text-red-800' : log.status === 'Cancelled' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{log.status}</span></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openDetailModal(log)} className="mr-1 px-2" disabled={isFetchingDetail}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteLog(log.id)} className="text-red-500 hover:text-red-700 px-2" disabled={isFetchingDetail}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
      {selectedLog && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Log Details: {selectedLog ? selectedLog.id : 'Loading...'}</DialogTitle>
              {selectedLog && (<DialogDescription>Timestamp: {formatTimestamp(selectedLog.timestamp)}</DialogDescription>)}
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] mt-4 pr-6">
              {isFetchingDetail && <p>Loading details...</p>}
              {!isFetchingDetail && selectedLog && (
                <div className="grid gap-3 text-sm">
                  <div className="grid grid-cols-[150px_1fr] items-start"><strong>Scrape Type:</strong> {selectedLog.scrapeType}</div>
                  <div className="grid grid-cols-[150px_1fr] items-start"><strong>Target URL:</strong> <span className="break-all">{selectedLog.targetUrl}</span></div>
                  <div className="grid grid-cols-[150px_1fr] items-start"><strong>Status:</strong> {selectedLog.status}</div>
                  {selectedLog.errorMessage && (<div className="grid grid-cols-[150px_1fr] items-start"><strong>Error:</strong> <pre className="whitespace-pre-wrap break-all bg-muted p-2 rounded-md text-xs">{selectedLog.errorMessage}</pre></div>)}
                  {selectedLog.requestPayload && (<div className="grid grid-cols-[150px_1fr] items-start"><strong>Request Payload:</strong> <pre className="whitespace-pre-wrap break-all bg-muted p-2 rounded-md text-xs">{JSON.stringify(selectedLog.requestPayload, null, 2)}</pre></div>)}
                  <div className="col-span-full mt-2">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">Scraped Data:</h4>
                      {selectedLog.scrapedData && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { const { processedData } = getProcessedDataForDisplayAndDownload(selectedLog.scrapedData, selectedLog.requestPayload, selectedLog.scrapeType); downloadJsonData(processedData, `log_${selectedLog.id}_scraped_data.json`); }}>
                            <Download className="mr-2 h-4 w-4" /> JSON
                          </Button>
                          {(
                            selectedLog.scrapeType === 'Dynamic' ||
                            selectedLog.scrapeType === 'Dynamic (Paginated)' ||
                            selectedLog.scrapeType === 'interactive-scrape' ||
                            selectedLog.scrapeType === 'Interactive'
                           ) && Array.isArray(selectedLog.scrapedData) && (
                            <Button variant="outline" size="sm" onClick={() => { const { processedData, columns } = getProcessedDataForDisplayAndDownload(selectedLog.scrapedData, selectedLog.requestPayload, selectedLog.scrapeType); downloadCsvData(processedData, columns, `log_${selectedLog.id}_scraped_data.csv`); }}>
                              <Download className="mr-2 h-4 w-4" /> CSV
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    {renderScrapedDataDisplay(selectedLog.scrapedData, selectedLog.requestPayload, selectedLog.scrapeType, getProcessedDataForDisplayAndDownload, currentTablePage, setCurrentTablePage)}
                  </div>
                </div>
              )}
              {!isFetchingDetail && !selectedLog && <p>Could not load log details.</p>}
            </ScrollArea>
            <DialogFooter className="mt-4"><Button onClick={() => setIsDetailModalOpen(false)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const renderScrapedDataDisplay = (scrapedData, requestPayload, scrapeType, getProcessedDataFn, currentTablePage, setCurrentTablePage) => {
  const { processedData, columns, isEmpty } = getProcessedDataFn(scrapedData, requestPayload, scrapeType);
  const isTableDisplayType = scrapeType === 'Dynamic' || scrapeType === 'Dynamic (Paginated)' || scrapeType === 'interactive-scrape' || scrapeType === 'Interactive';

  if (isEmpty && isTableDisplayType && Array.isArray(scrapedData) && scrapedData.length > 0) {
    return <p className="text-muted-foreground text-xs">All scraped data rows were filtered out. <pre className="mt-1 p-1 bg-gray-800 text-gray-300 text-xs rounded">{JSON.stringify(scrapedData, null, 2)}</pre></p>;
  }
  if (isEmpty) {
    return <p className="text-muted-foreground text-xs">No scraped data available or data is empty.</p>;
  }

  if (scrapeType === 'Static' && typeof processedData === 'string') {
    return <ScrollArea className="h-[300px] w-full rounded-md border bg-muted"><pre className="p-2 text-xs">{processedData}</pre></ScrollArea>;
  }

  if (isTableDisplayType && Array.isArray(processedData) && processedData.length > 0) {
    if (columns.length === 0) {
      return <ScrollArea className="h-[300px] w-full rounded-md border bg-muted"><pre className="p-2 text-xs">{JSON.stringify(processedData, null, 2)}</pre></ScrollArea>;
    }

    const pageCount = Math.ceil(processedData.length / ROWS_PER_PAGE);
    const paginatedData = processedData.slice((currentTablePage - 1) * ROWS_PER_PAGE, currentTablePage * ROWS_PER_PAGE);

    return (
      <>
        <ScrollArea className="h-[300px] w-full rounded-md border">
          <Table className="text-xs">
            <TableHeader><TableRow>{columns.map(colName => <TableHead key={colName}>{colName}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {paginatedData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map(colName => (
                    <TableCell key={colName} className="max-w-[200px] truncate" title={String(row[colName])}>
                      {row[colName] === null || typeof row[colName] === 'undefined' ? 'N/A' : String(row[colName])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        {pageCount > 1 && (
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button variant="outline" size="sm" onClick={() => setCurrentTablePage(prev => Math.max(1, prev - 1))} disabled={currentTablePage === 1}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {currentTablePage} of {pageCount}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentTablePage(prev => Math.min(pageCount, prev + 1))} disabled={currentTablePage === pageCount}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </>
    );
  }

  return <ScrollArea className="h-[300px] w-full rounded-md border bg-muted"><pre className="p-2 text-xs">{JSON.stringify(processedData, null, 2)}</pre></ScrollArea>;
};

export default HistoryLogsPage;
