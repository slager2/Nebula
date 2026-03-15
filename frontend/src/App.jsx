import { Routes, Route, Navigate } from 'react-router-dom';
import GlobalLayout from './components/GlobalLayout';
import Profile from './pages/Profile';
import Terminal from './pages/Terminal';
import Forge from './pages/Forge';
import Archive from './pages/Universe';

function App() {
  return (
    <Routes>
      <Route element={<GlobalLayout />}>
        <Route path="/profile" element={<Profile />} />
        <Route path="/terminal" element={<Terminal />} />
        <Route path="/forge" element={<Forge />} />
        <Route path="/universe" element={<Archive />} />
        <Route path="*" element={<Navigate to="/profile" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
