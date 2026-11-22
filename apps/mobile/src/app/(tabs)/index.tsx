import { router } from "expo-router";
import { RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlanList } from "@/components/PlanList";
import { Banner, Body, Button, ErrorText, Loading, Title } from "@/components/ui";
import { Space, useTheme } from "@/constants/theme";
import { useStudentPlan } from "@/lib/planning";

export default function PlanTab() {
  const t = useTheme();
  const { result, input, courseNames, loading, error, reload } = useStudentPlan();
  const noCourses = input && input.courses.length === 0;
  const noTimes = input && input.availability.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ padding: Space.lg, gap: Space.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading && !!result} onRefresh={reload} tintColor={t.primary} />}
      >
        <Title>Your plan</Title>
        <ErrorText message={error?.message} />
        {!result && loading && <Loading />}
        {(noCourses || noTimes) && (
          <Banner tone="success">
            <Body>Let&apos;s set up your week:</Body>
            {noTimes && <Button title="Add times you can study" variant="secondary" onPress={() => router.navigate("/week")} />}
            {noCourses && <Button title="Add your courses" variant="secondary" onPress={() => router.navigate("/courses")} />}
          </Banner>
        )}
        {result && input && (
          <PlanList result={result} timeZone={input.timeZone} courseNames={courseNames} onOpenItem={(id) => router.push(`/assignment/${id}`)} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
