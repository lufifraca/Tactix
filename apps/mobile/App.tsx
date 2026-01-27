import "react-native-gesture-handler";
import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, Text, View, Pressable, ScrollView, TextInput, Alert } from "react-native";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const API_BASE =
  (Constants.expoConfig?.extra as any)?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://localhost:3001";

async function apiGet<T>(path: string, token: string | null) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

async function apiPost<T>(path: string, token: string | null, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

function Button({ title, onPress, variant }: { title: string; onPress: () => void; variant?: "primary" | "secondary" }) {
  const bg = variant === "primary" ? "#FFFFFF" : "transparent";
  const color = variant === "primary" ? "#0B0D10" : "#FFFFFF";
  const border = variant === "primary" ? "transparent" : "#30363d";
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: bg,
        borderColor: border,
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        marginTop: 10,
      }}
    >
      <Text style={{ color, textAlign: "center", fontWeight: "600" }}>{title}</Text>
    </Pressable>
  );
}

async function registerForPush(token: string) {
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    if (req.status !== "granted") return;
  }
  const expoToken = (await Notifications.getExpoPushTokenAsync()).data;
  await apiPost("/push/register", token, { token: expoToken, platform: "android" }); // platform is informational
}

function LoginScreen({ navigation }: any) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync("tx_token").then((t) => {
      if (t) {
        setToken(t);
        navigation.replace("Dashboard");
      }
    });
  }, [navigation]);

  async function signIn(provider: "google" | "discord") {
    const redirectUri = Linking.createURL("auth");
    const authUrl = `${API_BASE}/auth/${provider}/start?redirect=${encodeURIComponent(redirectUri)}`;
    const res = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (res.type === "success" && res.url) {
      const u = new URL(res.url);
      const t = u.searchParams.get("token");
      if (!t) {
        Alert.alert("Sign-in failed", "Missing token.");
        return;
      }
      await SecureStore.setItemAsync("tx_token", t);
      setToken(t);
      await registerForPush(t).catch(() => {});
      navigation.replace("Dashboard");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0D10" }}>
      <View style={{ padding: 18 }}>
        <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>tactix</Text>
        <Text style={{ color: "#b7b7b7", marginTop: 8 }}>
          Sign in to get your daily coach dashboard (CS2 + Marvel Rivals).
        </Text>

        <Button title="Continue with Google" onPress={() => signIn("google")} variant="primary" />
        <Button title="Continue with Discord" onPress={() => signIn("discord")} variant="secondary" />

        <Text style={{ color: "#6b7280", marginTop: 18, fontSize: 12 }}>
          Steam linking happens in Settings (required for CS2 stats).
        </Text>
      </View>
    </SafeAreaView>
  );
}

