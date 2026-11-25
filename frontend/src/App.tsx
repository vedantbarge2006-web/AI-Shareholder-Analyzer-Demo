import React from 'react';
import { FinancialDataProvider, useFinancialData } from './context/FinancialDataContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { FinancialInput } from './pages/FinancialInput';
import { ValueAnalysis } from './pages/ValueAnalysis';
import { AiInsights } from './pages/AiInsights';
import { ScenarioSimulator } from './pages/ScenarioSimulator';
import { Reports } from './pages/Reports';
import { AiSettings } from './pages/AiSettings';

const AppContent: React.FC = () => {
  const { activeTab } = useFinancialData();

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'input':
        return <FinancialInput />;
      case 'analysis':
        return <ValueAnalysis />;
      case 'insights':
        return <AiInsights />;
      case 'simulator':
        return <ScenarioSimulator />;
      case 'reports':
        return <Reports />;
      case 'ai_settings':
        return <AiSettings />;
      default:
        return <Dashboard />;
    }
  };

  return <Layout>{renderActivePage()}</Layout>;
};

export function App() {
  return (
    <FinancialDataProvider>
      <AppContent />
    </FinancialDataProvider>
  );
}

export default App;
