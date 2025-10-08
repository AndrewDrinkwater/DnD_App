import { Routes, Route } from 'react-router-dom'

import WorldsPage from './pages/WorldsPage'
import CampaignsPage from './pages/CampaignsPage'
import CharactersPage from './pages/CharactersPage'
import NpcDirectory from './pages/NpcDirectory'
import LocationsAtlas from './pages/LocationsAtlas'
import OrganisationsLedger from './pages/OrganisationsLedger'
import RaceLibrary from './pages/RaceLibrary'
import PlatformAdmin from './pages/PlatformAdmin'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WorldsPage />} />
      <Route path="/worlds" element={<WorldsPage />} />
      <Route path="/campaigns" element={<CampaignsPage />} />
      <Route path="/campaigns/:id" element={<CampaignsPage />} />
      <Route path="/characters" element={<CharactersPage />} />
      <Route path="/npcs" element={<NpcDirectory />} />
      <Route path="/locations" element={<LocationsAtlas />} />
      <Route path="/organisations" element={<OrganisationsLedger />} />
      <Route path="/races" element={<RaceLibrary />} />
      <Route path="/admin" element={<PlatformAdmin />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  )
}
