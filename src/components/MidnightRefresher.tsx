"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function MidnightRefresher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
        queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
        window.dispatchEvent(new CustomEvent("midnight"));
        schedule();
      }, midnight.getTime() - now.getTime());
    };
    schedule();
    return () => clearTimeout(timeoutId);
  }, [queryClient]);

  return null;
}
