import { apiFetch } from "@/lib/api";

// Misma forma que PublicUser en apps/api/src/auth/auth.service.ts.
export interface PublicUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

const post = <T>(path: string, json?: unknown) =>
  apiFetch<T>(`/api/auth${path}`, { method: "POST", json });

export const login = (credentials: { email: string; password: string }) =>
  post<PublicUser>("/login", credentials);

export const signup = (credentials: { email: string; password: string }) =>
  post<PublicUser>("/register", credentials);

export const logout = () => post<void>("/logout");

// 401 si no hay sesión.
export const me = () => apiFetch<PublicUser>("/api/auth/me");

export const verifyEmail = (token: string) =>
  post<void>("/verify-email", { token });

export const resendVerification = () => post<void>("/verify-email/resend");

export const forgotPassword = (email: string) =>
  post<void>("/password/forgot", { email });

export const resetPassword = (data: { token: string; password: string }) =>
  post<void>("/password/reset", data);

export const requestMagicLink = (email: string) =>
  post<void>("/magic-link", { email });

export const verifyMagicLink = (token: string) =>
  post<PublicUser>("/magic-link/verify", { token });
