import * as React from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  Modal,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { apiFetch } from "../lib/api";

import { useAuth } from "../context/AuthContext";

type RootNavParamList = {
  Tabs: undefined | { screen?: string; params?: { topSchools?: any } };
  [key: string]: object | undefined;
};

interface SelectFieldProps {
  label: string;
  value?: string | null;
  options?: string[];
  onChange: (v: string) => void;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  options,
  onChange,
}) => {
  const [modalVisible, setModalVisible] = React.useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.select}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.selectText}>{value || "Select..."}</Text>
      </TouchableOpacity>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options || []}
              keyExtractor={(item, idx) => `${item}-${idx}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    onChange(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const MajorSelectField: React.FC<SelectFieldProps> = ({
  label = "Major",
  value,
  options,
  onChange,
}) => {
  const [modalVisible, setModalVisible] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");

  const filtered = React.useMemo(() => {
    const list = options || [];
    if (!searchText.trim()) return list;
    const q = searchText.trim().toLowerCase();
    return list.filter((x) => String(x).toLowerCase().includes(q));
  }, [options, searchText]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.select}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.selectText}>{value || "Select..."}</Text>
      </TouchableOpacity>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{label}</Text>

            <TextInput
              style={styles.input}
              placeholder="Search majors..."
              value={searchText}
              onChangeText={setSearchText}
              autoCorrect={false}
              autoCapitalize="none"
            />

            <FlatList
              data={filtered}
              keyExtractor={(item, idx) => `${item}-${idx}`}
              keyboardShouldPersistTaps="always"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    onChange(item);
                    setSearchText("");
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => {
                setSearchText("");
                setModalVisible(false);
              }}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default function ProfileIntake() {
  const navigation = useNavigation<NavigationProp<RootNavParamList>>();
  const { me } = useAuth();

  const [budget, setBudget] = React.useState<number>(0);
  const [budgetText, setBudgetText] = React.useState<string>("");

  const [gpa, setGpa] = React.useState<number>(0);
  const [gpaText, setGpaText] = React.useState<string>("");

  const [country, setCountry] = React.useState<string | null>(null);
  const [applyYear, setApplyYear] = React.useState<string>("2026");
  const [gradDate, setGradDate] = React.useState<string>("");
  const [isPrivate, setIsPrivate] = React.useState<boolean | null>(null);
  const [stateLocation, setStateLocation] = React.useState<string | null>(null);
  const [major, setMajor] = React.useState<string>("");
  const [capstone, setCapstone] = React.useState<boolean>(false);
  const [timeType, setTimeType] = React.useState<string>("Full-time");
  const [format, setFormat] = React.useState<string>("In person");
  const [gre, setGre] = React.useState<boolean>(false);

  const countries = [
    "United States",
    "Canada",
    "United Kingdom",
    "Australia",
    "Other",
  ];
  const years = ["2025", "2026", "2027", "2028"];
  const states = ["CA", "NY", "TX", "WA", "Other"];
  const privateOptions = ["Private", "Public"];
  const timeOptions = ["Full-time", "Part-time"];
  const formatOptions = ["In person", "Hybrid", "Online"];
  const majorOptions = ["Math", "English", "Computer Science"];

  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const loadPrefs = async () => {
      try {
        if (!me?.authenticated) return;

        for (const path of ["/api/preferences"]) {
          try {
            const res = await apiFetch(path);
            if (!res.ok) continue;
            const prefs = await res.json();
            if (!prefs || !mounted) continue;

            const raw = prefs?.preference || prefs?.data || prefs || {};

            if (raw.budget !== undefined && raw.budget !== null) {
              setBudget(raw.budget);
              setBudgetText(String(raw.budget));
            }
            if (raw.schoolYear) setApplyYear(raw.schoolYear);
            if (raw.expectedGrad) setGradDate(raw.expectedGrad);
            if (raw.schoolType) {
              setIsPrivate(
                raw.schoolType === "PRIVATE"
                  ? true
                  : raw.schoolType === "PUBLIC"
                    ? false
                    : null,
              );
            }
            if (raw.state) setStateLocation(raw.state);
            if (raw.programType) setMajor(raw.programType);
            if (raw.major) setMajor(raw.major);

            if (
              raw.requirementType !== undefined &&
              raw.requirementType !== null
            ) {
              const rt = String(raw.requirementType).toUpperCase();
              setCapstone(rt === "CAPSTONE");
            }

            if (raw.enrollmentType)
              setTimeType(
                raw.enrollmentType === "FULL_TIME" ? "Full-time" : "Part-time",
              );

            if (raw.modality)
              setFormat(
                raw.modality === "IN_PERSON"
                  ? "In person"
                  : raw.modality === "HYBRID"
                    ? "Hybrid"
                    : "Online",
              );

            if (raw.gpa !== undefined && raw.gpa !== null) {
              setGpa(raw.gpa);
              setGpaText(String(raw.gpa));
            }
            if (raw.targetCountry) setCountry(raw.targetCountry);
            break;
          } catch (e) {
            continue;
          }
        }
      } catch (e) {}
    };
    loadPrefs();
    return () => {
      mounted = false;
    };
  }, [me]);

  // expectedGrad and state are NOT NULL in student_preferences.
  function validationError(): string | null {
    const grad = gradDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(grad) || Number.isNaN(Date.parse(grad))) {
      return "Enter your expected graduation date as YYYY-MM-DD.";
    }
    if (!stateLocation) return "Choose a location state.";
    return null;
  }

  async function handleSubmit() {
    const invalid = validationError();
    if (invalid) {
      setFormError(invalid);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const parsedBudget = parseFloat(budgetText);
      const parsedGpa = parseFloat(gpaText);
      const finalBudget = Number.isFinite(parsedBudget) ? parsedBudget : 0;
      const finalGpa = Number.isFinite(parsedGpa) ? parsedGpa : 0;

      const prefPayload: any = {
        budget: finalBudget,
        schoolYear: applyYear || null,
        expectedGrad: gradDate.trim(),
        schoolType:
          isPrivate == null ? "BOTH" : isPrivate ? "PRIVATE" : "PUBLIC",
        state: stateLocation || null,
        programType: major || null,
        targetCountry: country || null,
        major: major || null,
        enrollmentType: timeType === "Full-time" ? "FULL_TIME" : "PART_TIME",
        modality:
          format === "In person"
            ? "IN_PERSON"
            : format === "Hybrid"
              ? "HYBRID"
              : "ONLINE",
        gpa: finalGpa,
        requirementType: capstone ? "CAPSTONE" : "NEITHER",
      };

      const saveRes = await apiFetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefPayload),
      });

      if (!saveRes.ok) {
        setFormError("We couldn't save your preferences. Please try again.");
        return;
      }
      let savedPrefs = null;
      try {
        savedPrefs = await saveRes.json().catch(() => null);
      } catch {}
      const effective = savedPrefs || prefPayload;

      if (effective.budget !== undefined && effective.budget !== null) {
        setBudget(effective.budget);
        setBudgetText(String(effective.budget));
      }
      if (effective.schoolYear) setApplyYear(effective.schoolYear);
      if (effective.expectedGrad) setGradDate(effective.expectedGrad);
      if (effective.schoolType) {
        setIsPrivate(
          effective.schoolType === "PRIVATE"
            ? true
            : effective.schoolType === "PUBLIC"
              ? false
              : null,
        );
      }
      if (effective.state) setStateLocation(effective.state);
      if (effective.programType) setMajor(effective.programType);
      if (effective.major) setMajor(effective.major);

      if (
        effective.requirementType !== undefined &&
        effective.requirementType !== null
      ) {
        const rt = String(effective.requirementType).toUpperCase();
        setCapstone(rt === "CAPSTONE");
      }

      if (effective.enrollmentType)
        setTimeType(
          effective.enrollmentType === "FULL_TIME" ? "Full-time" : "Part-time",
        );

      if (effective.modality)
        setFormat(
          effective.modality === "IN_PERSON"
            ? "In person"
            : effective.modality === "HYBRID"
              ? "Hybrid"
              : "Online",
        );

      if (effective.gpa !== undefined && effective.gpa !== null) {
        setGpa(effective.gpa);
        setGpaText(String(effective.gpa));
      }
      if (effective.targetCountry) setCountry(effective.targetCountry);

      // Preferences are saved; if the top-5 lookup fails the dashboard fetches it itself.
      let topSchools = null;
      try {
        const topRes = await apiFetch("/api/schools/top5");
        if (topRes.ok) topSchools = await topRes.json();
      } catch (e) {}

      navigation.navigate("Tabs", {
        screen: "Dashboard",
        params: topSchools ? { topSchools } : undefined,
      });
    } catch (err) {
      setFormError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Profile Intake</Text>
          <Text style={styles.subtitle}>
            Tell us about your application preferences
          </Text>

          <SelectField
            label="Target Country"
            value={country}
            options={countries}
            onChange={setCountry}
          />

          <View style={styles.field}>
            <Text style={styles.label}>Budget (USD)</Text>
            <TextInput
              accessibilityLabel="Budget (USD)"
              style={styles.input}
              keyboardType="numeric"
              value={budgetText}
              onChangeText={setBudgetText}
              onBlur={() => {
                const n = parseFloat(budgetText);
                const final = Number.isFinite(n) ? n : 0;
                setBudget(final);
                setBudgetText(String(final));
              }}
            />
          </View>

          <SelectField
            label="School Year to Apply"
            value={applyYear}
            options={years}
            onChange={setApplyYear}
          />

          <View style={styles.field}>
            <Text style={styles.label}>Expected Graduation Date (required)</Text>
            <TextInput
              accessibilityLabel="Expected Graduation Date"
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={gradDate}
              onChangeText={setGradDate}
            />
          </View>

          <SelectField
            label="Private or Public"
            value={
              isPrivate ? "Private" : isPrivate === false ? "Public" : null
            }
            options={privateOptions}
            onChange={(v) => setIsPrivate(v === "Private")}
          />

          <SelectField
            label="Location State (required)"
            value={stateLocation}
            options={states}
            onChange={setStateLocation}
          />

          <MajorSelectField
            value={major}
            options={majorOptions}
            onChange={setMajor}
            label={""}
          />

          <View style={styles.inlineField}>
            <Text style={styles.label}>Capstone Required?</Text>
            <Switch value={capstone} onValueChange={setCapstone} />
          </View>

          <SelectField
            label="Full-time or Part-time"
            value={timeType}
            options={timeOptions}
            onChange={setTimeType}
          />

          <SelectField
            label="Program Format"
            value={format}
            options={formatOptions}
            onChange={setFormat}
          />

          <View style={styles.field}>
            <Text style={styles.label}>GPA (e.g., 3.5)</Text>
            <TextInput
              accessibilityLabel="GPA"
              style={styles.input}
              keyboardType="decimal-pad"
              value={gpaText}
              onChangeText={setGpaText}
              onBlur={() => {
                const n = parseFloat(gpaText);
                const final = Number.isFinite(n) ? n : 0;
                setGpa(final);
                setGpaText(String(final));
              }}
            />
          </View>

          {formError ? (
            <Text style={styles.errorText} accessibilityRole="alert">
              {formError}
            </Text>
          ) : null}

          <Pressable
            style={styles.button}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>
              {submitting ? "Searching…" : "Save profile"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#555555",
    marginBottom: 12,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: "#000000",
  },
  button: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  errorText: {
    color: "#B00020",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  select: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  selectText: { color: "#111827" },
  inlineField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "90%",
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalItemText: { fontSize: 15 },
  modalClose: { marginTop: 8, alignSelf: "flex-end" },
  modalCloseText: { color: "#007AFF", fontWeight: "700" },
});
