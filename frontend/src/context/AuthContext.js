import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('clockln_token'));
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);

  const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // Update axios headers when token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.Authorization;
    }
  }, [token]);

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      
      // Fetch company details
      const companyResponse = await api.get('/company');
      setCompany(companyResponse.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('clockln_token', access_token);
    setToken(access_token);
    setUser(userData);
    
    // Fetch company
    api.defaults.headers.Authorization = `Bearer ${access_token}`;
    const companyResponse = await api.get('/company');
    setCompany(companyResponse.data);
    
    return userData;
  };

  const registerCompany = async (companyData, userData) => {
    const response = await api.post('/auth/register-company', {
      company: companyData,
      user: userData,
    });
    
    const { access_token, user: newUser, company: newCompany } = response.data;
    
    localStorage.setItem('clockln_token', access_token);
    setToken(access_token);
    setUser(newUser);
    setCompany(newCompany);
    
    return { user: newUser, company: newCompany };
  };

  const logout = () => {
    localStorage.removeItem('clockln_token');
    setToken(null);
    setUser(null);
    setCompany(null);
  };

  const updateUserLanguage = async (language) => {
    await api.patch(`/settings/language?language=${language}`);
    setUser(prev => ({ ...prev, language }));
  };

  const isHR = user?.role === 'hr' || user?.role === 'manager';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        company,
        loading,
        login,
        logout,
        registerCompany,
        updateUserLanguage,
        isHR,
        api,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
