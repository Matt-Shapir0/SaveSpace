import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";

import { LoadingScreen } from "@/src/components/loading-screen";
import { useAuth } from "@/src/lib/auth";
import { colors } from "@/src/lib/theme";
import { supabase } from "@/src/lib/supabase";

type Mode = "signin" | "signup" | "reset";

export default function AuthScreen() {
  const { loading: authLoading, user, hasProfile } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (authLoading) {
    return <LoadingScreen label="Checking your account..." />;
  }

  if (user && hasProfile) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  if (user && !hasProfile) {
    return <Redirect href="/onboarding" />;
  }

  async function handleReset() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (value: unknown) {
      const message = value instanceof Error ? value.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpError) {
          throw signUpError;
        }

        setConfirmation(true);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      setError(null);
    } catch (value: unknown) {
      const message = value instanceof Error ? value.message : "Something went wrong.";

      if (message.includes("Invalid login credentials")) {
        setError("Wrong email or password.");
      } else if (message.includes("already registered")) {
        setError("That email already has an account. Try signing in.");
      } else if (message.includes("Password should be at least")) {
        setError("Password must be at least 6 characters.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (confirmation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a confirmation link to {email.trim()}. Open it, then come back and sign in.
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              setConfirmation(false);
              setMode("signin");
            }}
          >
            <Text style={styles.secondaryButtonText}>Back to sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (resetSent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a password reset link to {email.trim()}. Open it to set a new password, then come back and sign in.
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              setResetSent(false);
              setMode("signin");
            }}
          >
            <Text style={styles.secondaryButtonText}>Back to sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          >
            <View style={styles.container}>
              <View style={styles.header}>
                <Text style={styles.brand}>SaveSpace</Text>
                <Text style={styles.subtitle}>Your saved content, turned into a personal podcast.</Text>
              </View>

              <View style={styles.switcher}>
                <Pressable
                  style={[styles.switchButton, mode === "signin" && styles.switchButtonActive]}
                  onPress={() => {
                    setMode("signin");
                    setError(null);
                  }}
                >
                  <Text style={[styles.switchText, mode === "signin" && styles.switchTextActive]}>
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.switchButton, mode === "signup" && styles.switchButtonActive]}
                  onPress={() => {
                    setMode("signup");
                    setError(null);
                  }}
                >
                  <Text style={[styles.switchText, mode === "signup" && styles.switchTextActive]}>
                    Sign Up
                  </Text>
                </Pressable>
              </View>

              {mode === "reset" ? (
                <View style={styles.card}>
                  <Text style={styles.resetHint}>
                    Enter your email and we'll send you a link to reset your password.
                  </Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="Email address"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                  />
                  {error ? <Text style={styles.error}>{error}</Text> : null}
                  <Pressable
                    style={[styles.primaryButton, (!email.trim() || loading) && styles.buttonDisabled]}
                    disabled={!email.trim() || loading}
                    onPress={handleReset}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send reset link</Text>
                    )}
                  </Pressable>
                  <Pressable onPress={() => { setMode("signin"); setError(null); }}>
                    <Text style={styles.forgotText}>Back to sign in</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.card}>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="Email address"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                  />
                  <TextInput
                    autoCapitalize="none"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="Password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                  />

                  {error ? <Text style={styles.error}>{error}</Text> : null}

                  <Pressable
                    style={[
                      styles.primaryButton,
                      (!email.trim() || !password.trim() || loading) && styles.buttonDisabled,
                    ]}
                    disabled={!email.trim() || !password.trim() || loading}
                    onPress={handleSubmit}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {mode === "signup" ? "Create Account" : "Sign In"}
                      </Text>
                    )}
                  </Pressable>

                  {mode === "signin" && (
                    <Pressable onPress={() => { setMode("reset"); setError(null); }}>
                      <Text style={styles.forgotText}>Forgot password?</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 20,
  },
  header: {
    gap: 8,
  },
  brand: {
    fontSize: 34,
    fontWeight: "700",
    color: colors.text,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  switcher: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 4,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  switchButtonActive: {
    backgroundColor: colors.card,
  },
  switchText: {
    color: colors.muted,
    fontWeight: "600",
  },
  switchTextActive: {
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 12,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resetHint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  forgotText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
