import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ProjectPage from './pages/ProjectPage';

function Private({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"        element={<Login />} />
        <Route path="/signup"       element={<Signup />} />
        <Route path="/"             element={<Private><Dashboard /></Private>} />
        <Route path="/project/:id"  element={<Private><ProjectPage /></Private>} />
      </Routes>
    </BrowserRouter>
  );
}
