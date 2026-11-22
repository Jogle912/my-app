import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Body, Button, Card, Choice, ErrorText, Field, Heading, Loading, Screen, Title } from "@/components/ui";
import { courseColor, Space, useTheme } from "@/constants/theme";
import { api } from "@/lib/api";
import { useApi, useMutation } from "@/lib/hooks";
import { DIFFICULTY } from "@/lib/options";
import type { Course } from "@/lib/types";

export default function CoursesTab() {
  const t = useTheme();
  const { data, loading, error, reload } = useApi<{ courses: Course[] }>("/api/v1/courses");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const m = useMutation();

  async function add() {
    const ok = await m.run(() => api("/api/v1/courses", { method: "POST", body: { name, code: code || undefined, difficulty } }));
    if (ok) {
      setName("");
      setCode("");
      setDifficulty(3);
      void reload();
    }
  }

  return (
    <Screen>
      <Title>Courses</Title>
      <ErrorText message={error?.message} />
      {loading && !data && <Loading />}
      {data?.courses.length === 0 && <Body muted>No courses yet. Add your first one below. Canvas import is coming soon.</Body>}
      {data?.courses.map((c) => (
        <Pressable key={c.id} accessibilityRole="button" onPress={() => router.push(`/course/${c.id}`)}>
          <Card accent={courseColor(c.id)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: Space.sm }}>
              <Text style={{ color: t.text, fontSize: 16, fontWeight: "600", flexShrink: 1 }}>{c.name}</Text>
              <Text style={{ color: t.textSecondary }}>
                {c._count?.assignments ?? 0} item{c._count?.assignments === 1 ? "" : "s"}
              </Text>
            </View>
            {c.code ? <Text style={{ color: t.textSecondary }}>{c.code}</Text> : null}
          </Card>
        </Pressable>
      ))}

      <Card>
        <Heading>Add a course</Heading>
        <Field label="Course name" value={name} onChangeText={setName} placeholder="e.g. Calculus I" />
        <Field label="Code (optional)" value={code} onChangeText={setCode} placeholder="e.g. MATH 1610" autoCapitalize="characters" />
        <Choice label="How hard is it for you?" options={DIFFICULTY} value={difficulty} onChange={setDifficulty} />
        <ErrorText message={m.error} />
        <Button title="Add course" onPress={add} busy={m.busy} disabled={!name.trim()} />
      </Card>
    </Screen>
  );
}
