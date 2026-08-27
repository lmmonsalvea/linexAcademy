import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Knowledge from './pages/Knowledge'
import Exams from './pages/Exams'
import Login from './pages/Login'
import Register from './pages/Register'
import Verify from './pages/Verify'
import Courses from './pages/Courses'
import NewCourse from './pages/NewCourse'
import CourseDetail from './pages/CourseDetail'
import RRHHPanel from './pages/RRHHPanel'
import './styles.css'

function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/courses" element={<Courses/>} />
        <Route path="/courses/new" element={<NewCourse/>} />
        <Route path="/courses/:id" element={<CourseDetail/>} />
        <Route path="/knowledge" element={<Knowledge/>} />
        <Route path="/exams" element={<Exams/>} />
        <Route path="/rrhh" element={<RRHHPanel/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/verify" element={<Verify/>} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
