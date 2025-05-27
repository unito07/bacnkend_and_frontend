import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const initialScraperFormData = {
  staticUrl: "",
  dynamicUrl: "",
  dynamicContainerSelector: "",
  dynamicEnableScrolling: false,
  dynamicMaxScrolls: 5,
  dynamicFields: [{ name: "", selector: "" }],
  dynamicEnablePagination: false,
  dynamicStartPage: 1,
  dynamicEndPage: 5,
  dynamicPaginationType: "Next Button", // Options: "Next Button", "URL Parameter"
  dynamicPageParam: "page", // Default for URL parameter type
  dynamicNextButtonSelector: "", // User will typically provide this
};

const initialScrapeOperationState = {
  scrapeType: null, // 'static' or 'dynamic'
  isLoadingScrape: false,
  scrapeResults: null,
  scrapeError: null,
  lastOperationKey: null, // To identify the specific scrape request
  taskId: null, // To store the task_id for potential cancellation
};

export const ScraperFormContext = createContext();

export const ScraperFormProvider = ({ children }) => {
  const [formData, setFormData] = useState(() => {
    try {
      const savedData = localStorage.getItem('scraperFormData');
      return savedData ? JSON.parse(savedData) : initialScraperFormData;
    } catch (error) {
      console.error("Error parsing scraperFormData from localStorage", error);
      return initialScraperFormData;
    }
  });

  const [scrapeOperation, setScrapeOperation] = useState(initialScrapeOperationState);

  useEffect(() => {
    try {
      localStorage.setItem('scraperFormData', JSON.stringify(formData));
    } catch (error) {
      console.error("Error stringifying scraperFormData to localStorage", error);
    }
  }, [formData]);

  const startScrapeOperation = useCallback((type, operationKey, taskId = null) => {
    setScrapeOperation({
      scrapeType: type,
      isLoadingScrape: true,
      scrapeResults: null,
      scrapeError: null,
      lastOperationKey: operationKey,
      taskId: taskId,
    });
  }, []);

  const setScrapeOperationSuccess = useCallback((operationKey, results) => {
    setScrapeOperation(prev => {
      if (prev.lastOperationKey === operationKey) {
        // If the backend explicitly sent a "cancelled" status, treat it as a cancellation
        if (results && results.operation_status === "cancelled") {
          console.log(`Operation ${operationKey} was reported as cancelled by backend.`);
          return {
            ...prev,
            isLoadingScrape: false,
            scrapeError: "Scrape operation was cancelled by the user.",
            scrapeResults: null, // Clear results for cancelled operations
          };
        }
        // Otherwise, it's a true success
        return {
          ...prev,
          isLoadingScrape: false,
          scrapeResults: results,
          scrapeError: null,
          // Keep taskId, it might be useful for history or re-running
        };
      }
      return prev; // If operationKey doesn't match, don't update (stale update)
    });
  }, []);

  const setScrapeOperationError = useCallback((operationKey, error) => {
    setScrapeOperation(prev => {
      if (prev.lastOperationKey === operationKey) {
        return {
          ...prev,
          isLoadingScrape: false,
          scrapeResults: null,
          scrapeError: error,
        };
      }
      return prev;
    });
  }, []);
  
  const setScrapeOperationCancelled = useCallback((operationKey) => {
    setScrapeOperation(prev => {
      if (prev.lastOperationKey === operationKey && prev.isLoadingScrape) {
        return {
          ...prev,
          isLoadingScrape: false,
          scrapeError: "Scrape operation was cancelled by the user.",
          // Optionally clear results or set a specific status
        };
      }
      return prev;
    });
  }, []);

  const clearScrapeOperation = useCallback(() => {
    setScrapeOperation(initialScrapeOperationState);
  }, []);
  
  const updateTaskId = useCallback((operationKey, taskId) => {
    setScrapeOperation(prev => {
      if (prev.lastOperationKey === operationKey) {
        return { ...prev, taskId: taskId };
      }
      return prev;
    });
  }, []);


  return (
    <ScraperFormContext.Provider value={{ 
      formData, 
      setFormData,
      scrapeOperation,
      startScrapeOperation,
      setScrapeOperationSuccess,
      setScrapeOperationError,
      setScrapeOperationCancelled,
      clearScrapeOperation,
      updateTaskId
    }}>
      {children}
    </ScraperFormContext.Provider>
  );
};

export const useScraperForm = () => {
  const context = useContext(ScraperFormContext);
  if (!context) {
    throw new Error('useScraperForm must be used within a ScraperFormProvider');
  }
  return context;
};
