import { Navigate, Route, Routes } from 'react-router-dom';
import { DataRoomListPage } from '@/pages/DataRoomListPage';
import { DataRoomPage } from '@/pages/DataRoomPage';
import { LoginPage } from '@/pages/LoginPage';
import { RequireAuth } from '@/components/RequireAuth';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <DataRoomListPage />
            </RequireAuth>
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <RequireAuth>
              <DataRoomPage />
            </RequireAuth>
          }
        />
        <Route
          path="/room/:roomId/folder/:id"
          element={
            <RequireAuth>
              <DataRoomPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
