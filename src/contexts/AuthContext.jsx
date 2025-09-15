import { h, createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';

// Initial users data
const INITIAL_USERS = [
  {
    id: 1,
    name: 'Scott Turnbull',
    email: 'blazin.media@gmail.com',
    password: 'Dimebagg@1979dean',
    role: 'Super Administrator',
    avatar: null
  },
  {
    id: 2,
    name: 'Luke Adams',
    email: 'jlukeadams@gmail.com',
    password: 'weeweekly2025',
    role: 'Administrator',
    avatar: null
  }
];

// Store users in localStorage for persistence
const getUsersFromStorage = () => {
  const stored = localStorage.getItem('weeweekly_users');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing stored users:', error);
    }
  }
  // Initialize with default users if not in storage
  localStorage.setItem('weeweekly_users', JSON.stringify(INITIAL_USERS));
  return INITIAL_USERS;
};

const saveUsersToStorage = (users) => {
  localStorage.setItem('weeweekly_users', JSON.stringify(users));
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('weeweekly_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('weeweekly_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    
    try {
      // Get current users from storage
      const users = getUsersFromStorage();
      
      // Find user by email and password
      const foundUser = users.find(
        u => u.email === email && u.password === password
      );

      if (!foundUser) {
        throw new Error('Invalid email or password');
      }

      // Remove password from user object before storing
      const { password: _, ...userWithoutPassword } = foundUser;
      
      setUser(userWithoutPassword);
      localStorage.setItem('weeweekly_user', JSON.stringify(userWithoutPassword));
      
      return userWithoutPassword;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('weeweekly_user');
  };

  const updateProfile = async (updates) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    setLoading(true);
    
    try {
      const users = getUsersFromStorage();
      const userIndex = users.findIndex(u => u.id === user.id);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      // Handle password change
      if (updates.currentPassword && updates.newPassword) {
        if (users[userIndex].password !== updates.currentPassword) {
          throw new Error('Current password is incorrect');
        }
        users[userIndex].password = updates.newPassword;
      }

      // Handle avatar update
      if (updates.hasOwnProperty('avatar')) {
        users[userIndex].avatar = updates.avatar;
      }

      // Save updated users to storage
      saveUsersToStorage(users);

      // Update current user state (without password)
      const { password: _, ...updatedUserWithoutPassword } = users[userIndex];
      setUser(updatedUserWithoutPassword);
      localStorage.setItem('weeweekly_user', JSON.stringify(updatedUserWithoutPassword));

      return updatedUserWithoutPassword;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    login,
    logout,
    updateProfile,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
