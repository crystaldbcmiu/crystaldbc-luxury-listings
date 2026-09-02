import { useEffect, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Themed";
import useIsRTL from "@/hooks/useIsRTL";
import { colors } from "@/lib/theme";

/**
 * The in-page section navigator on the property screen, modelled on Property
 * Finder's: a horizontally scrolling row of section names that sticks under the
 * gallery, highlights whichever section you are looking at, and jumps to a
 * section when tapped.
 */
export interface SectionTab {
  key: string;
  label: string;
}

interface Props {
  tabs: SectionTab[];
  activeKey: string;
  onSelect: (key: string) => void;
}

const SectionTabs = ({ tabs, activeKey, onSelect }: Props) => {
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const isRTL = useIsRTL();

  // Keep the active tab in view as the reader scrolls past sections.
  useEffect(() => {
    const x = offsets.current[activeKey];
    if (typeof x === "number") {
      scrollRef.current?.scrollTo({ x: Math.max(0, x - 48), animated: true });
    }
  }, [activeKey]);

  if (tabs.length < 2) return null;

  return (
    <View className="border-b border-border bg-background">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        className="grow-0"
        contentContainerClassName="items-center px-4"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onSelect(tab.key)}
              onLayout={(event) => {
                offsets.current[tab.key] = event.nativeEvent.layout.x;
              }}
              className="self-center px-4 py-3.5"
            >
              <Text
                className={`text-base ${isActive ? "font-semibold text-luxury-gold" : "text-muted-foreground"}`}
                style={{ writingDirection: isRTL ? "rtl" : "ltr" }}
              >
                {tab.label}
              </Text>
              {/* Underline marks the active section, as in the reference design. */}
              <View
                className="mt-2 h-0.5 rounded-full"
                style={{ backgroundColor: isActive ? colors.gold : "transparent" }}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default SectionTabs;
