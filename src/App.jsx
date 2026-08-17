import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import CourseList from './components/CourseList'
import CourseDetail from './components/CourseDetail'
import LearnUnit from './components/LearnUnit'
import StageExam from './components/StageExam'
import UnitTest from './components/UnitTest'
import TestHub from './components/TestHub'
import Profile from './components/Profile'
import AdminConsole from './components/AdminConsole'
import IdentityGate from './components/IdentityGate'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CourseList />} />
        <Route path="/course/:courseId" element={<CourseDetail />} />
        <Route path="/learn/:courseId/:unitId" element={<LearnUnit />} />
        <Route path="/test/unit/:courseId/:unitId" element={<UnitTest />} />
        <Route path="/tests/:courseId" element={<TestHub />} />
        <Route path="/exam/:courseId/:chapterId" element={<StageExam />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminConsole />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <IdentityGate />
    </Layout>
  )
}
