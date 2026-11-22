import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { authClient } from "@/lib/auth-client";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const { data: session, isPending } = authClient.useSession();
  const signedIn = !!session;

  useEffect(() => {
    if (!isPending) void SplashScreen.hideAsync();
  }, [isPending]);

  // Keep the splash screen up until we know whether a session is stored on the device.
  if (isPending) return null;

  return (
    <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn} redirectTo="/welcome">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="course/[id]" options={{ headerShown: true, title: "Course", headerBackTitle: "Back" }} />
          <Stack.Screen name="assignment/[id]" options={{ headerShown: true, title: "Assignment", headerBackTitle: "Back" }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn} redirectTo="/">
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-in" options={{ headerShown: true, title: "Sign in", headerBackTitle: "Back" }} />
          <Stack.Screen name="sign-up" options={{ headerShown: true, title: "Create account", headerBackTitle: "Back" }} />
          <Stack.Screen name="demo" options={{ headerShown: true, title: "Demo plan", headerBackTitle: "Back" }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
