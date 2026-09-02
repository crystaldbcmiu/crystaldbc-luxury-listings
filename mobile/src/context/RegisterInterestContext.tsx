import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname } from "expo-router";
import useAuth from "@/hooks/useAuth";
import RegisterInterestSheet from "@/components/RegisterInterestSheet";

interface OpenOptions {
  propertyId?: string;
  propertyTitle?: string;
  source?: string;
}

interface RegisterInterestContextValue {
  open: (options?: OpenOptions) => void;
  close: () => void;
}

const RegisterInterestContext = createContext<RegisterInterestContextValue | undefined>(undefined);

const PROMPT_STORAGE_KEY = "crystaldbc:lastInterestPrompt:guest";
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const AUTO_PROMPT_DELAY = 30_000;

/**
 * Port of client/src/components/RegisterInterestDialog.tsx — auto-prompts guests
 * once per 24h, and can be opened from Profile (company-wide, not per listing).
 */
export const RegisterInterestProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<OpenOptions>({});

  const isGuest = !user;
  const suppressed = pathname.startsWith("/auth") || pathname.startsWith("/terms");

  const open = useCallback((next?: OpenOptions) => {
    setOptions(next ?? {});
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setOptions({});
  }, []);

  useEffect(() => {
    if (!isGuest || suppressed || visible) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const last = await AsyncStorage.getItem(PROMPT_STORAGE_KEY);
      if (cancelled) return;
      if (last && Date.now() - Number(last) < TWENTY_FOUR_HOURS) return;

      await AsyncStorage.setItem(PROMPT_STORAGE_KEY, Date.now().toString());
      if (!cancelled) {
        setOptions({ source: "register-interest" });
        setVisible(true);
      }
    }, AUTO_PROMPT_DELAY);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Re-arm when the guest navigates, matching the web behaviour.
  }, [isGuest, suppressed, pathname, visible]);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <RegisterInterestContext.Provider value={value}>
      {children}
      <RegisterInterestSheet
        visible={visible}
        onClose={close}
        propertyId={options.propertyId}
        propertyTitle={options.propertyTitle}
        source={options.source ?? "register-interest"}
      />
    </RegisterInterestContext.Provider>
  );
};

export const useRegisterInterest = () => {
  const context = useContext(RegisterInterestContext);
  if (!context) {
    throw new Error("useRegisterInterest must be used within RegisterInterestProvider");
  }
  return context;
};
