import { createContext, useContext, useState, useEffect } from 'react';
import { readStoredState, writeStoredState } from '../utils/storage';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() =>
    readStoredState('currentUser', null)
  );

  const login = (user) => {
    setCurrentUser(user);
    writeStoredState('currentUser', user);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const isSystemAdmin =
    currentUser?.roles?.some((r) => r.toLowerCase().includes('admin')) ?? false;

  const value = { currentUser, login, logout, isSystemAdmin };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
