import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import GraphPage from './pages/GraphPage'
import Graph3DPage from './pages/Graph3DPage'
import ArchitecturePage from './pages/ArchitecturePage'
import FlowPage from './pages/FlowPage'
import SequencePage from './pages/SequencePage'
import PrinciplePage from './pages/PrinciplePage'
import ProjectStructurePage from './pages/ProjectStructurePage'
import FilesPage from './pages/FilesPage'
import SearchPage from './pages/SearchPage'
import EntityDetailPage from './pages/EntityDetailPage'
import CodeHeatmapPage from './pages/CodeHeatmapPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/graph-3d" element={<Graph3DPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="/flow" element={<FlowPage />} />
            <Route path="/sequence" element={<SequencePage />} />
            <Route path="/principle" element={<PrinciplePage />} />
            <Route path="/structure" element={<ProjectStructurePage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/heatmap" element={<CodeHeatmapPage />} />
            <Route path="/entity/:entityId" element={<EntityDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
