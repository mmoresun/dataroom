import { Navigate, Route, Routes } from 'react-router-dom';
import { DataRoomListPage } from '@/pages/DataRoomListPage';
import { DataRoomPage } from '@/pages/DataRoomPage';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Routes>
        <Route path="/" element={<DataRoomListPage />} />
        <Route path="/room/:roomId" element={<DataRoomPage />} />
        <Route path="/room/:roomId/folder/:id" element={<DataRoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
