import { useState } from "react";
import { Body, Button, ErrorText, Field, Screen } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password.length < 10) return setError("Use at least 10 characters for your password.");
    setBusy(true);
    setError(undefined);
    const { error } = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message ?? "Could not create the account.");
  }

  return (
    <Screen>
      <Field label="Name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <Body muted>At least 10 characters.</Body>
      <ErrorText message={error} />
      <Button title="Create account" onPress={submit} busy={busy} disabled={!name || !email || !password} />
    </Screen>
  );
}
