import { useState } from "react";
import { LayoutAnimation, Platform, Pressable, UIManager, View } from "react-native";
import { Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { colors } from "@/lib/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface AccordionItemData {
  question: string;
  answer: string;
}

/** Single-open accordion mirroring the FAQ block on the web home page. */
export const Accordion = ({ items }: { items: AccordionItemData[] }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <View>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <View key={`${item.question}-${index}`} className="border-b border-border/60">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              onPress={() => toggle(index)}
              className="flex-row items-center justify-between gap-3 py-4"
            >
              <Text variant="label" className={`flex-1 ${isOpen ? "text-luxury-gold" : ""}`}>
                {item.question}
              </Text>
              <Glyph
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={isOpen ? colors.gold : colors.mutedForeground}
              />
            </Pressable>
            {isOpen ? <Muted className="pb-4 leading-5">{item.answer}</Muted> : null}
          </View>
        );
      })}
    </View>
  );
};

export default Accordion;
