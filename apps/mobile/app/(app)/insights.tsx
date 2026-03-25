import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { LoadingScreen } from "@/src/components/loading-screen";
import { Screen } from "@/src/components/screen";
import { statsApi, type InsightsData } from "@/src/lib/api";
import { colors } from "@/src/lib/theme";
import { useUser } from "@/src/lib/useUser";

export default function InsightsScreen() {
  const { userId } = useUser();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      return;
    }

    statsApi
      .getInsights(userId)
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <LoadingScreen label="Loading your insights..." />;
  }

  return (
    <Screen>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>Your Insights</Text>
        <Text style={styles.subtitle}>
          I kept this first pass focused on the real data and a simple native layout. Charts are a
          good next migration step after the route structure is stable.
        </Text>
      </View>

      {!insights?.has_data ? (
        <View style={styles.card}>
          <Text style={styles.empty}>No insight data yet. Save a few videos and let them process.</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Theme distribution</Text>
            {insights.distribution.map((item) => (
              <View key={item.theme_id} style={styles.row}>
                <Text style={styles.rowLabel}>{item.name}</Text>
                <Text style={styles.rowValue}>{item.value}%</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Key insights</Text>
            {insights.insights.map((item, index) => (
              <View key={`${item.title}-${index}`} style={styles.insightCard}>
                <Text style={styles.insightTitle}>{item.title}</Text>
                <Text style={styles.insightChange}>{item.change}</Text>
                <Text style={styles.insightBody}>{item.description}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: colors.primary,
    fontWeight: "600",
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  empty: {
    color: colors.muted,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLabel: {
    color: colors.text,
  },
  rowValue: {
    color: colors.primary,
    fontWeight: "700",
  },
  insightCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  insightTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  insightChange: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  insightBody: {
    color: colors.muted,
    lineHeight: 20,
  },
});
