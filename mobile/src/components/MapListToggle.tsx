import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { colors } from "@/lib/theme";

/**
 * The floating pill that swaps between the results list and the map, sitting
 * just above the tab bar the way Property Finder's does.
 */
const MapListToggle = ({ target }: { target: "map" | "list" }) => {
  const { t } = useTranslation();
  const router = useRouter();

  const isMap = target === "map";

  return (
    <View pointerEvents="box-none" className="absolute bottom-6 left-0 right-0 items-center">
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(isMap ? "/map" : "/listings")}
        className="flex-row items-center gap-2 rounded-full border border-luxury-gold bg-card px-6 py-3.5"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.45,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Glyph name={isMap ? "map-outline" : "list-outline"} size={18} color={colors.gold} />
        <Text className="font-semibold text-luxury-gold">
          {isMap ? t("map.showMap", "Map") : t("map.showList", "List")}
        </Text>
      </Pressable>
    </View>
  );
};

export default MapListToggle;
