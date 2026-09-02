import { forwardRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets, type Edge } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/* ---------------------------------- Text ---------------------------------- */

type TypographyVariant = "display" | "title" | "heading" | "body" | "label" | "caption";

const TEXT_VARIANTS: Record<TypographyVariant, string> = {
  display: "text-3xl font-semibold text-foreground",
  title: "text-2xl font-semibold text-foreground",
  heading: "text-lg font-semibold text-foreground",
  body: "text-base text-foreground",
  label: "text-sm font-medium text-foreground",
  caption: "text-xs text-muted-foreground",
};

export const Text = ({
  variant = "body",
  className,
  ...props
}: TextProps & { variant?: TypographyVariant; className?: string }) => (
  <RNText className={cx(TEXT_VARIANTS[variant], className)} {...props} />
);

export const Muted = ({ className, ...props }: TextProps & { className?: string }) => (
  <RNText className={cx("text-sm text-muted-foreground", className)} {...props} />
);

/** Small uppercase gold eyebrow used above section titles across the web app. */
export const Eyebrow = ({ className, ...props }: TextProps & { className?: string }) => (
  <RNText className={cx("text-xs uppercase tracking-[2px] text-luxury-gold", className)} {...props} />
);

/* --------------------------------- Layout --------------------------------- */

export const Screen = ({
  className,
  edges = ["top"],
  children,
  ...props
}: ViewProps & { className?: string; edges?: Edge[] }) => (
  <SafeAreaView edges={edges} className="flex-1 bg-background">
    <View className={cx("flex-1", className)} {...props}>
      {children}
    </View>
  </SafeAreaView>
);

/**
 * Full-screen container for content inside a <Modal>.
 *
 * SafeAreaView measures its own native view, and a Modal renders into a separate
 * native window where that measurement comes back as zero — so a header inside a
 * modal slides under the status bar and stops receiving taps. useSafeAreaInsets
 * reads the provider's values through React context, which stay correct inside
 * the modal. Use this instead of SafeAreaView for any full-screen modal.
 */
export const ModalScreen = ({
  className,
  style,
  edges = ["top", "bottom"],
  ...props
}: ViewProps & { className?: string; edges?: Edge[] }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={cx("flex-1 bg-background", className)}
      style={[
        {
          paddingTop: edges.includes("top") ? insets.top : 0,
          paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
        },
        style,
      ]}
      {...props}
    />
  );
};

export const Card = ({ className, ...props }: ViewProps & { className?: string }) => (
  <View className={cx("rounded-lg border border-border bg-card p-4", className)} {...props} />
);

export const Divider = ({ className }: { className?: string }) => (
  <View className={cx("h-px w-full bg-border", className)} />
);

export const Row = ({ className, ...props }: ViewProps & { className?: string }) => (
  <View className={cx("flex-row items-center", className)} {...props} />
);

/* --------------------------------- Button --------------------------------- */

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, { container: string; label: string }> = {
  primary: { container: "bg-luxury-gold", label: "text-accent-foreground font-semibold" },
  secondary: { container: "bg-secondary", label: "text-foreground font-semibold" },
  outline: { container: "border border-luxury-gold bg-transparent", label: "text-luxury-gold font-semibold" },
  ghost: { container: "bg-transparent", label: "text-foreground font-medium" },
  destructive: { container: "bg-destructive", label: "text-destructive-foreground font-semibold" },
};

const BUTTON_SIZES: Record<ButtonSize, { container: string; label: string }> = {
  sm: { container: "px-3 py-2", label: "text-xs" },
  md: { container: "px-4 py-3", label: "text-sm" },
  lg: { container: "px-5 py-4", label: "text-base" },
};

export interface ButtonProps extends Omit<PressableProps, "children"> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  leading?: React.ReactNode;
}

export const Button = ({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className,
  leading,
  ...props
}: ButtonProps) => {
  const isDisabled = disabled || loading;
  const v = BUTTON_VARIANTS[variant];
  const s = BUTTON_SIZES[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      className={cx(
        "flex-row items-center justify-center gap-2 rounded-md",
        v.container,
        s.container,
        fullWidth && "w-full",
        isDisabled && "opacity-50",
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === "primary" ? colors.background : colors.gold} />
      ) : (
        leading
      )}
      <RNText className={cx(v.label, s.label)}>{title}</RNText>
    </Pressable>
  );
};

/* ---------------------------------- Input --------------------------------- */

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, className, containerClassName, ...props }, ref) => (
    <View className={cx("gap-1.5", containerClassName)}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.mutedForeground}
        className={cx(
          "rounded-md border bg-card px-3 py-3 text-base text-foreground",
          error ? "border-destructive" : "border-border",
          className,
        )}
        {...props}
      />
      {error ? (
        <RNText className="text-xs text-destructive">{error}</RNText>
      ) : hint ? (
        <RNText className="text-xs text-muted-foreground">{hint}</RNText>
      ) : null}
    </View>
  ),
);
Input.displayName = "Input";

/* ---------------------------------- Badge --------------------------------- */

export const Badge = ({
  label,
  color,
  className,
}: {
  label: string;
  color?: string;
  className?: string;
}) => (
  <View
    className={cx("self-start rounded-sm px-2 py-1", !color && "bg-secondary", className)}
    style={color ? { backgroundColor: `${color}22`, borderColor: color, borderWidth: 1 } : undefined}
  >
    <RNText className="text-xs font-medium" style={color ? { color } : { color: colors.foreground }}>
      {label}
    </RNText>
  </View>
);

/* --------------------------------- Scroll --------------------------------- */

export const ScreenScroll = ({
  className,
  contentClassName,
  children,
  ...props
}: React.ComponentProps<typeof ScrollView> & { className?: string; contentClassName?: string }) => (
  <ScrollView
    className={cx("flex-1 bg-background", className)}
    contentContainerClassName={cx("px-4 pb-24 pt-4 gap-6", contentClassName)}
    keyboardShouldPersistTaps="handled"
    {...props}
  >
    {children}
  </ScrollView>
);

export { cx };
