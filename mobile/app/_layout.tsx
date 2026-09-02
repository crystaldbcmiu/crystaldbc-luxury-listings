import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ToastProvider";
import { RegisterInterestProvider } from "@/context/RegisterInterestContext";
import { PropertySearchProvider } from "@/context/PropertySearchContext";
import SplashVideo from "@/components/SplashVideo";
import { queryClient } from "@/lib/queryClient";
import { colors } from "@/lib/theme";
import { hydrateLanguage } from "@/i18n";

const screenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.foreground,
  headerTitleStyle: { color: colors.foreground },
  contentStyle: { backgroundColor: colors.background },
} as const;

export default function RootLayout() {
  useEffect(() => {
    void hydrateLanguage();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <RegisterInterestProvider>
                <PropertySearchProvider>
                  <StatusBar style="light" />
                  <Stack screenOptions={screenOptions}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="auth/[mode]" options={{ headerShown: false }} />
                    <Stack.Screen name="property/[propertyId]" options={{ headerShown: false }} />
                    <Stack.Screen name="admin" options={{ headerShown: false }} />
                    <Stack.Screen name="chat" options={{ title: "CrystalDBC Assistant" }} />
                    <Stack.Screen name="investment" options={{ title: "Investment" }} />
                    <Stack.Screen name="my-investments" options={{ title: "My Investments" }} />
                    <Stack.Screen name="about" options={{ title: "About" }} />
                    <Stack.Screen name="contact" options={{ title: "Contact" }} />
                    <Stack.Screen name="terms" options={{ title: "Terms & Conditions" }} />
                    <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
                  </Stack>
                </PropertySearchProvider>
              </RegisterInterestProvider>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>

      {/* Brand video on cold start; renders above the navigator and fades out. */}
      <SplashVideo />
    </GestureHandlerRootView>
  );
}
