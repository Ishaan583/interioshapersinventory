import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CategoryPage from './pages/CategoryPage';
import RequestItem from './pages/RequestItem';
import Sites from './pages/Sites';
import Users from './pages/Users';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Category Pages */}
            <Route path="carpentry" element={<CategoryPage category="Carpentry" />} />
            <Route path="false-ceiling" element={<CategoryPage category="False Ceiling" />} />
            <Route path="painting" element={<CategoryPage category="Painting" />} />
            <Route path="civil-work" element={<CategoryPage category="Civil Work" />} />
            <Route path="electrical" element={<CategoryPage category="Electrical" />} />
            <Route path="modular" element={<CategoryPage category="Modular" />} />
            
            {/* Request Pages */}
            <Route path="request" element={<RequestItem />} />
            
            {/* Admin Management Pages */}
            <Route path="sites" element={<Sites />} />
            <Route path="users" element={<Users />} />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
