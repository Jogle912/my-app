import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Space, useTheme } from "@/constants/theme";
import { DAY_NAMES } from "@/lib/time";

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const t = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screen, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.title, { color: t.text }]}>
      {children}
    </Text>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.heading, { color: t.text }]}>
      {children}
    </Text>
  );
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  const t = useTheme();
  return <Text style={[{ color: muted ? t.textSecondary : t.text, fontSize: 15, lineHeight: 21 }, style]}>{children}</Text>;
}

export function Card({ children, accent }: { children: ReactNode; accent?: string }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.card, borderColor: t.border },
        accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  busy,
  disabled,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  busy?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const t = useTheme();
  const bg = variant === "primary" ? t.primary : t.card;
  const fg = variant === "primary" ? t.primaryText : variant === "danger" ? t.danger : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === "primary" ? bg : t.border, opacity: pressed || disabled ? 0.7 : 1 },
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: Space.xs }}>
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={t.textSecondary}
        style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: error ? t.danger : t.border }]}
        {...props}
      />
      {error ? <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={[styles.label, { color: t.text }]}>{children}</Text>;
}

/** Single-select row of chips (accessible as radio buttons). */
export function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: Space.xs }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Label>{label}</Label>
      <View style={styles.chips}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.value)}
              style={[styles.chip, { borderColor: selected ? t.primary : t.border, backgroundColor: selected ? t.chip : t.card }]}
            >
              <Text style={{ color: selected ? t.primary : t.text, fontWeight: selected ? "600" : "400" }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Multi-select weekday chips (ISO weekdays 1–7). */
export function DayPicker({ value, onChange, label = "Days" }: { value: number[]; onChange: (d: number[]) => void; label?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: Space.xs }} accessibilityLabel={label}>
      <Label>{label}</Label>
      <View style={styles.chips}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => {
          const on = value.includes(d);
          return (
            <Pressable
              key={d}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={DAY_NAMES[d]}
              onPress={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())}
              style={[styles.day, { borderColor: on ? t.primary : t.border, backgroundColor: on ? t.primary : t.card }]}
            >
              <Text style={{ color: on ? t.primaryText : t.text, fontWeight: "600" }}>{DAY_NAMES[d].slice(0, 2)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Banner({ children, tone = "warning" }: { children: ReactNode; tone?: "warning" | "success" | "error" }) {
  const t = useTheme();
  const bg = tone === "success" ? t.successBg : t.warningBg;
  const fg = tone === "success" ? t.successText : tone === "error" ? t.danger : t.warningText;
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: bg }]}>
      {typeof children === "string" ? <Text style={{ color: fg, fontSize: 14, lineHeight: 20 }}>{children}</Text> : children}
    </View>
  );
}

export function ErrorText({ message }: { message?: string }) {
  const t = useTheme();
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" style={{ color: t.danger, fontSize: 14 }}>
      {message}
    </Text>
  );
}

export function Loading() {
  const t = useTheme();
  return (
    <View style={{ padding: Space.xl, alignItems: "center" }}>
      <ActivityIndicator color={t.primary} accessibilityLabel="Loading" />
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", gap: Space.md, alignItems: "flex-start" }}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { padding: Space.lg, gap: Space.lg, paddingBottom: 120 },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.5 },
  heading: { fontSize: 18, fontWeight: "600" },
  card: { borderWidth: 1, borderRadius: 12, padding: Space.lg, gap: Space.md },
  button: { minHeight: 48, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Space.lg },
  buttonText: { fontSize: 16, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: Space.md, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm },
  chip: { minHeight: 40, paddingHorizontal: Space.md, borderRadius: 20, borderWidth: 1, justifyContent: "center" },
  day: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  banner: { borderRadius: 10, padding: Space.md, gap: Space.sm },
});
