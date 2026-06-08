import { create } from "zustand";

interface AuthState {
  token: string | null;
  email: string | null;
  setAuth: (token: string, email: string) => void;
  clearAuth: () => void;
}

interface ShellState {
  currentCwd: string;
  commandHistory: string[];
  addCommand: (cmd: string) => void;
  setCwd: (cwd: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("flowcore_token") : null,
  email: typeof window !== "undefined" ? localStorage.getItem("flowcore_email") : null,
  setAuth: (token, email) => {
    localStorage.setItem("flowcore_token", token);
    localStorage.setItem("flowcore_email", email);
    set({ token, email });
  },
  clearAuth: () => {
    localStorage.removeItem("flowcore_token");
    localStorage.removeItem("flowcore_email");
    set({ token: null, email: null });
  },
}));

export const useShellStore = create<ShellState>((set) => ({
  currentCwd: "C:\\",
  commandHistory: [],
  addCommand: (cmd) => set((state) => ({ commandHistory: [cmd, ...state.commandHistory] })),
  setCwd: (currentCwd) => set({ currentCwd }),
}));
