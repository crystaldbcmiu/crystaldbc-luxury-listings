import { Link } from "expo-router";
import { View } from "react-native";
import { Muted, Text } from "@/components/ui/Themed";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
      <Text variant="title">404</Text>
      <Muted className="text-center">This page could not be found.</Muted>
      <Link href="/" className="text-luxury-gold">Go home</Link>
    </View>
  );
}
