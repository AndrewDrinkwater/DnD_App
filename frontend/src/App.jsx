import './App.css'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './Routes'
import AppLayout from './components/layout/AppLayout'
import AuthProvider from './providers/AuthProvider'
import DataProvider from './providers/DataProvider'

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <AppLayout>
            <AppRoutes />
          </AppLayout>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  )
}
