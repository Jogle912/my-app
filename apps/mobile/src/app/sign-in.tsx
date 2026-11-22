import { useState } from "react";
import { Button, ErrorText, Field, Screen } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(undefined);
    const { error } = await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    // On success the session updates and the root layout switches to the app.
    if (error) setError(error.status === 0 ? "Can't reach StudyPilot. Check your connection." : "Email or password is incorrect.");
  }

  return (
    <Screen>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
      <ErrorText message={error} />
      <Button title="Sign in" onPress={submit} busy={busy} disabled={!email || !password} />
    </Screen>
  );
}
