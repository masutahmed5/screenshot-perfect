import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface ExplanationContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
}

const ExplanationContext = createContext<ExplanationContextType>({
  isOpen: true,
  setIsOpen: () => {},
  toggle: () => {},
});

export function ExplanationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpenState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("gridwise_right_panel_open");
      if (saved !== null) return saved === "true";
      return window.innerWidth >= 1280;
    } catch {
      return true;
    }
  });

  // Track viewport resizing if user hasn't manually set a preference
  useEffect(() => {
    const handleResize = () => {
      try {
        const saved = localStorage.getItem("gridwise_right_panel_open");
        if (saved === null) {
          setIsOpenState(window.innerWidth >= 1280);
        }
      } catch {}
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const setIsOpen = (open: boolean) => {
    setIsOpenState(open);
    try {
      localStorage.setItem("gridwise_right_panel_open", String(open));
    } catch {}
  };

  const toggle = () => {
    setIsOpenState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("gridwise_right_panel_open", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <ExplanationContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      {children}
    </ExplanationContext.Provider>
  );
}

export function useExplanation() {
  return useContext(ExplanationContext);
}
