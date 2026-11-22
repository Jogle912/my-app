import { useState } from "react";
import { Text, View } from "react-native";
import { TimeField } from "@/components/pickers";
import { Body, Button, Card, DayPicker, ErrorText, Field, Heading, Loading, Row, Screen, Title } from "@/components/ui";
import { Space, useTheme } from "@/constants/theme";
import { api } from "@/lib/api";
import { useApi, useMutation } from "@/lib/hooks";
import { formatDays } from "@/lib/time";
import type { AvailabilityRule } from "@/lib/types";

function RuleForm({ kind, onSaved }: { kind: "AVAILABLE" | "BLOCKED"; onSaved: () => void }) {
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStart] = useState(kind === "AVAILABLE" ? "18:00" : "09:00");
  const [endTime, setEnd] = useState(kind === "AVAILABLE" ? "21:00" : "17:00");
  const [label, setLabel] = useState("");
  const m = useMutation();

  async function save() {
    const ok = await m.run(() => api("/api/v1/availability", { method: "POST", body: { kind, days, startTime, endTime, label: label || undefined } }));
    if (ok) {
      setDays([]);
      setLabel("");
      onSaved();
    }
  }

  return (
    <View style={{ gap: Space.md }}>
      <DayPicker value={days} onChange={setDays} />
      <Row>
        <TimeField label="From" value={startTime} onChange={setStart} />
        <TimeField label="To" value={endTime} onChange={setEnd} />
      </Row>
      {kind === "BLOCKED" && <Field label="What is it?" value={label} onChangeText={setLabel} placeholder="e.g. Campus job" />}
      <ErrorText message={m.error} />
      <Button title={kind === "AVAILABLE" ? "Add study time" : "Add commitment"} variant={kind === "AVAILABLE" ? "primary" : "secondary"} onPress={save} busy={m.busy} disabled={days.length === 0} />
    </View>
  );
}

function RuleList({ rules, onChanged }: { rules: AvailabilityRule[]; onChanged: () => void }) {
  const t = useTheme();
  const m = useMutation();
  return (
    <View style={{ gap: Space.sm }}>
      {rules.map((r) => (
        <View key={r.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Space.sm }}>
          <Text style={{ color: t.text, flexShrink: 1 }}>
            {r.label ? `${r.label} · ` : ""}
            {formatDays(r.days)} · {r.startTime}–{r.endTime}
          </Text>
          <Button
            title="Remove"
            variant="danger"
            busy={m.busy}
            onPress={() => m.run(() => api(`/api/v1/availability/${r.id}`, { method: "DELETE" })).then((ok) => ok && onChanged())}
          />
        </View>
      ))}
      <ErrorText message={m.error} />
    </View>
  );
}

export default function WeekTab() {
  const { data, loading, error, reload } = useApi<{ rules: AvailabilityRule[] }>("/api/v1/availability");
  const study = data?.rules.filter((r) => r.kind === "AVAILABLE") ?? [];
  const busy = data?.rules.filter((r) => r.kind === "BLOCKED") ?? [];
  return (
    <Screen>
      <Title>My week</Title>
      <Body muted>StudyPilot only plans study inside your study times, around your classes and commitments.</Body>
      <ErrorText message={error?.message} />
      {loading && !data && <Loading />}
      <Card>
        <Heading>When can you study?</Heading>
        {data && study.length === 0 && <Body muted>No study times yet. Your plan stays empty until you add some.</Body>}
        <RuleList rules={study} onChanged={reload} />
        <RuleForm kind="AVAILABLE" onSaved={reload} />
      </Card>
      <Card>
        <Heading>Regular commitments</Heading>
        <Body muted>Work shifts, practice, anything weekly. Add class times on each course.</Body>
        <RuleList rules={busy} onChanged={reload} />
        <RuleForm kind="BLOCKED" onSaved={reload} />
      </Card>
    </Screen>
  );
}
