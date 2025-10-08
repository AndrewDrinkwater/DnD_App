import './App.css'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './Routes'
import AppLayout from './components/layout/AppLayout'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import LoginPage from './pages/LoginPage'

function AuthenticatedApp() {
  return (
    <AppLayout>
      <AppRoutes />
    </AppLayout>
  )
}

function AppContent() {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <LoginPage />
  }

  return <AuthenticatedApp />
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  )
}
