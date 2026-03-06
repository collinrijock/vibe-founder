import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { BusinessCreationOverlay } from "@/components/BusinessCreationOverlay";

interface OverlayControls {
  show: () => void;
  finish: () => void;
  hide: () => void;
}

const BusinessCreationContext = createContext<OverlayControls>({
  show: () => {},
  finish: () => {},
  hide: () => {},
});

export function useBusinessCreation() {
  return useContext(BusinessCreationContext);
}

export function BusinessCreationProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);

  const show = useCallback(() => {
    setDone(false);
    setVisible(true);
  }, []);

  const finish = useCallback(() => {
    setDone(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    setDone(false);
  }, []);

  return (
    <BusinessCreationContext.Provider value={{ show, finish, hide }}>
      {children}
      <BusinessCreationOverlay visible={visible} done={done} onDone={hide} />
    </BusinessCreationContext.Provider>
  );
}
