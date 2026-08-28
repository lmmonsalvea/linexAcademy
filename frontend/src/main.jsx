import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './utils/auth'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Knowledge from './pages/Knowledge'
import Exams from './pages/Exams'
import Login from './pages/Login'
import Courses from './pages/Courses'
import NewCourse from './pages/NewCourse'
import CourseDetail from './pages/CourseDetail'
import Admin from './pages/Admin'
import './styles.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
          <Route
            path="/courses/new"
            element={<ProtectedRoute roles={['instructor', 'admin_area', 'superadmin']}><NewCourse /></ProtectedRoute>}
          />
          <Route path="/courses/:id" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
          <Route path="/knowledge" element={<ProtectedRoute><Knowledge /></ProtectedRoute>} />
          <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
          {/* /rrhh (RRHHPanel) intentionally hidden for this scope — component
              kept at src/pages/RRHHPanel.jsx, just not routed/linked. */}
          <Route
            path="/admin"
            element={<ProtectedRoute roles={['superadmin']}><Admin /></ProtectedRoute>}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
