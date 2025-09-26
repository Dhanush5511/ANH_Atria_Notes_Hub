import { useState, useEffect } from 'react';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentPortal } from './components/StudentPortal';
import { supabase } from './utils/supabase/client';
import { projectId, publicAnonKey } from './utils/supabase/info';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'student' | 'admin-login' | 'admin-dashboard'>('student');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing admin session on app load
  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 5000)
      );
      
      const sessionPromise = supabase.auth.getSession();
      
      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
      
      if (session?.access_token) {
        setAdminToken(session.access_token);
        setCurrentPage('admin-dashboard');
      }
    } catch (error) {
      console.error('Error checking session:', error);
      // Continue with default student portal view
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = (token: string) => {
    setAdminToken(token);
    setCurrentPage('admin-dashboard');
  };

  const handleAdminLogout = async () => {
    try {
      // Add timeout to logout as well
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout')), 5000)
      );
      
      const logoutPromise = supabase.auth.signOut();
      
      await Promise.race([logoutPromise, timeoutPromise]);
      
      setAdminToken(null);
      setCurrentPage('student');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout on client side even if server logout fails
      setAdminToken(null);
      setCurrentPage('student');
    }
  };

  const showAdminLogin = () => {
    setCurrentPage('admin-login');
  };

  // Initialize admin user on first load (only run once)
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check
        
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-fd1978ca/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log('Server is healthy, initializing admin user...');
          await initializeAdmin();
        } else {
          console.log('Server health check failed, skipping admin initialization');
        }
      } catch (error) {
        console.log('Server health check failed:', error.name === 'AbortError' ? 'timeout' : error.message);
      }
    };
    
    const initializeAdmin = async () => {
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-fd1978ca/admin/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Don't try to parse JSON if response is not ok
          console.log('Admin initialization response not ok:', response.status, response.statusText);
          return;
        }
        
        const result = await response.json();
        
        if (result.error && result.error.includes('email_exists')) {
          console.log('Admin user already exists - this is normal');
        } else {
          console.log('Admin user initialized successfully');
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Admin initialization timed out - continuing without blocking app');
        } else {
          console.log('Admin user may already exist or initialization failed:', error);
        }
      }
    };

    // Run server health check and admin initialization in the background without blocking the UI
    setTimeout(() => {
      checkServerHealth();
    }, 2000); // Delay to let the main UI load first
  }, []);

  // Show loading screen while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-medium text-foreground mb-2">ANH Atria Notes Hub</h2>
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  if (currentPage === 'admin-login') {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  if (currentPage === 'admin-dashboard' && adminToken) {
    return <AdminDashboard token={adminToken} onLogout={handleAdminLogout} />;
  }

  return <StudentPortal onAdminClick={showAdminLogin} />;
}