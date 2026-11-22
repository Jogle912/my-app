import { router } from "expo-router";
import { Text, View } from "react-native";
import { Body, Button, Screen } from "@/components/ui";
import { Space, useTheme } from "@/constants/theme";

export default function Welcome() {
  const t = useTheme();
  return (
    <Screen>
      <View style={{ gap: Space.lg, paddingTop: 48 }}>
        <Text accessibilityRole="header" style={{ color: t.primary, fontSize: 18, fontWeight: "700" }}>
          StudyPilot
        </Text>
        <Text style={{ color: t.text, fontSize: 34, fontWeight: "800", letterSpacing: -0.5 }}>Turn deadlines into a plan you can actually follow.</Text>
        <Body muted>
          StudyPilot builds a realistic study schedule around your classes and life, adapts when plans change, and tells you
          honestly when there isn&apos;t enough time.
        </Body>
      </View>
      <View style={{ gap: Space.md, marginTop: Space.xl }}>
        <Button title="Create account" onPress={() => router.push("/sign-up")} />
        <Button title="Sign in" variant="secondary" onPress={() => router.push("/sign-in")} />
        <Button title="Try the demo" variant="secondary" onPress={() => router.push("/demo")} accessibilityHint="See a sample plan without an account" />
      </View>
    </Screen>
  );
}
