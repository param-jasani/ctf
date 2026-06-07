import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'

export default function AppLayout() {
  return (
    <div className="terminal-grid min-h-screen bg-background text-on-surface">
      <TopBar />
      <main className="pt-12">
        <Outlet />
      </main>
    </div>
  )
}
