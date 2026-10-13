import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; import AppLayout from './layouts/AppLayout'; import { Spinner } from './components/ui';
import Login from './pages/Login'; import Dashboard from './pages/Dashboard'; import Students from './pages/Students'; import StudentProfile from './pages/StudentProfile';
import IdCards from './pages/IdCards'; import Attendance from './pages/Attendance'; import Exams from './pages/Exams'; import Finance from './pages/Finance'; import Duty from './pages/Duty';
import ResourcePage from './pages/ResourcePage'; import Leave from './pages/Leave'; import Reports from './pages/Reports'; import SettingsPage from './pages/Settings'; import Portal from './pages/Portal';

function Guard({ children }) { const { user, loading } = useAuth(); if (loading) return <Spinner />; return user ? children : <Navigate to="/login" replace />; }
function Home() { const { user } = useAuth(); return ['parent', 'student'].includes(user.role) ? <Navigate to="/portal" replace /> : <Dashboard />; }
export default function App() {
  return (<Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<Guard><AppLayout /></Guard>}>
      <Route index element={<Home />} />
      <Route path="students" element={<Students />} /><Route path="students/:id" element={<StudentProfile />} />
      <Route path="id-cards" element={<IdCards />} /><Route path="attendance" element={<Attendance />} /><Route path="exams" element={<Exams />} />
      <Route path="finance" element={<Finance />} /><Route path="duty" element={<Duty />} /><Route path="leave" element={<Leave />} />
      <Route path="reports" element={<Reports />} /><Route path="settings" element={<SettingsPage />} /><Route path="portal" element={<Portal />} />
      <Route path="r/:key" element={<ResourcePage />} /><Route path="*" element={<div className="card p-6">Page not found.</div>} />
    </Route>
  </Routes>);
}
