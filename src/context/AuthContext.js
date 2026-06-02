import {createContext, useContext} from 'react';

export const AuthContext = createContext({
  isAuthenticated:    false,
  setIsAuthenticated: () => {},
  isConfigured:       false,
  setIsConfigured:    () => {},
});

export const useAuth = () => useContext(AuthContext);
