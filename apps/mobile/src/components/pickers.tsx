import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { DateTime } from "luxon";
import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { Space, useTheme } from "@/constants/theme";
import { fromWallTime, isWallTime, toWallTime } from "@/lib/time";
import { Label } from "./ui";

function PickerButton({ label, text, onPress }: { label: string; text: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${text}`}
      onPress={onPress}
      style={{ minHeight: 48, borderWidth: 1, borderColor: t.border, backgroundColor: t.card, borderRadius: 10, paddingHorizontal: Space.md, justifyContent: "center" }}
    >
      <Text style={{ color: t.text, fontSize: 16 }}>{text}</Text>
    </Pressable>
  );
}

/** "HH:mm" picker using the platform's native time picker. */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  if (Platform.OS === "web") {
    return (
      <View style={{ gap: Space.xs, flex: 1 }}>
        <Label>{label}</Label>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          placeholder="HH:mm"
          placeholderTextColor={t.textSecondary}
          style={{ minHeight: 48, borderWidth: 1, borderColor: isWallTime(value) || !value ? t.border : t.danger, borderRadius: 10, paddingHorizontal: Space.md, color: t.text, backgroundColor: t.card }}
        />
      </View>
    );
  }
  const display = value ? DateTime.fromFormat(value, "HH:mm").toFormat("h:mm a") : "Choose";
  return (
    <View style={{ gap: Space.xs, flex: 1 }}>
      <Label>{label}</Label>
      {Platform.OS === "ios" ? (
        <DateTimePicker
          value={fromWallTime(value || "18:00")}
          mode="time"
          display="compact"
          onChange={(_e: DateTimePickerEvent, d?: Date) => d && onChange(toWallTime(d))}
          accessibilityLabel={label}
        />
      ) : (
        <>
          <PickerButton label={label} text={display} onPress={() => setOpen(true)} />
          {open && (
            <DateTimePicker
              value={fromWallTime(value || "18:00")}
              mode="time"
              onChange={(e: DateTimePickerEvent, d?: Date) => {
                setOpen(false);
                if (e.type === "set" && d) onChange(toWallTime(d));
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

/** Date + time picker (Android shows the date dialog, then the time dialog). */
export function DateTimeField({ label, value, onChange }: { label: string; value: Date | undefined; onChange: (d: Date) => void }) {
  const t = useTheme();
  const [step, setStep] = useState<"closed" | "date" | "time">("closed");
  const [draft, setDraft] = useState<Date>(value ?? new Date());
  const [webText, setWebText] = useState(value ? DateTime.fromJSDate(value).toFormat("yyyy-LL-dd HH:mm") : "");
  const text = value ? DateTime.fromJSDate(value).toFormat("ccc LLL d, h:mm a") : "Choose date and time";

  if (Platform.OS === "web") {
    return (
      <View style={{ gap: Space.xs }}>
        <Label>{label}</Label>
        <TextInput
          accessibilityLabel={label}
          value={webText}
          placeholder="YYYY-MM-DD HH:mm"
          placeholderTextColor={t.textSecondary}
          onChangeText={(s) => {
            setWebText(s);
            const dt = DateTime.fromFormat(s, "yyyy-LL-dd HH:mm");
            if (dt.isValid) onChange(dt.toJSDate());
          }}
          style={{ minHeight: 48, borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: Space.md, color: t.text, backgroundColor: t.card }}
        />
      </View>
    );
  }
  if (Platform.OS === "ios") {
    return (
      <View style={{ gap: Space.xs }}>
        <Label>{label}</Label>
        <DateTimePicker
          value={value ?? draft}
          mode="datetime"
          display="compact"
          onChange={(_e: DateTimePickerEvent, d?: Date) => d && onChange(d)}
          accessibilityLabel={label}
        />
      </View>
    );
  }
  return (
    <View style={{ gap: Space.xs }}>
      <Label>{label}</Label>
      <PickerButton
        label={label}
        text={text}
        onPress={() => {
          setDraft(value ?? new Date());
          setStep("date");
        }}
      />
      {step === "date" && (
        <DateTimePicker
          value={draft}
          mode="date"
          onChange={(e: DateTimePickerEvent, d?: Date) => {
            if (e.type !== "set" || !d) return setStep("closed");
            const next = new Date(draft);
            next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
            setDraft(next);
            setStep("time");
          }}
        />
      )}
      {step === "time" && (
        <DateTimePicker
          value={draft}
          mode="time"
          onChange={(e: DateTimePickerEvent, d?: Date) => {
            setStep("closed");
            if (e.type !== "set" || !d) return;
            const next = new Date(draft);
            next.setHours(d.getHours(), d.getMinutes(), 0, 0);
            onChange(next);
          }}
        />
      )}
    </View>
  );
}
