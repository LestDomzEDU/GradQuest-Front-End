import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Linking,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSavedApps } from "../context/SavedAppsContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import API from "../lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PALETTE = {
  blueDark: "#053F7C",
  blue: "#0061A8",
  gold: "#FFC727",
  white: "#FFFFFF",
  textDark: "#001B33",
  subtext: "#4B5563",

  // extra keys used by tutorial styles
  bg: "#FFFFFF",
  primary: "#00A7E1",
  navy: "#003459",
  cardBorder: "#DCE8F2",
  danger: "#B00020",
};

const TUTORIAL_KEY = "tutorial:completed";
const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.72 

function CoachBubble({ title, body, arrowLeftPct }) {
  return (
    <View style={cm.wrap} pointerEvents="box-none">
      <View style={[cm.bubble, { maxWidth: "92%" }]}>
        <Text style={cm.title}>{title}</Text>
        <Text style={cm.body}>{body}</Text>
      </View>
      <View style={cm.arrowWrap}>
        <View style={[cm.arrow, { left: `${arrowLeftPct}%` }]} />
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // models / preferences UI
  const [modelsModalVisible, setModelsModalVisible] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState(null);

  // saved apps context
  // saved apps context
  const { savedApps, addSavedApp, removeSavedApp } = useSavedApps();

  // Auth + preference-based recommendations
  const { me, refresh } = useAuth();

  // Any top schools passed in via navigation (e.g., after saving preferences)
  const routeTopSchools = route?.params?.topSchools ?? null;

  // Local state for the recommendations shown on the dashboard
  const [topSchools, setTopSchools] = useState(
    Array.isArray(routeTopSchools) ? routeTopSchools : []
  );
  const [loadingTop, setLoadingTop] = useState(false);

  // Keep local state in sync when we navigate here with fresh results
  useEffect(() => {
    if (Array.isArray(routeTopSchools) && routeTopSchools.length > 0) {
      setTopSchools(routeTopSchools);
    }
  }, [routeTopSchools]);

  // On first load after authentication, fetch the user's top 5 schools
  // using the preferences already saved from Profile Intake.
  useEffect(() => {
    let cancelled = false;

    const fetchTopSchools = async () => {
      // If we already have results from navigation, don't refetch.
      if (Array.isArray(routeTopSchools) && routeTopSchools.length > 0) {
        return;
      }

      try {
        setLoadingTop(true);

        let currentMe = me;
        // Make sure we have an up-to-date user object
        if (
          (!currentMe ||
            !currentMe.authenticated ||
            (!currentMe.userId && !currentMe.id)) &&
          typeof refresh === "function"
        ) {
          try {
            currentMe = await refresh();
          } catch (e) {
            console.warn("Dashboard: failed to refresh auth", e);
          }
        }

        const userId = currentMe?.userId || currentMe?.id;
        if (!userId) {
          return;
        }

        const url = `${API.BASE}/api/schools/top5?userId=${userId}`;
        const res = await fetch(url, { credentials: "include" });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.warn(
            "Dashboard: failed to fetch top schools",
            res.status,
            text
          );
          return;
        }

        const json = await res.json();
        if (!cancelled && Array.isArray(json) && json.length > 0) {
          setTopSchools(json);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Dashboard: error fetching top schools", err);
        }
      } finally {
        if (!cancelled) {
          setLoadingTop(false);
        }
      }
    };

    fetchTopSchools();

    return () => {
      cancelled = true;
    };
  }, [me, refresh, routeTopSchools]);

  // Prefer top schools from profile preferences; fall back to saved apps
  const dataToShow =
    Array.isArray(topSchools) && topSchools.length > 0
      ? topSchools
      : savedApps || [];

  const openUrl = (url) =>
    url && Linking.openURL(url).catch(() => {});

  // ===== Tutorial gating =====

  const [tutorialDone, setTutorialDone] = useState(false);
  const [showTutorial, setShowTutorial] = useState(
    route?.params?.showTutorial === true
  );
  const [step, setStep] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(TUTORIAL_KEY);
        const completed = v === "1";
        setTutorialDone(completed);
        if (completed) setShowTutorial(false);
      } catch {
        // ignore
      }
    })();
  }, []);

  // Positions correspond to approximate centers for 4 tabs
  const bubbles = useMemo(
    () => [
      {
        title: "Dashboard",
        body: "Your home base for shortcuts and saved schools.",
        leftPct: 12,
      },
      {
        title: "Saved",
        body: "Quick access to the schools you’re tracking.",
        leftPct: 39,
      },
      {
        title: "Reminders",
        body: "Deadlines & financial aid reminders live here.",
        leftPct: 64,
      },
      {
        title: "Settings",
        body: "Tune your preferences to personalize results.",
        leftPct: 88,
      },
    ],
    []
  );

  const onNext = () => {
    if (step < bubbles.length - 1) {
      setStep((s) => s + 1);
    } else {
      setShowTutorial(false);
      navigation.navigate("Settings", { tutorialMode: true });
    }
  };

  const keyForItem = useCallback(
    (item, idx) =>
      String(item?.id ?? item?.schoolId ?? item?.name ?? idx),
    []
  );

  const renderEmpty = () => (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>Your dashboard</Text>
      <Text style={s.emptySub}>
        Save colleges to see them here, set reminders, and keep everything
        organized.
      </Text>
    </View>
  );

  // functio to create reminder in database when saving a school
  const createReminder = async (schoolId) => {
    try {
      let currentMe = me;
      if (!currentMe || !currentMe.authenticated || (!currentMe.userId && !currentMe.id)) {
        if (typeof refresh === "function") {
          currentMe = await refresh();
        }
      }

      const userId = currentMe?.userId || currentMe?.id;
      if (!userId) {
        console.warn("Cannot create reminder: user not authenticated");
        return;
      }

      const url = `${API.BASE}/api/reminders?userId=${userId}&schoolId=${schoolId}`;
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn("Failed to create reminder:", res.status, text);
      }
    } catch (err) {
      console.warn("Error creating reminder:", err);
    }
  };

  // delete reminder from database when removing a school
  const deleteReminder = async (schoolId) => {
    try {
      let currentMe = me;
      if (!currentMe || !currentMe.authenticated || (!currentMe.userId && !currentMe.id)) {
        if (typeof refresh === "function") {
          currentMe = await refresh();
        }
      }

      const userId = currentMe?.userId || currentMe?.id;
      if (!userId) {
        console.warn("Cannot delete reminder: user not authenticated");
        return;
      }

      const url = `${API.BASE}/api/reminders/school/${schoolId}?userId=${userId}`;
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn("Failed to delete reminder:", res.status, text);
      }
    } catch (err) {
      console.warn("Error deleting reminder:", err);
    }
  };

  const renderItem = ({ item }) => {
    const id = item.id ?? item.schoolId ?? item.name;
    const saved = savedApps.find((a) => a.id === id);

    const name =
      item.name ?? item.schoolName ?? item.programName ?? "Untitled";
    const program =
      item.programName ??
      item.program ??
      item.programType ??
      "Program info";
    const website =
      item.websiteUrl ?? item.website ?? item.link ?? null;

    return (
      <View style={s.card}>
        <Text style={s.cardTitle}>{name}</Text>
        <Text style={s.cardSub}>{program}</Text>

        <View style={s.cardActions}>
          {website ? (
            <Pressable
              onPress={() => openUrl(website)}
              style={s.primaryBtn}
            >
              <Text style={s.primaryBtnText}>Visit</Text>
            </Pressable>
          ) : (
            <Text style={[s.cardSub, { opacity: 0.7 }]}>
              No website
            </Text>
          )}

          <TouchableOpacity
            onPress={async () => {
              if (saved) {
                // Remove from local state
                removeSavedApp(id);
                // Delete reminder from database
                await deleteReminder(id);
              } else {
                // Add to local state
                addSavedApp({
                  id,
                  name,
                  company: program,
                  // urgent: !!item.urgent,
                  urgent: false, 
                  link: website,
                });
                // Create reminder in database
                await createReminder(id);
              }
            }}
            style={saved ? s.removeBtn : s.saveBtn}
          >
            <Text style={saved ? s.removeBtnText : s.saveBtnText}>
              {saved ? "Remove" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.screen}>
      {/* HEADER */}
      <View style={s.header}>
        <View style={{ width: 40 }} />
        <Text style={s.headerTitle}>Dashboard</Text>
        <Image
          source={require("../../assets/gradquest_logo.png")}
          style={s.logo}
        />
      </View>

      <View style={s.headerAccent} />

      {/* MAIN LIST */}
      {/* <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        data={dataToShow}
        keyExtractor={keyForItem}
        ListEmptyComponent={renderEmpty}
        renderItem={renderItem}
      /> */}
      <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 80 }}
      >

      {/* SECTION TITLE */}
      <View style={{ marginTop: 20 }}>
        <Text style={s.sectionTitle}>Top 5 Recommended</Text>
        
        {dataToShow.length === 0 ? (
          renderEmpty()
        ) : (
        <FlatList
        data={dataToShow}
        // horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyForItem}
        contentContainerStyle={{ paddingLeft: 16 }}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        renderItem={({ item }) => {
          const id = item.id ?? item.schoolId ?? item.name;
          const saved = savedApps.find((a) => a.id === id);
          const name = item.name ?? item.schoolName ?? item.programName ?? "Untitled";
          const program = item.programName ?? item.program ?? item.programType ?? "Program info";
          const website = item.websiteUrl ?? item.website ?? item.link ?? null;

          return (
            <View style={s.sliderCard}>
              <Image
                source={require("../../assets/placeholder_college.png")}
                style={s.sliderImage}
              />

              <Text style={s.cardTitle}>{name}</Text>
              <Text style={s.cardSub}>{program}</Text>

              <View style={s.cardActions}>
                {website && (
                  <Pressable
                    onPress={() => openUrl(website)}
                    style={s.primaryBtn}
                  >
                    <Text style={s.primaryBtnText}>Visit</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() =>
                    saved
                      ? removeSavedApp(id)
                      : addSavedApp({
                          id,
                          name,
                          company: program,
                          urgent: false,
                          link: website,
                        })
                  }
                  style={saved ? s.removeBtn : s.saveBtn}
                >
                  <Text style={saved ? s.removeBtnText : s.saveBtnText}>
                    {saved ? "Remove" : "Save"}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    )}
  </View>

  {/* Future sections go here */}
  <View style={{ height: 40 }} />
  </ScrollView>

      {/* Models Modal (kept for future use) */}
      <Modal
        visible={modelsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModelsModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Models</Text>

            <Text style={{ marginBottom: 8, color: "#374151" }}>
              {selectedCollege
                ? `${
                    selectedCollege.name ??
                    selectedCollege.schoolName ??
                    ""
                  } — ${
                    selectedCollege.programName ??
                    selectedCollege.program ??
                    ""
                  }`
                : ""}
            </Text>

            <FlatList
              data={[]}
              keyExtractor={(item) => String(item)}
              renderItem={({ item }) => (
                <Pressable
                  style={s.modelItem}
                  onPress={() => setModelsModalVisible(false)}
                >
                  <Text style={s.modelText}>{item}</Text>
                </Pressable>
              )}
            />

            <TouchableOpacity
              style={s.closeButton}
              onPress={() => setModelsModalVisible(false)}
            >
              <Text style={s.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Tutorial overlay */}
      <Modal
        visible={showTutorial && !tutorialDone}
        transparent
        animationType="fade"
      >
        <View style={s.modalOverlay}>
          <View style={s.bubbleContainer} pointerEvents="none">
            <CoachBubble
              title={bubbles[step].title}
              body={bubbles[step].body}
              arrowLeftPct={bubbles[step].leftPct}
            />
          </View>

          <View style={s.nextContainer}>
            <Pressable style={s.nextBtn} onPress={onNext}>
              <Text style={s.nextText}>
                {step < bubbles.length - 1
                  ? "Continue"
                  : "Go to Settings"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PALETTE.white },

  header: {
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: PALETTE.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerAccent: {
    height: 4,
    backgroundColor: PALETTE.gold,
    width: "100%",
  },
  logo: {
    width: 52,
    height: 52,
    resizeMode: "contain",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: PALETTE.blueDark,
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: PALETTE.textDark,
  },
  emptySub: {
    marginTop: 8,
    fontSize: 16,
    color: PALETTE.subtext,
    textAlign: "center",
  },

  card: {
    backgroundColor: PALETTE.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCE8F2",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  cardSub: {
    color: PALETTE.subtext,
    marginTop: 3,
  },
  cardActions: {
    flexDirection: "row",
    marginTop: 12,
    alignItems: "center",
    columnGap: 10,
  },

  primaryBtn: {
    backgroundColor: PALETTE.blue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: PALETTE.white,
    fontWeight: "700",
  },

  saveBtn: {
    backgroundColor: "#E6F8FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    color: PALETTE.blueDark,
    fontWeight: "700",
  },
  removeBtn: {
    backgroundColor: "#FFF5F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  removeBtnText: {
    color: "#B00020",
    fontWeight: "700",
  },

  // Shared overlay for both models modal and tutorial modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  bubbleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 72,
    alignItems: "center",
  },
  nextContainer: { padding: 16, paddingBottom: 24 },
  nextBtn: {
    backgroundColor: PALETTE.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  nextText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },

  modalContent: {
    width: "90%",
    maxHeight: "70%",
    alignSelf: "center",
    marginBottom: 40,
    backgroundColor: PALETTE.white,
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  modelItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  modelText: {
    fontSize: 16,
  },
  closeButton: {
    marginTop: 12,
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  closeButtonText: {
    color: PALETTE.white,
    fontWeight: "600",
  },
  sectionTitle: {
  fontSize: 20,
  fontWeight: "800",
  marginBottom: 12,
  marginLeft: 16,
  color: PALETTE.blueDark,
  },
  sliderCard: {
  // width: CARD_WIDTH,
  width: "100%",
  backgroundColor: PALETTE.white,
  padding: 16,
  borderRadius: 18,
  marginBottom: 16,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 10,
  elevation: 4,
  },
sliderImage: {
  width: "100%",
  height: 140,
  borderRadius: 14,
  marginBottom: 10,
  resizeMode: "cover",
  },
});

// ===== Coachmark bubble styles =====
const cm = StyleSheet.create({
  wrap: { width: "100%", alignItems: "center" },
  bubble: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: PALETTE.textDark,
    marginBottom: 4,
  },
  body: { fontSize: 14, color: PALETTE.subtext },
  arrowWrap: { width: "100%", height: 0, position: "relative" },
  arrow: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
    bottom: -10,
  },
});