function DashboardScreen({ navigation }: any) {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load(t: string) {
    setErr(null);
    try {
      const d = await apiGet("/dashboard?mode=ALL", t);
      setData(d);
    } catch (e) {
      setErr("Unable to load dashboard. Make sure the API is reachable and you are signed in.");
    }
  }

  useEffect(() => {
    SecureStore.getItemAsync("tx_token").then((t) => {
      if (!t) {
        navigation.replace("Login");
        return;
      }
      setToken(t);
      load(t);
    });
  }, [navigation]);

  async function refresh() {
    if (!token) return;
    await apiPost("/ingest/refresh", token);
    await load(token);
  }

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0D10" }}>
        <View style={{ padding: 18 }}>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>Dashboard</Text>
          <Text style={{ color: "#b7b7b7", marginTop: 10 }}>{err ?? "Loading..."}</Text>
          <Button title="Go to Settings" onPress={() => navigation.navigate("Settings")} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0D10" }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>Coach Dashboard</Text>
          <Pressable onPress={() => navigation.navigate("Settings")}>
            <Text style={{ color: "#fff", textDecorationLine: "underline" }}>Settings</Text>
          </Pressable>
        </View>

        <Text style={{ color: "#6b7280", marginTop: 6, fontSize: 12 }}>
          {data.subscriptionActive ? "Pro" : "Free"} · last ingest {data.lastIngestAt ? new Date(data.lastIngestAt).toLocaleString() : "—"}
        </Text>

        <Button title="Refresh stats" onPress={refresh} variant="primary" />

        <View style={{ marginTop: 18, borderWidth: 1, borderColor: "#1f2937", borderRadius: 12, padding: 14 }}>
          <Text style={{ color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, fontSize: 12 }}>Daily brief</Text>
          {data.dailyBrief?.bullets?.map((b: string, i: number) => (
            <Text key={i} style={{ color: "#e5e7eb", marginTop: 8, lineHeight: 20 }}>
              • {b}
            </Text>
          ))}
        </View>

        <Text style={{ color: "#9ca3af", marginTop: 18, textTransform: "uppercase", letterSpacing: 1, fontSize: 12 }}>
          Daily quests
        </Text>

        {data.quests?.map((q: any) => {
          const pct = Math.round(((q.progress?.pct ?? 0) as number) * 100);
          const done = q.status === "COMPLETED";
          return (
            <View key={q.id} style={{ marginTop: 10, borderWidth: 1, borderColor: done ? "#fff" : "#1f2937", borderRadius: 12, padding: 14 }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>{q.title}</Text>
              <Text style={{ color: "#b7b7b7", marginTop: 6 }}>{q.description}</Text>
              <Text style={{ color: "#6b7280", marginTop: 8, fontSize: 12 }}>
                {q.domain} · {q.modeEligibility} · {q.game ?? "Any game"}
              </Text>
              <Text style={{ color: "#e5e7eb", marginTop: 8 }}>{done ? "Complete" : `${pct}%`}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsScreen({ navigation }: any) {
  const [token, setToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [mrUser, setMrUser] = useState("");
  const [mrPlatform, setMrPlatform] = useState("pc");
  const [cs2Auth, setCs2Auth] = useState("");

  async function load(t: string) {
    const linked = await apiGet<{ accounts: any[] }>("/me/linked", t);
    setAccounts(linked.accounts);
  }

  useEffect(() => {
    SecureStore.getItemAsync("tx_token").then((t) => {
      if (!t) return navigation.replace("Login");
      setToken(t);
      load(t).catch(() => {});
    });
  }, [navigation]);

  async function linkMarvel() {
    if (!token) return;
    await apiPost("/link/marvel", token, { username: mrUser, platform: mrPlatform, providerPreference: "TRACKER_NETWORK" });
    Alert.alert("Linked", "Marvel Rivals linked via username lookup.");
    await load(token);
  }

  async function saveCs2() {
    if (!token) return;
    await apiPost("/link/cs2", token, { steamGameAuthCode: cs2Auth });
    Alert.alert("Saved", "CS2 code saved.");
  }

  async function logout() {
    await SecureStore.deleteItemAsync("tx_token");
    navigation.replace("Login");
  }

  // Steam linking uses the same web OpenID flow; deep link returns to app but doesn't carry a token.
  // For v1, link Steam from the web app (desktop/mobile web) is the smoothest.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0D10" }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>Settings</Text>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={{ color: "#fff", textDecorationLine: "underline" }}>Back</Text>
          </Pressable>
        </View>

        <Text style={{ color: "#9ca3af", marginTop: 18, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
          Linked accounts
        </Text>
        {accounts.map((a) => (
          <View key={a.id} style={{ marginTop: 10, borderWidth: 1, borderColor: "#1f2937", borderRadius: 12, padding: 14 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>{a.game}</Text>
            <Text style={{ color: "#b7b7b7", marginTop: 6 }}>{a.displayName}</Text>
          </View>
        ))}

        <Text style={{ color: "#9ca3af", marginTop: 18, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
          Link Marvel Rivals
        </Text>
        <View style={{ marginTop: 10 }}>
          <TextInput
            value={mrUser}
            onChangeText={setMrUser}
            placeholder="Username"
            placeholderTextColor="#6b7280"
            style={{ borderColor: "#1f2937", borderWidth: 1, borderRadius: 10, padding: 12, color: "#fff" }}
          />
          <TextInput
            value={mrPlatform}
            onChangeText={setMrPlatform}
            placeholder="Platform (pc/ps/xbox)"
            placeholderTextColor="#6b7280"
            style={{ marginTop: 10, borderColor: "#1f2937", borderWidth: 1, borderRadius: 10, padding: 12, color: "#fff" }}
          />
          <Button title="Link Marvel Rivals" onPress={linkMarvel} variant="primary" />
        </View>

        <Text style={{ color: "#9ca3af", marginTop: 18, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
          CS2 (Steam required)
        </Text>
        <Text style={{ color: "#6b7280", marginTop: 6 }}>
          Steam OpenID linking is best done from the web app in v1. Optional: store CS2 game auth code for future match parsing.
        </Text>
        <TextInput
          value={cs2Auth}
          onChangeText={setCs2Auth}
          placeholder="steamidkey (game auth code)"
          placeholderTextColor="#6b7280"
          style={{ marginTop: 10, borderColor: "#1f2937", borderWidth: 1, borderRadius: 10, padding: 12, color: "#fff" }}
        />
        <Button title="Save CS2 code" onPress={saveCs2} variant="secondary" />

        <Button title="Log out" onPress={logout} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0B0D10" },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
