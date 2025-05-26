import React, { createContext, useState, useEffect, useContext } from 'react';

const initialScraperFormData = {
  staticUrl: "",
  dynamicUrl: "",
  dynamicContainerSelector: "",
  dynamicEnableScrolling: false,
  dynamicMaxScrolls: 5,
  dynamicFields: [{ name: "", selector: "" }],
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

  useEffect(() => {
    try {
      localStorage.setItem('scraperFormData', JSON.stringify(formData));
    } catch (error) {
      console.error("Error stringifying scraperFormData to localStorage", error);
    }
  }, [formData]);

  return (
    <ScraperFormContext.Provider value={{ formData, setFormData }}>
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
