// app/context/AuthContext.tsx
'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef, // Added useRef
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

interface User {
    _id: string;
    email: string;
    username: string;
    role: 'admin' | 'job_seeker' | 'job_poster' | 'job_referrer';
    firstLogin: boolean;
    isSuperAdmin?: boolean;
    onboardingStatus?: 'not_started' | 'in_progress' | 'completed' | undefined;
    // New profile fields
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    bio?: string;
    linkedin?: string;
    github?: string;
    website?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (token: string, redirectPath?: string) => void;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false); // New state to prevent multiple redirects
    const router = useRouter();
    const pathname = usePathname();

    // Use a ref to track if a redirect has been initiated to avoid redundant pushes
    const redirectingRef = useRef(false);

    const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/'];
    const allowedForFirstLogin = ['/change-password'];

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
        // Only redirect if not already on the login page or in a redirect state
        if (pathname !== '/login' && !redirectingRef.current) {
            console.log('AuthContext: User logged out. Redirecting to /login.');
            redirectingRef.current = true; // Set ref to true
            router.push('/login');
        } else {
            console.log('AuthContext: User logged out, but already on login page or redirect initiated.');
        }
    }, [router, pathname]);

    const refreshUser = useCallback(async () => {
        console.log('AuthContext: refreshUser function called.');
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            console.log('AuthContext: No token found for refreshUser. Logging out.');
            logout();
            return;
        }
        setLoading(true);
        try {
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${storedToken}` },
            });
            const data = await response.json();

            if (response.ok && data.user) {
                const fetchedUser: User = {
                    _id: data.user._id,
                    email: data.user.email,
                    username: data.user.username || '',
                    role: data.user.role,
                    firstLogin: data.user.firstLogin,
                    isSuperAdmin: data.user.isSuperAdmin || false,
                    onboardingStatus: data.user.onboardingStatus,
                    // Populate new profile fields from API response
                    firstName: data.user.firstName || '',
                    lastName: data.user.lastName || '',
                    phone: data.user.phone || '',
                    address: data.user.address || '',
                    bio: data.user.bio || '',
                    linkedin: data.user.linkedin || '',
                    github: data.user.github || '',
                    website: data.user.website || '',
                };
                console.log('AuthContext: Successfully refreshed user data from /api/auth/me:', fetchedUser);
                setUser(fetchedUser);
                setToken(storedToken);
                setIsAuthenticated(true);
            } else {
                console.error('AuthContext: Failed to refresh user data from /api/auth/me:', data.error || 'Unknown error');
                logout();
            }
        } catch (error) {
            console.error('AuthContext: Error refreshing user data from /api/auth/me:', error);
            logout();
        } finally {
            setLoading(false);
        }
    }, [logout]);

    const login = useCallback(
        (newToken: string, redirectPath?: string) => {
            localStorage.setItem('token', newToken);
            try {
                const decoded: any = jwtDecode(newToken);

                const fetchedUser: User = {
                    _id: decoded.id || decoded._id,
                    email: decoded.email,
                    username: decoded.username || '',
                    role: decoded.role,
                    firstLogin: decoded.firstLogin,
                    isSuperAdmin: decoded.isSuperAdmin || false,
                    onboardingStatus: decoded.onboardingStatus,
                    // Populate new profile fields from decoded token (if available in token payload)
                    firstName: decoded.firstName || '',
                    lastName: decoded.lastName || '',
                    phone: decoded.phone || '',
                    address: decoded.address || '',
                    bio: decoded.bio || '',
                    linkedin: decoded.linkedin || '',
                    github: decoded.github || '',
                    website: decoded.website || '',
                };

                if (!fetchedUser._id) {
                    console.error('AuthContext: Decoded token is missing user ID. Token payload:', decoded);
                    logout();
                    return;
                }

                setUser(fetchedUser);
                setToken(newToken);
                setIsAuthenticated(true);
                console.log('AuthContext: User logged in and token decoded. User:', fetchedUser);

                // Calculate target path based on the NEWLY fetchedUser state
                let calculatedTargetPath = '/';
                if (fetchedUser.firstLogin) {
                    calculatedTargetPath = '/change-password';
                } else {
                    switch (fetchedUser.role) {
                        case 'admin':
                            calculatedTargetPath = '/admin/dashboard';
                            break;
                        case 'job_poster':
                            calculatedTargetPath = '/poster/dashboard';
                            break;
                        case 'job_seeker':
                            calculatedTargetPath = fetchedUser.onboardingStatus === 'completed'
                                ? '/seeker/dashboard'
                                : '/seeker/onboarding';
                            break;
                        case 'job_referrer':
                            calculatedTargetPath = '/referrer/dashboard';
                            break;
                        default:
                            calculatedTargetPath = '/';
                    }
                }
                // Initiate redirection directly from login if not already on target path and not currently redirecting
                if (pathname !== (redirectPath || calculatedTargetPath) && !redirectingRef.current) {
                    console.log(`AuthContext: Login complete. Redirecting from ${pathname} to ${redirectPath || calculatedTargetPath}`);
                    redirectingRef.current = true; // Set ref to true
                    router.push(redirectPath || calculatedTargetPath);
                } else {
                    console.log(`AuthContext: Login complete, but already on target path or redirect initiated. Current: ${pathname}, Target: ${redirectPath || calculatedTargetPath}`);
                }
            } catch (error) {
                console.error('AuthContext: Failed to decode token on login:', error);
                logout();
            }
        },
        [router, logout, pathname] // Add pathname to dependencies
    );

    const updateUser = useCallback((userData: Partial<User>) => {
        setUser((prevUser) => (prevUser ? { ...prevUser, ...userData } : null));
    }, []);

    const checkAuth = useCallback(async () => {
        setLoading(true);
        const storedToken = localStorage.getItem('token');

        if (storedToken) {
            try {
                const decoded: any = jwtDecode(storedToken);
                const currentTime = Date.now() / 1000;

                if (decoded.exp > currentTime) {
                    await refreshUser();
                } else {
                    console.log('AuthContext: Token expired during checkAuth.');
                    logout();
                }
            } catch (error) {
                console.error('AuthContext: Failed to decode token or token invalid during checkAuth:', error);
                logout();
            }
        } else {
            console.log('AuthContext: No token found during checkAuth. Not authenticated.');
            setUser(null);
            setToken(null);
            setIsAuthenticated(false);
        }
        setLoading(false);
    }, [logout, refreshUser]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);


    // app/context/AuthContext.tsx
    useEffect(() => {
        if (redirectingRef.current || loading || !isAuthenticated || !user) {
            return;
        }

        // Handle firstLogin case first
        if (user.firstLogin) {
            if (!allowedForFirstLogin.includes(pathname)) {
                console.log('First login detected - redirecting to change password');
                redirectingRef.current = true;
                router.push('/change-password');
            }
            return; // Critical - prevents other redirect logic
        }

        // Handle role-based redirects (only for non-firstLogin users)
        let targetPath: string | null = null;
        switch (user.role) {
            case 'admin':
                if (!pathname.startsWith('/admin') && pathname !== '/profile') targetPath = '/admin/dashboard';
                break;
            case 'job_poster':
                if (!pathname.startsWith('/poster') && pathname !== '/profile') targetPath = '/poster/dashboard';
                break;
            case 'job_seeker':
                if (user.onboardingStatus === 'completed' && !pathname.startsWith('/seeker') && pathname !== '/profile') {
                    targetPath = '/seeker/dashboard';
                } else if (user.onboardingStatus !== 'completed' && pathname !== '/seeker/onboarding' && pathname !== '/profile') {
                    targetPath = '/seeker/onboarding';
                }
                break;
            case 'job_referrer':
                if (!pathname.startsWith('/referrer') && pathname !== '/profile') targetPath = '/referrer/dashboard';
                break;
        }

        if (targetPath) {
            console.log(`Role-based redirect to ${targetPath}`);
            redirectingRef.current = true;
            router.push(targetPath);
        }
    }, [user, isAuthenticated, loading, pathname, router]);

    // Reset redirectingRef when route changes, indicating a new navigation started
    useEffect(() => {
        redirectingRef.current = false;
        console.log('AuthContext useEffect: Pathname changed, resetting redirectingRef to false.');
    }, [pathname]);


    return (
        <AuthContext.Provider
            value={{ user, token, isAuthenticated, loading, login, logout, updateUser, refreshUser }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};