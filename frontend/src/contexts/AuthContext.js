import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";
const AuthContext = createContext(null);

function authHeaders() {
  const token = localStorage.getItem("parlance_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("parlance_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await axios.get(`${API}/auth/me`, { headers: authHeaders() });
      setUser(data);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem("parlance_token");
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    const token = data.access_token || data.accessToken;
    localStorage.setItem("parlance_token", token);
    setUser(data.user);
    return data.user;
  };

  const register = async (email, username, password, displayName) => {
    const { data } = await axios.post(`${API}/auth/register`, { email, username, password, display_name: displayName });
    const token = data.access_token || data.accessToken;
    localStorage.setItem("parlance_token", token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { headers: authHeaders() });
    } catch (e) {}
    localStorage.removeItem("parlance_token");
    setUser(null);
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
export { API, authHeaders };
