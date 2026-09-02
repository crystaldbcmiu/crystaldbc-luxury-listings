import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import BrandLogo from "@/components/BrandLogo";
import Glyph, { type GlyphName } from "@/components/ui/Glyph";
import { colors } from "@/lib/theme";

/**
 * The top-level destinations. Each one shows the brand lockup in the top bar
 * instead of its own name — the tab label underneath already says which screen
 * you are on, so repeating it up top wasted the most prominent strip in the app.
 * Pushed screens keep a real title, because there the header is what tells you
 * where the back button goes.
 */
const TABS: { name: string; labelKey: string; fallback: string; icon: GlyphName }[] = [
  { name: "index", labelKey: "nav.home", fallback: "Home", icon: "villa" },
  { name: "listings", labelKey: "nav.properties", fallback: "Properties", icon: "apartment" },
  { name: "map", labelKey: "nav.map", fallback: "Map", icon: "location" },
  { name: "favorites", labelKey: "nav.favorites", fallback: "Favorites", icon: "heart" },
  { name: "profile", labelKey: "nav.profile", fallback: "Profile", icon: "person-outline" },
];

/** Content height of the bar below the status-bar inset — room for the 52pt lockup. */
const HEADER_CONTENT_HEIGHT = 72;
const LOGO_HEIGHT = 52;

/**
 * Native stack/tab headers ignore height in headerStyle, so a 52pt logo gets
 * clipped inside the default ~44pt title slot. This custom header owns its own
 * height (safe-area top + content) and centres the lockup with padding so
 * nothing spills out the top or bottom.
 */
const BrandHeader = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        <BrandLogo variant="full" height={LOGO_HEIGHT} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerContent: {
    height: HEADER_CONTENT_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
});

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        header: () => <BrandHeader />,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.mutedForeground,
      }}
    >
      {TABS.map(({ name, labelKey, fallback, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            // Still set, so the tab label and screen reader announcement read as
            // the page name even though the header renders the logo.
            title: t(labelKey, fallback),
            tabBarIcon: ({ color, size }) => <Glyph name={icon} color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
