"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated, clearTokens, Role, isAdmin } from "@/lib/auth";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
}

interface AdminSessionContextValue {
  user: User | null;
  isLoading: boolean;
}

const AdminSessionContext = createContext<AdminSessionContextValue | undefined>(undefined);

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") {
      setIsLoading(false);
      return;
    }

    if (!isAuthenticated()) {
      router.replace("/login");
      setIsLoading(false);
      return;
    }

    async function fetchUser() {
      try {
        const { getCurrentUser } = await import("@/lib/api");
        const { getAccessToken } = await import("@/lib/auth");
        const token = getAccessToken();
        if (!token) throw new Error("No token");
        
        const user = await getCurrentUser(token);
        
        if (!isAdmin(user.role)) {
          clearTokens();
          alert("This account is not an administrator.");
          router.replace("/login");
          return;
        }

        setUser(user);
      } catch (err: any) {
        console.error("Failed to fetch user session", err);
        if (err?.status === 401 || err?.response?.status === 401) {
          clearTokens();
          router.replace("/login");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, [pathname, router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading session...</div>;
  }

  // Prevent rendering protected pages if user role check failed
  if (!user && pathname !== "/login") {
    return null; 
  }

  return (
    <AdminSessionContext.Provider value={{ user, isLoading }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const context = useContext(AdminSessionContext);
  if (context === undefined) {
    throw new Error("useAdminSession must be used within an AdminSessionProvider");
  }
  return context;
}
