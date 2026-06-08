import { createContext, useContext, useState, ReactNode } from 'react';
import type { TriageResult } from '../types';

interface TriageContextType {
  triageMap: Map<string, TriageResult>;
  recordTriage: (key: string, result: TriageResult) => void;
  getScenarioTriages: (scenarioId: string) => TriageResult[];
}

const TriageContext = createContext<TriageContextType | undefined>(undefined);

export function TriageProvider({ children }: { children: ReactNode }) {
  const [triageMap, setTriageMap] = useState<Map<string, TriageResult>>(new Map());

  const recordTriage = (key: string, result: TriageResult) => {
    setTriageMap(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(key)) {
        newMap.set(key, result);
      }
      return newMap;
    });
  };

  const getScenarioTriages = (scenarioId: string) => {
    return Array.from(triageMap.values()).filter(t => t.scenarioId === scenarioId);
  };

  return (
    <TriageContext.Provider value={{ triageMap, recordTriage, getScenarioTriages }}>
      {children}
    </TriageContext.Provider>
  );
}

export function useTriage() {
  const context = useContext(TriageContext);
  if (!context) {
    throw new Error('useTriage must be used within a TriageProvider');
  }
  return context;
}
