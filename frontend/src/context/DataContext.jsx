import { createContext, useContext, useState, useEffect } from 'react';
import { readStoredState, writeStoredState } from '../utils/storage';
import {
  seededRoles,
  seededUsers,
  seededWorlds,
  seededCampaigns,
  seededCharacters,
  seededNpcs,
  seededLocations,
  seededOrganisations,
  seededRelationships,
  seededRelationshipTypes,
  seededRaces,
} from '../constants/seedData';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

export function DataProvider({ children }) {
  // initialise from localStorage or seed data
  const [roles, setRoles] = useState(() => readStoredState('roles', seededRoles));
  const [users, setUsers] = useState(() => readStoredState('users', seededUsers));
  const [worlds, setWorlds] = useState(() => readStoredState('worlds', seededWorlds));
  const [campaigns, setCampaigns] = useState(() => readStoredState('campaigns', seededCampaigns));
  const [characters, setCharacters] = useState(() => readStoredState('characters', seededCharacters));
  const [npcs, setNpcs] = useState(() => readStoredState('npcs', seededNpcs));
  const [locations, setLocations] = useState(() => readStoredState('locations', seededLocations));
  const [organisations, setOrganisations] = useState(() => readStoredState('organisations', seededOrganisations));
  const [relationships, setRelationships] = useState(() => readStoredState('relationships', seededRelationships));
  const [relationshipTypes, setRelationshipTypes] = useState(() => readStoredState('relationshipTypes', seededRelationshipTypes));
  const [races, setRaces] = useState(() => readStoredState('races', seededRaces));

  // auto-persist on change
  useEffect(() => {
    writeStoredState('roles', roles);
    writeStoredState('users', users);
    writeStoredState('worlds', worlds);
    writeStoredState('campaigns', campaigns);
    writeStoredState('characters', characters);
    writeStoredState('npcs', npcs);
    writeStoredState('locations', locations);
    writeStoredState('organisations', organisations);
    writeStoredState('relationships', relationships);
    writeStoredState('relationshipTypes', relationshipTypes);
    writeStoredState('races', races);
  }, [roles, users, worlds, campaigns, characters, npcs, locations, organisations, relationships, relationshipTypes, races]);

  // sample CRUDs (expand later)
  const saveWorld = (world) => setWorlds((prev) => [...prev.filter(w => w.id !== world.id), world]);
  const deleteWorld = (id) => setWorlds((prev) => prev.filter((w) => w.id !== id));

  const value = {
    roles, users, worlds, campaigns, characters, npcs,
    locations, organisations, relationships, relationshipTypes, races,
    saveWorld, deleteWorld,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
