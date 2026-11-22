import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Switch, Text, View } from "react-native";
import { Body, Button, Card, ErrorText, Field, Heading, Loading, Row, Screen, Title } from "@/components/ui";
import { Space, useTheme } from "@/constants/theme";
import { api } from "@/lib/api";
import { useApi, useMutation } from "@/lib/hooks";
import { formatDue } from "@/lib/time";
import type { Assignment, Preferences } from "@/lib/types";

const DEFAULT_ESTIMATE: Record<string, number> = { HOMEWORK: 120, PROJECT: 360, READING: 60, QUIZ: 90, EXAM: 240, DISCUSSION: 45, OTHER: 90 };

export default function AssignmentScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useApi<{ assignment: Assignment }>(`/api/v1/assignments/${id}`);
  const prefs = useApi<{ preferences: Preferences }>("/api/v1/preferences");
  const zone = prefs.data?.preferences.timeZone ?? "UTC";
  const [stepTitle, setStepTitle] = useState("");
  const [stepMinutes, setStepMinutes] = useState("");
  const m = useMutation();
  const a = data?.assignment;
  const steps = a?.milestones ?? [];
  const total = steps.length ? steps.reduce((s, x) => s + x.estimatedMinutes, 0) : (a?.estimatedMinutes ?? (a ? DEFAULT_ESTIMATE[a.kind] : 0));

  const change = async (fn: () => Promise<unknown>) => {
    if (await m.run(fn)) await reload();
  };

  function remove() {
    const go = () => m.run(() => api(`/api/v1/assignments/${id}`, { method: "DELETE" })).then((ok) => ok && router.back());
    if (Platform.OS === "web") return globalThis.confirm?.("Delete this assignment?") && go();
    Alert.alert("Delete this assignment?", "Its planned sessions will be removed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: go },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: a?.course?.name ?? "Assignment" }} />
      <ErrorText message={error?.message} />
      {loading && !a && <Loading />}
      {a && (
        <>
          <View style={{ gap: Space.xs }}>
            <Title>{a.title}</Title>
            <Body muted>
              Due {formatDue(a.dueAt, zone)} · about {total} min{!steps.length && !a.estimatedMinutes ? " (typical estimate)" : ""}
            </Body>
          </View>

          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Heading>Finished</Heading>
              <Switch
                accessibilityLabel="Finished or submitted"
                value={a.studentDone}
                onValueChange={(v) => change(() => api(`/api/v1/assignments/${id}/progress`, { method: "PATCH", body: { studentDone: v } }))}
              />
            </View>
            <Body muted>Finished work is taken out of your plan.</Body>
          </Card>

          <Card>
            <Heading>Steps</Heading>
            <Body muted>Break it into steps and StudyPilot schedules them in order. AI-suggested steps are coming soon.</Body>
            {steps.map((s) => (
              <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: Space.sm }}>
                <Switch
                  accessibilityLabel={`${s.title} done`}
                  value={!!s.doneAt}
                  onValueChange={(v) => change(() => api(`/api/v1/milestones/${s.id}`, { method: "PATCH", body: { done: v } }))}
                />
                <Text style={{ flex: 1, color: s.doneAt ? t.textSecondary : t.text, textDecorationLine: s.doneAt ? "line-through" : "none" }}>
                  {s.title} · {s.estimatedMinutes} min
                </Text>
                <Button title="Remove" variant="danger" onPress={() => change(() => api(`/api/v1/milestones/${s.id}`, { method: "DELETE" }))} />
              </View>
            ))}
            <Field label="New step" value={stepTitle} onChangeText={setStepTitle} placeholder="e.g. Outline" />
            <Row>
              <View style={{ flex: 1 }}>
                <Field label="Minutes" value={stepMinutes} onChangeText={(s) => setStepMinutes(s.replace(/\D/g, ""))} keyboardType="number-pad" />
              </View>
            </Row>
            <Button
              title="Add step"
              variant="secondary"
              disabled={!stepTitle.trim() || !stepMinutes}
              busy={m.busy}
              onPress={() =>
                change(() => api(`/api/v1/assignments/${id}/milestones`, { method: "POST", body: { title: stepTitle, estimatedMinutes: Number(stepMinutes) } })).then(() => {
                  setStepTitle("");
                  setStepMinutes("");
                })
              }
            />
          </Card>
          <ErrorText message={m.error} />
          <Button title="Delete assignment" variant="danger" onPress={remove} />
        </>
      )}
    </Screen>
  );
}
