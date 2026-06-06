import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(data);
      // Refresh to get a fresh access_token for WebSocket
      try {
        const { data: refreshData } = await axios.post(`${API}/auth/refresh`, {}, { withCredentials: true });
        if (refreshData.access_token) {
          localStorage.setItem("parlance_token", refreshData.access_token);
        }
      } catch (e) {
        // If refresh fails, token from localStorage may still work
      }
    } catch (e) {
      setUser(null);
      localStorage.removeItem("parlance_token");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    setUser(data.user);
    localStorage.setItem("parlance_token", data.accessToken);
    return data.user;
  };

  const register = async (email, username, password, displayName) => {
    const { data } = await axios.post(`${API}/auth/register`, { email, username, password, displayName }, { withCredentials: true });
    setUser(data.user);
    localStorage.setItem("parlance_token", data.accessToken);
    return data.user;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (e) {}
    setUser(null);
    localStorage.removeItem("parlance_token");
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { API };
