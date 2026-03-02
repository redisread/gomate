"use client";

import * as React from "react";

interface MobileMenuContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const MobileMenuContext = React.createContext<MobileMenuContextType | undefined>(undefined);

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const value = React.useMemo(() => ({
    isOpen,
    setIsOpen,
  }), [isOpen]);

  return (
    <MobileMenuContext.Provider value={value}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const context = React.useContext(MobileMenuContext);
  if (context === undefined) {
    throw new Error("useMobileMenu must be used within a MobileMenuProvider");
  }
  return context;
}