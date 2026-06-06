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
      try {
        const { data: refreshData } = await axios.post(`${API}/auth/refresh`, {}, { withCredentials: true });
        if (refreshData.access_token) {
          localStorage.setItem("parlance_token", refreshData.access_token);
        }
      } catch (e) {}
    } catch (e) {
      setUser(null);
      // Only clear token if it's not a network/CORS error - check status explicitly
      if (e.response?.status === 401) {
        localStorage.removeItem("parlance_token");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    setUser(data.user);
    const token = data.access_token || data.accessToken;
    if (token) localStorage.setItem("parlance_token", token);
    return data.user;
  };

  const register = async (email, username, password, displayName) => {
    const { data } = await axios.post(`${API}/auth/register`, { email, username, password, display_name: displayName }, { withCredentials: true });
    setUser(data.user);
    const token = data.access_token || data.accessToken;
    if (token) localStorage.setItem("parlance_token", token);
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
