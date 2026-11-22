import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { DateTimeField, TimeField } from "@/components/pickers";
import { Body, Button, Card, Choice, DayPicker, ErrorText, Field, Heading, Loading, Row, Screen } from "@/components/ui";
import { Space, useTheme } from "@/constants/theme";
import { api } from "@/lib/api";
import { useApi, useMutation } from "@/lib/hooks";
import { KINDS } from "@/lib/options";
import { formatDays, formatDue } from "@/lib/time";
import type { AssignmentKind, CourseDetail, Preferences } from "@/lib/types";

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onYes },
  ]);
}

function AddAssignment({ courseId, onSaved }: { courseId: string; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AssignmentKind>("HOMEWORK");
  const [dueAt, setDueAt] = useState<Date>();
  const [estimate, setEstimate] = useState("");
  const m = useMutation();

  async function save() {
    const ok = await m.run(() =>
      api("/api/v1/assignments", {
        method: "POST",
        body: { courseId, title, kind, dueAt: dueAt?.toISOString(), estimatedMinutes: estimate ? Number(estimate) : undefined },
      }),
    );
    if (ok) {
      setTitle("");
      setEstimate("");
      setDueAt(undefined);
      onSaved();
    }
  }

  return (
    <Card>
      <Heading>Add an assignment or exam</Heading>
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Problem Set 7" />
      <Choice label="Type" options={KINDS} value={kind} onChange={setKind} />
      <DateTimeField label={kind === "EXAM" || kind === "QUIZ" ? "Starts" : "Due"} value={dueAt} onChange={setDueAt} />
      <Field
        label="Estimated minutes (optional)"
        value={estimate}
        onChangeText={(s) => setEstimate(s.replace(/\D/g, ""))}
        keyboardType="number-pad"
        placeholder="Leave blank for a typical estimate"
      />
      <ErrorText message={m.error} />
      <Button title="Add" onPress={save} busy={m.busy} disabled={!title.trim() || !dueAt} />
    </Card>
  );
}

function AddMeeting({ courseId, onSaved }: { courseId: string; onSaved: () => void }) {
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("09:50");
  const m = useMutation();
  return (
    <View style={{ gap: Space.md }}>
      <DayPicker value={days} onChange={setDays} />
      <Row>
        <TimeField label="Starts" value={start} onChange={setStart} />
        <TimeField label="Ends" value={end} onChange={setEnd} />
      </Row>
      <ErrorText message={m.error} />
      <Button
        title="Add class time"
        variant="secondary"
        busy={m.busy}
        disabled={days.length === 0}
        onPress={() =>
          m.run(() => api(`/api/v1/courses/${courseId}/meetings`, { method: "POST", body: { days, startTime: start, endTime: end } })).then((ok) => {
            if (ok) {
              setDays([]);
              onSaved();
            }
          })
        }
      />
    </View>
  );
}

export default function CourseScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useApi<{ course: CourseDetail }>(`/api/v1/courses/${id}`);
  const prefs = useApi<{ preferences: Preferences }>("/api/v1/preferences");
  const zone = prefs.data?.preferences.timeZone ?? "UTC";
  const m = useMutation();
  const course = data?.course;

  return (
    <Screen>
      <Stack.Screen options={{ title: course?.name ?? "Course" }} />
      <ErrorText message={error?.message} />
      {loading && !course && <Loading />}
      {course && (
        <>
          <Card>
            <Heading>Assignments and exams</Heading>
            {course.assignments.length === 0 && <Body muted>Nothing added yet.</Body>}
            {course.assignments.map((a) => (
              <Pressable key={a.id} accessibilityRole="button" onPress={() => router.push(`/assignment/${a.id}`)} style={{ paddingVertical: Space.xs }}>
                <Text style={{ color: a.studentDone ? t.textSecondary : t.text, fontSize: 16, fontWeight: "600", textDecorationLine: a.studentDone ? "line-through" : "none" }}>
                  {a.title}
                </Text>
                <Text style={{ color: t.textSecondary }}>
                  {KINDS.find((k) => k.value === a.kind)?.label ?? a.kind} · due {formatDue(a.dueAt, zone)}
                </Text>
              </Pressable>
            ))}
          </Card>
          <AddAssignment courseId={course.id} onSaved={reload} />
          <Card>
            <Heading>Class times</Heading>
            {course.meetings.map((mt) => (
              <View key={mt.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Space.sm }}>
                <Text style={{ color: t.text }}>
                  {formatDays(mt.days)} · {mt.startTime}–{mt.endTime}
                </Text>
                <Button
                  title="Remove"
                  variant="danger"
                  onPress={async () => {
                    if (await m.run(() => api(`/api/v1/meetings/${mt.id}`, { method: "DELETE" }))) await reload();
                  }}
                />
              </View>
            ))}
            <AddMeeting courseId={course.id} onSaved={reload} />
          </Card>
          <ErrorText message={m.error} />
          <Button
            title="Delete course"
            variant="danger"
            onPress={() =>
              confirm("Delete this course?", "Its assignments and class times will be removed too.", () =>
                m.run(() => api(`/api/v1/courses/${course.id}`, { method: "DELETE" })).then((ok) => ok && router.back()),
              )
            }
          />
        </>
      )}
    </Screen>
  );
}
