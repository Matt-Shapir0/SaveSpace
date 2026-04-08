import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  clearSharedPayloads,
  getSharedPayloads,
  useIncomingShare,
} from "expo-sharing";

import { colors } from "@/src/lib/theme";
import { videosApi } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { extractSharedUrl } from "@/src/lib/share";
import {
  clearPendingSharedUrl,
  getPendingSharedUrl,
  setPendingSharedUrl,
} from "@/src/lib/storage";

type ShareState = "loading" | "saving" | "done" | "no-url" | "error" | "needs-auth";

export default function ShareScreen() {
  const { resolvedSharedPayloads, isResolving } = useIncomingShare();
  const { user, loading } = useAuth();
  const [state, setState] = useState<ShareState>("loading");
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    if (isResolving || loading || hasSubmittedRef.current) {
      return;
    }

    const sharedUrlCandidate = extractSharedUrl(resolvedSharedPayloads);
    const fallbackPayloads = getSharedPayloads();
    const fallbackUrl = extractSharedUrl(fallbackPayloads);
    const finalUrl = sharedUrlCandidate ?? fallbackUrl;

    setSharedUrl(finalUrl);

    if (!finalUrl) {
      getPendingSharedUrl().then((pendingUrl) => {
        if (!pendingUrl) {
          setState("no-url");
          return;
        }

        setSharedUrl(pendingUrl);

        if (!user) {
          setState("needs-auth");
          return;
        }

        hasSubmittedRef.current = true;
        setState("saving");
        setError(null);

        videosApi
          .submit(pendingUrl, user.id)
          .then(() => {
            setState("done");
            clearSharedPayloads();
            clearPendingSharedUrl();
            setTimeout(() => {
              router.replace("/(app)/(tabs)/saved");
            }, 1200);
          })
          .catch((submissionError) => {
            console.error("Share submission failed", submissionError);
            setError("Couldn't save that post. It may be private, expired, or unsupported.");
            setState("error");
            hasSubmittedRef.current = false;
          });
      });
      return;
    }

    if (!user) {
      setPendingSharedUrl(finalUrl);
      setState("needs-auth");
      return;
    }

    hasSubmittedRef.current = true;
    setState("saving");
    setError(null);

    videosApi
      .submit(finalUrl, user.id)
      .then(() => {
        setState("done");
        clearSharedPayloads();
        clearPendingSharedUrl();
        setTimeout(() => {
          router.replace("/(app)/(tabs)/saved");
        }, 1200);
      })
      .catch((submissionError) => {
        console.error("Share submission failed", submissionError);
        setError("Couldn't save that post. It may be private, expired, or unsupported.");
        setState("error");
        hasSubmittedRef.current = false;
        clearSharedPayloads();
      });
  }, [isResolving, loading, resolvedSharedPayloads, user]);

  return (
    <View style={styles.container}>
      {(state === "loading" || state === "saving") && (
        <>
          <View style={styles.iconCircle}>
            <ActivityIndicator color={colors.primary} />
          </View>
          <Text style={styles.title}>
            {state === "loading" ? "Opening EchoFeed..." : "Saving shared post..."}
          </Text>
          <Text style={styles.subtitle}>
            {sharedUrl ?? "Looking for a TikTok, Reel, or YouTube link from the share sheet."}
          </Text>
        </>
      )}

      {state === "done" && (
        <>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✓</Text>
          </View>
          <Text style={styles.title}>Saved to your library</Text>
          <Text style={styles.subtitle}>We&apos;re sending you to Saved now.</Text>
        </>
      )}

      {state === "needs-auth" && (
        <>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>!</Text>
          </View>
          <Text style={styles.title}>Sign in to save this post</Text>
          <Text style={styles.subtitle}>
            EchoFeed received the shared link, but you need to sign in before we can save it.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace("/auth")}>
            <Text style={styles.primaryButtonText}>Go to sign in</Text>
          </Pressable>
        </>
      )}

      {state === "no-url" && (
        <>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>!</Text>
          </View>
          <Text style={styles.title}>No supported link detected</Text>
          <Text style={styles.subtitle}>
            Share a TikTok, Instagram Reel, or YouTube link directly to EchoFeed.
          </Text>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace("/(app)/(tabs)/saved")}>
            <Text style={styles.secondaryButtonText}>Open Saved</Text>
          </Pressable>
        </>
      )}

      {state === "error" && (
        <>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>!</Text>
          </View>
          <Text style={styles.title}>Couldn&apos;t save that post</Text>
          <Text style={styles.subtitle}>{error}</Text>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace("/(app)/(tabs)/saved")}>
            <Text style={styles.secondaryButtonText}>Open Saved</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    marginBottom: 20,
  },
  iconText: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 320,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
});
