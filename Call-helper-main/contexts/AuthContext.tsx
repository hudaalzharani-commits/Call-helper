import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'inactive' | 'suspended';
  lastActive: string;
  joinDate: string;
  avatar?: string;
  password: string; // Keep password in the full user object
}

interface PublicUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'admin' | 'user' | 'moderator';
  avatar?: string;
}

interface AuthContextType {
  user: PublicUser | null;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  updateUserAvatar: (avatar: string | undefined) => void;
  updateUserPassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  // Admin functions
  getAllUsers: () => User[];
  addUser: (user: Omit<User, 'id' | 'lastActive' | 'joinDate'>) => User;
  updateUser: (id: string, updates: Partial<User>) => boolean;
  deleteUser: (id: string) => boolean;
  changeUserPassword: (userId: string, newPassword: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ====================================================================
// Initial Mock Users - Default Data
// ====================================================================
const INITIAL_MOCK_USERS: User[] = [
  // Same credentials as backend seed (backend/utils/seed.js) for consistent login
  {
    id: 'seed-admin',
    email: 'admin@rafeeq.com',
    username: 'admin',
    password: 'admin123',
    name: 'مدير النظام',
    role: 'admin',
    status: 'active',
    lastActive: 'الآن',
    joinDate: '2025-01-01',
    avatar: undefined,
  },
  {
    id: 'seed-user',
    email: 'user@rafeeq.com',
    username: 'user',
    password: 'user123',
    name: 'موظف خدمة العملاء',
    role: 'user',
    status: 'active',
    lastActive: 'الآن',
    joinDate: '2025-01-01',
    avatar: undefined,
  },
  { 
    id: '1', 
    email: 'admin1@rafeeq.sa', 
    username: 'admin1',
    password: '123456', 
    name: 'أدمن 1', 
    role: 'admin',
    status: 'active',
    lastActive: 'الآن',
    joinDate: '2025-01-01',
    avatar: undefined
  },
  { 
    id: '2', 
    email: 'admin2@rafeeq.sa', 
    username: 'admin2',
    password: '123456', 
    name: 'أدمن 2', 
    role: 'admin',
    status: 'active',
    lastActive: 'منذ 5 دقائق',
    joinDate: '2025-01-10',
    avatar: undefined
  },
  { 
    id: '3', 
    name: 'مشرف 1', 
    email: 'moderator1@rafeeq.sa',
    username: 'moderator1',
    password: '123456',
    role: 'moderator', 
    status: 'active', 
    lastActive: 'منذ ساعة',
    joinDate: '2025-01-15'
  },
  { 
    id: '4', 
    name: 'مستخدم 1', 
    email: 'user1@rafeeq.sa',
    username: 'user1',
    password: '123456',
    role: 'user', 
    status: 'active', 
    lastActive: 'منذ 30 دقيقة',
    joinDate: '2025-01-20'
  },
];

const STORAGE_KEY = 'rafeeq_all_users';
const CURRENT_USER_KEY = 'rafeeq_current_user';
const TOKEN_KEY = 'token';
const VERSION_KEY = 'rafeeq_db_version';
const CURRENT_VERSION = '2.2'; // Update this to reset database
const API_BASE_URL = getApiBaseUrl();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // ====================================================================
  // Initialize - Load from localStorage or use defaults
  // ====================================================================
  useEffect(() => {
    const savedVersion = localStorage.getItem(VERSION_KEY);
    const savedUsers = localStorage.getItem(STORAGE_KEY);
    const savedCurrentUser = localStorage.getItem(CURRENT_USER_KEY);
    const savedToken = localStorage.getItem(TOKEN_KEY);
    
    // If version changed, reset everything
    if (savedVersion !== CURRENT_VERSION) {
      console.log('Database version changed, resetting to defaults...');
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_USERS));
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      setAllUsers(INITIAL_MOCK_USERS);
      setUser(null);
      return;
    }
    
    if (savedUsers) {
      try {
        setAllUsers(JSON.parse(savedUsers));
      } catch {
        console.warn('Invalid saved users in localStorage, resetting.');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_USERS));
        setAllUsers(INITIAL_MOCK_USERS);
      }
    } else {
      setAllUsers(INITIAL_MOCK_USERS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_USERS));
    }
    
    // Try to restore user session from token
    if (savedToken && savedCurrentUser) {
      // Verify token with backend if not a local auth token
      if (savedToken !== 'local-auth-token') {
        verifyToken(savedToken, savedCurrentUser);
      } else {
        try {
          setUser(JSON.parse(savedCurrentUser));
        } catch {
          localStorage.removeItem(CURRENT_USER_KEY);
          localStorage.removeItem(TOKEN_KEY);
        }
      }
    }
  }, []);
  
  // ====================================================================
  // Verify Token with Backend
  // ====================================================================
  const verifyToken = async (token: string, savedCurrentUser: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.user) {
          // Token is valid, restore user
          const backendUser = data.data.user;
          const publicUser: PublicUser = {
            id: backendUser._id || backendUser.id,
            name: backendUser.name,
            email: backendUser.email,
            username: backendUser.username,
            role: backendUser.role,
            avatar: backendUser.avatar,
          };
          setUser(publicUser);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));
          console.log('✅ Token verified, user session restored');
        } else {
          // Invalid token
          console.warn('⚠️ Invalid token, clearing session');
          logout();
        }
      } else {
        // Token expired or invalid
        console.warn('⚠️ Token verification failed, clearing session');
        logout();
      }
    } catch (error) {
      console.error('❌ Token verification error:', error);
      // Fallback to saved user if backend is down
      console.log('ℹ️ Backend unavailable, using cached user data');
      try {
        setUser(JSON.parse(savedCurrentUser));
      } catch {
        logout();
      }
    }
  };

  // ====================================================================
  // Save to localStorage whenever allUsers changes
  // ====================================================================
  useEffect(() => {
    if (allUsers.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allUsers));
      
      // Update current user if their data changed
      if (user) {
        const updatedCurrentUser = allUsers.find(u => u.id === user.id);
        if (updatedCurrentUser) {
          const publicUser: PublicUser = {
            id: updatedCurrentUser.id,
            name: updatedCurrentUser.name,
            email: updatedCurrentUser.email,
            username: updatedCurrentUser.username,
            role: updatedCurrentUser.role,
            avatar: updatedCurrentUser.avatar,
          };
          
          // Only update if data actually changed
          if (JSON.stringify(publicUser) !== JSON.stringify(user)) {
            setUser(publicUser);
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));
          }
        }
      }
    }
  }, [allUsers]);

  // ====================================================================
  // Login
  // ====================================================================
  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    const identifier = emailOrUsername.trim().toLowerCase();

    try {
      console.log('🔐 Attempting backend login...');
      console.log('📧 Username:', identifier);
      console.log('🔑 Password length:', password.length);
      
      const loginData = {
        username: identifier,
        password,
      };
      console.log('📦 Sending login data:', loginData);
      
      // Try backend authentication first
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      console.log('📡 Backend response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend login successful!', data);
        
        if (data.success && data.data.token) {
          // Store token
          localStorage.setItem(TOKEN_KEY, data.data.token);
          console.log('💾 Token stored:', data.data.token.substring(0, 20) + '...');
          
          // Store user data
          const backendUser = data.data.user;
          const publicUser: PublicUser = {
            id: backendUser._id || backendUser.id,
            name: backendUser.name,
            email: backendUser.email,
            username: backendUser.username,
            role: backendUser.role,
            avatar: backendUser.avatar,
          };
          
          setUser(publicUser);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));
          
          return true;
        }
      } else {
        console.error('❌ Backend login failed with status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('❌ Backend login error:', error);
      console.log('⚠️  Falling back to local authentication');
    }

    // Fallback to local authentication if backend is not available
    const foundUser = allUsers.find((u) => {
      const emailMatch = u.email?.trim().toLowerCase() === identifier;
      const userMatch = u.username?.trim().toLowerCase() === identifier;
      return (emailMatch || userMatch) && u.password === password;
    });

    if (foundUser && foundUser.status === 'active') {
      const publicUser: PublicUser = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        username: foundUser.username,
        role: foundUser.role,
        avatar: foundUser.avatar,
      };
      setUser(publicUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));
      
      // Generate a mock token for local auth
      localStorage.setItem(TOKEN_KEY, 'local-auth-token');
      
      // Update last active
      setAllUsers(allUsers.map(u => 
        u.id === foundUser.id ? { ...u, lastActive: 'الآن' } : u
      ));
      
      return true;
    }

    return false;
  };

  // ====================================================================
  // Logout
  // ====================================================================
  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  // ====================================================================
  // Update Avatar (Current User)
  // ====================================================================
  const updateUserAvatar = (avatar: string | undefined) => {
    if (!user) return;

    setAllUsers(allUsers.map(u => 
      u.id === user.id ? { ...u, avatar: avatar || undefined } : u
    ));
  };

  // ====================================================================
  // Update Password (Current User)
  // ====================================================================
  const updateUserPassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) return false;

    const foundUser = allUsers.find(u => u.id === user.id);
    
    if (!foundUser || foundUser.password !== oldPassword) {
      return false;
    }

    setAllUsers(allUsers.map(u => 
      u.id === user.id ? { ...u, password: newPassword } : u
    ));

    return true;
  };

  // ====================================================================
  // Admin Functions
  // ====================================================================
  
  const getAllUsers = (): User[] => {
    return allUsers;
  };

  const addUser = (userData: Omit<User, 'id' | 'lastActive' | 'joinDate'>): User => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      lastActive: 'الآن',
      joinDate: new Date().toISOString().split('T')[0],
    };
    
    setAllUsers([...allUsers, newUser]);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>): boolean => {
    const userExists = allUsers.find(u => u.id === id);
    if (!userExists) return false;

    setAllUsers(allUsers.map(u => 
      u.id === id ? { ...u, ...updates } : u
    ));
    
    return true;
  };

  const deleteUser = (id: string): boolean => {
    const userToDelete = allUsers.find(u => u.id === id);
    if (!userToDelete) return false;

    setAllUsers(allUsers.filter(u => u.id !== id));
    return true;
  };

  const changeUserPassword = (userId: string, newPassword: string): boolean => {
    const userExists = allUsers.find(u => u.id === userId);
    if (!userExists) return false;

    setAllUsers(allUsers.map(u => 
      u.id === userId ? { ...u, password: newPassword } : u
    ));
    
    return true;
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAdmin, 
      updateUserAvatar, 
      updateUserPassword,
      getAllUsers,
      addUser,
      updateUser,
      deleteUser,
      changeUserPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}