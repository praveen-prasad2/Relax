"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

type SnackbarType = "success" | "error" | "info";

interface SnackbarState {
  id: number;
  message: string;
  type: SnackbarType;
}

interface SnackbarContextValue {
  showSnackbar: (message: string, type?: SnackbarType) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) return { showSnackbar: () => {} };
  return ctx;
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snackbars, setSnackbars] = useState<SnackbarState[]>([]);

  const showSnackbar = useCallback((message: string, type: SnackbarType = "info") => {
    const id = Date.now();
    setSnackbars((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setSnackbars((prev) => prev.filter((s) => s.id !== id));
    }, 3000);
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none md:left-auto md:right-4 md:max-w-sm">
        <AnimatePresence>
          {snackbars.map((s) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`rounded-xl px-4 py-3 shadow-lg pointer-events-auto ${
                s.type === "success"
                  ? "bg-emerald-600 text-white"
                  : s.type === "error"
                    ? "bg-red-600 text-white"
                    : "bg-[#374151] text-white"
              }`}
            >
              {s.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </SnackbarContext.Provider>
  );
}
