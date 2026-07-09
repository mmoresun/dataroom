import { Navigate, Route, Routes } from 'react-router-dom';
import { DataRoomPage } from '@/pages/DataRoomPage';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Routes>
        <Route path="/" element={<DataRoomPage />} />
        <Route path="/folder/:id" element={<DataRoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
