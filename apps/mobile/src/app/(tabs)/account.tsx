import { useState } from "react";
import { TimeField } from "@/components/pickers";
import { Banner, Body, Button, Card, Choice, ErrorText, Field, Heading, Loading, Row, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useApi, useMutation } from "@/lib/hooks";
import { ENERGY } from "@/lib/options";
import { deviceTimeZone } from "@/lib/time";
import type { Preferences } from "@/lib/types";

export default function AccountTab() {
  const { data: session } = authClient.useSession();
  const { data, loading, error } = useApi<{ preferences: Preferences }>("/api/v1/preferences");
  // Unsaved edits layered over the loaded preferences.
  const [edits, setEdits] = useState<Partial<Preferences>>({});
  const p: Preferences | undefined = data ? { ...data.preferences, ...edits } : undefined;
  const [saved, setSaved] = useState(false);
  const m = useMutation();

  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => {
    setSaved(false);
    setEdits((prev) => ({ ...prev, [k]: v }));
  };
  const num = (k: keyof Preferences) => (s: string) => set(k, (Number(s.replace(/\D/g, "")) || 0) as never);
  const phoneZone = deviceTimeZone();

  async function save() {
    if (!p) return;
    const ok = await m.run(() => api("/api/v1/preferences", { method: "PUT", body: p }));
    setSaved(ok);
  }

  return (
    <Screen>
      <Title>Account</Title>
      <Card>
        <Heading>{session?.user.name}</Heading>
        <Body muted>{session?.user.email}</Body>
        <Button title="Sign out" variant="secondary" onPress={() => authClient.signOut()} />
      </Card>
      <ErrorText message={error?.message} />
      {loading && !p && <Loading />}
      {p && (
        <Card>
          <Heading>Planning preferences</Heading>
          <Field label="Time zone" value={p.timeZone} onChangeText={(v) => set("timeZone", v)} autoCapitalize="none" />
          {p.timeZone !== phoneZone && (
            <Button title={`Use this phone's time zone (${phoneZone})`} variant="secondary" onPress={() => set("timeZone", phoneZone)} />
          )}
          <Row>
            <TimeField label="Bedtime" value={p.sleepStart} onChange={(v) => set("sleepStart", v)} />
            <TimeField label="Wake up" value={p.sleepEnd} onChange={(v) => set("sleepEnd", v)} />
          </Row>
          <Field label="Max study minutes per day" value={String(p.maxStudyMinutesPerDay)} onChangeText={num("maxStudyMinutesPerDay")} keyboardType="number-pad" />
          <Field label="Preferred session length (minutes)" value={String(p.preferredSessionMinutes)} onChangeText={num("preferredSessionMinutes")} keyboardType="number-pad" />
          <Field label="Break between sessions (minutes)" value={String(p.breakMinutes)} onChangeText={num("breakMinutes")} keyboardType="number-pad" />
          <Field label="Finish this many hours before deadlines" value={String(p.deadlineBufferHours)} onChangeText={num("deadlineBufferHours")} keyboardType="number-pad" />
          <Choice label="Morning energy" options={ENERGY} value={p.energyMorning} onChange={(v) => set("energyMorning", v)} />
          <Choice label="Afternoon energy" options={ENERGY} value={p.energyAfternoon} onChange={(v) => set("energyAfternoon", v)} />
          <Choice label="Evening energy" options={ENERGY} value={p.energyEvening} onChange={(v) => set("energyEvening", v)} />
          <ErrorText message={m.error} />
          {saved && <Banner tone="success">Saved. Your plan will use these settings.</Banner>}
          <Button title="Save preferences" onPress={save} busy={m.busy} />
        </Card>
      )}
    </Screen>
  );
}
