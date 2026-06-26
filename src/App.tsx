import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components';
import {
  AnalysesListPage,
  NewAnalysisPage,
  AnalysisViewPage,
} from '@/pages';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<AnalysesListPage />} />
        <Route path="/new" element={<NewAnalysisPage />} />
        <Route path="/analysis/:id" element={<AnalysisViewPage />} />
        <Route
          path="*"
          element={
            <div className="card p-10 text-center">
              <p className="text-slate-500">Página não encontrada.</p>
            </div>
          }
        />
      </Routes>
    </AppShell>
  );
}
