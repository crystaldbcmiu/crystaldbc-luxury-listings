import { useState, type ReactNode } from "react";
import { FlatList, Modal, Pressable, View } from "react-native";
import { Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { colors } from "@/lib/theme";

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
  icon?: ReactNode;
}

interface SelectProps<T extends string = string> {
  label?: string;
  placeholder?: string;
  value?: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/** Modal-based picker standing in for the web app's Radix Select. */
export function Select<T extends string = string>({
  label,
  placeholder = "Select one",
  value,
  options,
  onChange,
  error,
  disabled,
  className,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className={className}>
      {label ? <Text variant="label" className="mb-1.5">{label}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={`flex-row items-center justify-between rounded-md border bg-card px-3 py-3 ${
          error ? "border-destructive" : "border-border"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
          {selected?.icon}
          <Text className={selected ? "flex-1 text-foreground" : "flex-1 text-muted-foreground"} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </Text>
        </View>
        <Glyph name="chevron-down" size={16} color={colors.mutedForeground} />
      </Pressable>

      {error ? <Text className="mt-1 text-xs text-destructive">{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/70" onPress={() => setOpen(false)}>
          <View
            className="max-h-[70%] rounded-t-lg border-t border-border bg-card pb-8 pt-2"
            onStartShouldSetResponder={() => true}
          >
            <View className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-border" />
            {label ? (
              <Text variant="heading" className="px-4 pb-2">
                {label}
              </Text>
            ) : null}
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    className="flex-row items-center justify-between border-b border-border/50 px-4 py-3.5"
                  >
                    <View className="min-w-0 flex-1 flex-row items-center gap-3">
                      {item.icon}
                      <Text className={isSelected ? "text-luxury-gold" : "text-foreground"}>{item.label}</Text>
                    </View>
                    {isSelected ? <Glyph name="checkmark" size={18} color={colors.gold} /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default Select;
