import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { OverviewPage } from './pages/OverviewPage';
import { NewAnalysisPage } from './pages/NewAnalysisPage';
import { AnalysisResultsPage } from './pages/AnalysisResultsPage';
import { HistoryPage } from './pages/HistoryPage';
import { DatasetExplorerPage } from './pages/DatasetExplorerPage';
import { ModelValidationPage } from './pages/ModelValidationPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="analysis/new" element={<NewAnalysisPage />} />
          <Route path="analysis/:id" element={<AnalysisResultsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="dataset" element={<DatasetExplorerPage />} />
          <Route path="validation" element={<ModelValidationPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
