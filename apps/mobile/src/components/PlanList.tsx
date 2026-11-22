import type { PlanResult } from "@studypilot/scheduler";
import { Pressable, Text, View } from "react-native";
import { courseColor, Space, useTheme } from "@/constants/theme";
import { groupByDay } from "@/lib/days";
import { formatTime, hours } from "@/lib/time";
import { Banner, Body, Card } from "./ui";

/** The study plan: capacity summary, honest warnings, then sessions grouped by day. */
export function PlanList({
  result,
  timeZone,
  courseNames,
  onOpenItem,
  now,
}: {
  result: PlanResult;
  timeZone: string;
  courseNames: Record<string, string>;
  onOpenItem?: (itemId: string) => void;
  now?: Date;
}) {
  const t = useTheme();
  const days = groupByDay(result, timeZone, now);
  const { demandMinutes, scheduledMinutes, availableMinutes } = result.capacity;

  return (
    <View style={{ gap: Space.lg }}>
      <View style={{ flexDirection: "row", gap: Space.sm }}>
        {(
          [
            ["To do", demandMinutes],
            ["Planned", scheduledMinutes],
            ["Free", availableMinutes],
          ] as const
        ).map(([label, mins]) => (
          <View
            key={label}
            accessible
            accessibilityLabel={`${label}: ${hours(mins)}`}
            style={{ flex: 1, backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: 12, padding: Space.md }}
          >
            <Text style={{ color: t.textSecondary, fontSize: 13 }}>{label}</Text>
            <Text style={{ color: t.text, fontSize: 20, fontWeight: "700" }}>{hours(mins)}</Text>
          </View>
        ))}
      </View>

      {result.shortfalls.map((s) => (
        <Banner key={s.itemId}>{s.explanation}</Banner>
      ))}
      {result.warnings.map((w, i) => (
        <Banner key={`w${i}`}>{w.message}</Banner>
      ))}

      {days.length === 0 && <Body muted>Nothing to schedule right now.</Body>}

      {days.map((day) => (
        <View key={day.key} style={{ gap: Space.sm }}>
          <Text accessibilityRole="header" style={{ color: t.textSecondary, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
            {day.title}
          </Text>
          {day.data.map((s) => (
            <Pressable
              key={s.key}
              disabled={!onOpenItem || !s.itemId}
              onPress={() => onOpenItem?.(s.itemId)}
              accessibilityRole={onOpenItem ? "button" : undefined}
              accessibilityLabel={`${s.title}, ${courseNames[s.courseId] ?? ""}, ${formatTime(s.start, timeZone)} to ${formatTime(s.end, timeZone)}`}
            >
              <Card accent={courseColor(s.courseId)}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: Space.sm }}>
                  <Text style={{ color: t.text, fontSize: 16, fontWeight: "600", flexShrink: 1 }}>{s.title}</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 14 }}>{s.minutes} min</Text>
                </View>
                <Text style={{ color: t.textSecondary, fontSize: 14 }}>
                  {formatTime(s.start, timeZone)} – {formatTime(s.end, timeZone)}
                  {courseNames[s.courseId] ? ` · ${courseNames[s.courseId]}` : ""}
                  {s.bufferReduced ? " · uses your safety buffer" : ""}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
