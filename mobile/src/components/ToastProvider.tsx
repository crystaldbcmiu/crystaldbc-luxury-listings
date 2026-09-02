import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Animated, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Themed";
import { colors } from "@/lib/theme";

type ToastVariant = "default" | "success" | "error";

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VARIANT_COLOR: Record<ToastVariant, string> = {
  default: colors.gold,
  success: colors.success,
  error: colors.destructive,
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((input: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = nextId.current++;
    const item: Toast = { id, variant: "default", ...input };
    setToasts((current) => [...current, item]);
    setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, 3500);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <SafeAreaView edges={["top"]} style={{ pointerEvents: "none" }} className="absolute left-0 right-0 top-0 z-50">
        <View className="gap-2 px-4" style={{ pointerEvents: "none" }}>
          {toasts.map((entry) => (
            <Animated.View
              key={entry.id}
              className="rounded-md border bg-card p-3"
              style={{ borderColor: VARIANT_COLOR[entry.variant] }}
            >
              <Text variant="label" style={{ color: VARIANT_COLOR[entry.variant] }}>
                {entry.title}
              </Text>
              {entry.description ? (
                <Text className="mt-0.5 text-xs text-muted-foreground">{entry.description}</Text>
              ) : null}
            </Animated.View>
          ))}
        </View>
      </SafeAreaView>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};
