import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import FirebaseService from "../services/FirebaseService";
import { GoogleService } from "../services/GoogleService";
import AppInput from "./(components)/AppInput";

// Only import DateTimePicker on native — web uses <input>
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'General',  label: 'General',  color: '#FF8787', icon: 'apps-outline' },
  { id: 'Home',     label: 'Home',     color: '#9BD8EC', icon: 'home-outline' },
  { id: 'Work',     label: 'Work',     color: '#FFF7B2', icon: 'briefcase-outline' },
  { id: 'Personal', label: 'Personal', color: '#C5EBAA', icon: 'person-outline' },
];

// ─── DATE / TIME FIELD ───────────────────────────────────────────────────────
//
// THE iOS FIX:
// display="spinner" fires onChange on every wheel tick. Calling the parent's
// setter each tick re-renders the parent → re-renders DateTimeField → resets
// the picker mid-spin. Fix: write ticks to local `draft` state only; the
// parent state updates only when the user presses Done.
//
// Android: native system dialog, no wrapper Modal needed.
// Web:     <input type="date|time">, no native dependency.

function DateTimeField({
  label,
  value,
  mode,
  onChange,
  style,
}: {
  label: string;
  value: Date;
  mode: 'date' | 'time';
  onChange: (d: Date) => void;
  style?: any;
}) {
  const [open, setOpen] = useState(false);
  // draft absorbs every spinner tick without touching parent
  const [draft, setDraft] = useState<Date>(value);

  const openSheet = () => {
    setDraft(value); // seed draft from latest committed value
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(true);
  };

  const commit = () => {
    onChange(draft); // single parent update on Done
    setOpen(false);
  };

  const displayValue =
    mode === 'date'
      ? value.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ── WEB ────────────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    const iso =
      mode === 'date'
        ? value.toISOString().split('T')[0]
        : `${String(value.getHours()).padStart(2,'0')}:${String(value.getMinutes()).padStart(2,'0')}`;
    return (
      <View style={[dtStyles.wrapper, style]}>
        <Text style={dtStyles.label}>{label}</Text>
        {/* @ts-ignore */}
        <input
          type={mode}
          value={iso}
          onChange={(e: any) => {
            const raw = e.target.value; if (!raw) return;
            if (mode === 'date') {
              const [y,m,d] = raw.split('-').map(Number);
              const next = new Date(value); next.setFullYear(y, m-1, d); onChange(next);
            } else {
              const [h,min] = raw.split(':').map(Number);
              const next = new Date(value); next.setHours(h, min, 0, 0); onChange(next);
            }
          }}
          style={{ fontSize:16, fontWeight:'600', color:'#3A3A3A', border:'none', outline:'none', backgroundColor:'transparent', cursor:'pointer', padding:0 }}
        />
      </View>
    );
  }

  // ── ANDROID ────────────────────────────────────────────────────────────────
  if (Platform.OS === 'android') {
    return (
      <Pressable style={[dtStyles.wrapper, style]} onPress={openSheet}>
        <Text style={dtStyles.label}>{label}</Text>
        <Text style={dtStyles.value}>{displayValue}</Text>
        {open && (
          <DateTimePicker
            value={value}
            mode={mode}
            display="default"
            onChange={(_: any, selected?: Date) => {
              setOpen(false);
              if (selected) onChange(selected);
            }}
          />
        )}
      </Pressable>
    );
  }

  // ── iOS ────────────────────────────────────────────────────────────────────
  return (
    <>
      <Pressable style={[dtStyles.wrapper, style]} onPress={openSheet}>
        <Text style={dtStyles.label}>{label}</Text>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <Text style={dtStyles.value}>{displayValue}</Text>
          <Ionicons name="chevron-forward" size={16} color="#C7C7C7" />
        </View>
      </Pressable>

      <Modal transparent animationType="slide" visible={open}>
        <View style={dtStyles.overlay}>
          <View style={dtStyles.sheet}>
            <View style={dtStyles.sheetHeader}>
              <Pressable onPress={() => setOpen(false)} style={dtStyles.sheetBtn}>
                <Text style={dtStyles.cancelText}>Cancel</Text>
              </Pressable>
              <Text style={dtStyles.sheetTitle}>{mode === 'date' ? 'Select Date' : 'Select Time'}</Text>
              <Pressable onPress={commit} style={dtStyles.sheetBtn}>
                <Text style={dtStyles.doneText}>Done</Text>
              </Pressable>
            </View>
            {/* iOS spinner requires an explicit height — without it the picker renders at 0px */}
            <View style={{ height: 216 }}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display="spinner"
                textColor="#3A3A3A"
                themeVariant="light"
                style={{ flex: 1 }}
                onChange={(_: any, selected?: Date) => { if (selected) setDraft(selected); }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const dtStyles = StyleSheet.create({
  wrapper: {
    backgroundColor:'#FFFFFF', borderRadius:16, marginBottom:12,
    padding:16, elevation:1, shadowColor:'#9BD8EC', shadowOpacity:0.06, shadowRadius:4,
  },
  label: { fontSize:10, fontWeight:'700', color:'#BDBDBD', marginBottom:8, letterSpacing:1 },
  value: { fontSize:16, color:'#3A3A3A', fontWeight:'600' },
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.35)', justifyContent:'flex-end' },
  sheet: { backgroundColor:'#FFF', borderTopLeftRadius:24, borderTopRightRadius:24, paddingBottom:34 },
  sheetHeader: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:20, paddingVertical:14, borderBottomWidth:1, borderBottomColor:'#F0F0F0',
  },
  sheetBtn: { minWidth:60 },
  sheetTitle: { fontSize:15, fontWeight:'600', color:'#3A3A3A' },
  cancelText: { fontSize:15, color:'#9B9B9B' },
  doneText: { fontSize:15, fontWeight:'700', color:'#FF8787', textAlign:'right' },
});

// ─── LOCATION PICKER ─────────────────────────────────────────────────────────

//
// Pass your Google API key via the googleApiKey prop.
// The same key used for Calendar sync works here.

const PLACES_AUTOCOMPLETE = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

function LocationPicker({
  value,
  onChange,
  googleApiKey,
}: {
  value: string;
  onChange: (address: string) => void;
  googleApiKey: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ place_id: string; description: string }[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSheet = () => {
    setQuery(''); setSuggestions([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSheetOpen(true);
  };

  const closeSheet = () => setSheetOpen(false);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (!text.trim()) { setSuggestions([]); return; }
    debounce.current = setTimeout(async () => {
      if (!googleApiKey) return;
      setLoadingSearch(true);
      try {
        const res = await fetch(
          `${PLACES_AUTOCOMPLETE}?input=${encodeURIComponent(text)}&key=${googleApiKey}&language=en`
        );
        const data = await res.json();
        setSuggestions(data.predictions ?? []);
      } catch { setSuggestions([]); }
      finally { setLoadingSearch(false); }
    }, 350);
  };

  const pick = (address: string) => {
    onChange(address);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeSheet();
  };

  const useCurrentLocation = async () => {
    setLoadingGeo(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is needed to use this feature.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      if (geo) {
        const parts = [geo.name, geo.street, geo.city, geo.region, geo.country].filter(Boolean);
        pick(parts.join(', '));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Could not resolve address', 'Location found but address unavailable.');
      }
    } catch { Alert.alert('Error', 'Could not get your location. Please try again.'); }
    finally { setLoadingGeo(false); }
  };

  return (
    <>
      <Pressable style={locStyles.field} onPress={openSheet}>
        <Text style={locStyles.fieldLabel}>LOCATION</Text>
        <View style={locStyles.fieldRow}>
          <Ionicons name="location-outline" size={16} color={value ? '#FF8787' : '#C7C7C7'} />
          <Text style={[locStyles.fieldValue, !value && locStyles.placeholder]} numberOfLines={1}>
            {value || 'Add location'}
          </Text>
          {value
            ? <Pressable onPress={() => onChange('')} hitSlop={8}><Ionicons name="close-circle" size={18} color="#C7C7C7" /></Pressable>
            : <Ionicons name="chevron-forward" size={16} color="#C7C7C7" />
          }
        </View>
      </Pressable>

      <Modal transparent animationType="slide" visible={sheetOpen}>
        <View style={locStyles.overlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeSheet} />
          <View style={locStyles.sheet}>

            <View style={locStyles.sheetHeader}>
              <Text style={locStyles.sheetTitle}>Location</Text>
              <Pressable onPress={closeSheet}><Ionicons name="close" size={22} color="#5C5C5C" /></Pressable>
            </View>

            {/* Search */}
            <View style={locStyles.searchRow}>
              <Ionicons name="search" size={18} color="#9B9B9B" style={{ marginRight:8 }} />
              <TextInput
                style={locStyles.searchInput}
                placeholder="Search for a place..."
                placeholderTextColor="#C7C7C7"
                value={query}
                onChangeText={handleQueryChange}
                autoFocus
                returnKeyType="search"
              />
              {loadingSearch && <ActivityIndicator size="small" color="#FF8787" />}
            </View>

            {/* Current location */}
            <Pressable style={locStyles.currentBtn} onPress={useCurrentLocation} disabled={loadingGeo}>
              {loadingGeo
                ? <ActivityIndicator size="small" color="#FF8787" />
                : <View style={locStyles.currentIcon}><Ionicons name="navigate" size={16} color="#FF8787" /></View>
              }
              <Text style={locStyles.currentBtnText}>
                {loadingGeo ? 'Getting location…' : 'Use Current Location'}
              </Text>
            </Pressable>

            {suggestions.length > 0 && <View style={locStyles.divider} />}

            {/* Suggestions list */}
            {suggestions.length > 0 ? (
              <FlatList
                data={suggestions}
                keyExtractor={item => item.place_id}
                style={locStyles.list}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable style={locStyles.row} onPress={() => pick(item.description)}>
                    <View style={locStyles.rowIcon}>
                      <Ionicons name="location" size={16} color="#FF8787" />
                    </View>
                    <Text style={locStyles.rowText} numberOfLines={2}>{item.description}</Text>
                  </Pressable>
                )}
              />
            ) : query.length > 0 && !loadingSearch ? (
              <Text style={locStyles.noResults}>No results found</Text>
            ) : null}

          </View>
        </View>
      </Modal>
    </>
  );
}

const locStyles = StyleSheet.create({
  field: {
    backgroundColor:'#FFFFFF', borderRadius:16, marginBottom:12,
    padding:16, elevation:1, shadowColor:'#9BD8EC', shadowOpacity:0.06, shadowRadius:4,
  },
  fieldLabel: { fontSize:10, fontWeight:'700', color:'#BDBDBD', marginBottom:8, letterSpacing:1 },
  fieldRow: { flexDirection:'row', alignItems:'center', gap:8 },
  fieldValue: { flex:1, fontSize:16, color:'#3A3A3A', fontWeight:'600' },
  placeholder: { color:'#C7C7C7', fontWeight:'400' },
  overlay: { flex:1, justifyContent:'flex-end', backgroundColor:'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor:'#FFF', borderTopLeftRadius:28, borderTopRightRadius:28, maxHeight:'80%', paddingBottom:34 },
  sheetHeader: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:20, paddingTop:20, paddingBottom:12,
    borderBottomWidth:1, borderBottomColor:'#F5F5F5',
  },
  sheetTitle: { fontSize:17, fontWeight:'700', color:'#3A3A3A' },
  searchRow: {
    flexDirection:'row', alignItems:'center', marginHorizontal:16, marginTop:14, marginBottom:4,
    backgroundColor:'#F5F5F5', borderRadius:14, paddingHorizontal:14, paddingVertical:10,
  },
  searchInput: { flex:1, fontSize:15, color:'#3A3A3A' },
  currentBtn: { flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:20, paddingVertical:14 },
  currentIcon: { width:32, height:32, borderRadius:16, backgroundColor:'#FFF5F0', justifyContent:'center', alignItems:'center' },
  currentBtnText: { fontSize:15, color:'#FF8787', fontWeight:'600' },
  divider: { height:1, backgroundColor:'#F5F5F5', marginHorizontal:16 },
  list: { flexGrow:0 },
  row: { flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:20, paddingVertical:14, borderBottomWidth:1, borderBottomColor:'#F9F9F9' },
  rowIcon: { width:32, height:32, borderRadius:16, backgroundColor:'#FFF5F0', justifyContent:'center', alignItems:'center' },
  rowText: { flex:1, fontSize:14, color:'#3A3A3A', lineHeight:20 },
  noResults: { textAlign:'center', color:'#9B9B9B', padding:24, fontSize:14 },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

const GOOGLE_API_KEY = 'AIzaSyD0ibysS02utELBzMpLBusDCGcuFGw26Lk';

export default function AddEvent() {
  const router = useRouter();
  const { accessToken, googleSyncEnabled } = useAuth();

  const params = useLocalSearchParams<{ id?: string; edit?: string; date?: string }>();
  const isEditMode = params.edit === 'true' && !!params.id;

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const toggleAnim = useRef(new Animated.Value(0)).current;

  const [isReminder, setIsReminder] = useState(false);
  const [title,    setTitle]    = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('General');
  const [isLoading,  setIsLoading]  = useState(false);
  const [isFetching, setIsFetching] = useState(isEditMode);

  const seedDate = params.date ? new Date(params.date + 'T00:00:00') : new Date();
  const [date,         setDate]         = useState(seedDate);
  const [startTime,    setStartTime]    = useState(new Date());
  const [endTime,      setEndTime]      = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [reminderTime, setReminderTime] = useState(new Date());

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue:1, duration:500, useNativeDriver:true }),
      Animated.timing(slideAnim, { toValue:0, duration:500, useNativeDriver:true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(toggleAnim, { toValue: isReminder ? 1 : 0, tension:300, friction:20, useNativeDriver:true }).start();
  }, [isReminder]);

  useEffect(() => {
    if (!isEditMode && endTime <= startTime)
      setEndTime(new Date(startTime.getTime() + 60 * 60 * 1000));
  }, [startTime]);

  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      try {
        const event = await FirebaseService.getEventById(params.id!);
        if (!event) { Alert.alert('Error', 'Event not found.'); router.back(); return; }
        setTitle(event.title);
        setLocation(event.location ?? '');
        setCategory(event.category ?? 'General');
        const s = new Date(event.startTime), e = new Date(event.endTime);
        setDate(s); setStartTime(s); setEndTime(e);
      } catch {
        Alert.alert('Error', 'Could not load event details.'); router.back();
      } finally { setIsFetching(false); }
    })();
  }, []);

  const combineDateAndTime = (base: Date, time: Date) => {
    const d = new Date(base);
    d.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return d;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('🐼 Oops!', 'Please give your event a title!');
      return;
    }
    setIsLoading(true);
    try {
      if (isReminder) {
        await FirebaseService.addReminder({
          title, triggerTime: combineDateAndTime(date, reminderTime),
          isNotified: false, category: category as any,
        });
      } else {
        const finalStart = combineDateAndTime(date, startTime);
        const finalEnd   = combineDateAndTime(date, endTime);
        if (finalEnd <= finalStart) {
          Alert.alert('🐼 Time Trouble!', 'End time must be after start time');
          setIsLoading(false); return;
        }
        if (isEditMode) {
          await FirebaseService.updateEvent(params.id!, {
            title, location: location || 'No Location',
            startTime: finalStart, endTime: finalEnd, category,
          });
        } else {
          const eventId = await FirebaseService.addEvent({
            title, location: location || 'No Location',
            startTime: finalStart, endTime: finalEnd,
            source: 'Manual', category, isSyncedWithGoogle: false,
          });
          if (googleSyncEnabled && accessToken && eventId) {
            try {
              const g = await GoogleService.saveEvent(
                { title, location, startTime: finalStart.toISOString(), endTime: finalEnd.toISOString() },
                accessToken
              );
              if (g.id) await FirebaseService.updateEventSyncStatus(eventId, g.id);
            } catch { console.warn('Google Sync failed, saved locally.'); }
          }
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.error('Save Failed:', err);
      Alert.alert('🐼 Error', 'Could not save. Please try again.');
    } finally { setIsLoading(false); }
  };

  const toggleTranslate = toggleAnim.interpolate({ inputRange:[0,1], outputRange:[0, width * 0.45] });

  if (isFetching) {
    return (
      <LinearGradient colors={['#FFFFFF','#FFFBF5']} style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ActivityIndicator size="large" color="#FF8787" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#FFFFFF','#FFFBF5']} style={styles.container}>
      <Animated.View style={[styles.contentWrapper, { opacity:fadeAnim, transform:[{ translateY:slideAnim }] }]}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#5C5C5C" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Event' : isReminder ? 'New Reminder' : 'New Event'}
          </Text>
          <View style={styles.headerButton} />
        </View>

        {/* Toggle (create only) */}
        {!isEditMode && (
          <View style={styles.toggleContainer}>
            <View style={styles.toggleBackground}>
              <Animated.View style={[styles.toggleThumb, { transform:[{ translateX: toggleTranslate }] }]} />
              <Pressable style={styles.toggleOption} onPress={() => setIsReminder(false)}>
                <Text style={[styles.toggleText, !isReminder && styles.toggleTextActive]}>📅 Event</Text>
              </Pressable>
              <Pressable style={styles.toggleOption} onPress={() => setIsReminder(true)}>
                <Text style={[styles.toggleText, isReminder && styles.toggleTextActive]}>⏰ Reminder</Text>
              </Pressable>
            </View>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Title */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>TITLE</Text>
            <AppInput
              placeholder={isReminder ? 'Remind me to...' : 'Event name'}
              value={title} onChangeText={setTitle} style={styles.input}
            />
          </View>

          {/* Category */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategory(cat.id); }}
                  style={[styles.categoryBadge, category === cat.id && { backgroundColor: cat.color+'40', borderColor: cat.color }]}
                >
                  <Ionicons name={cat.icon as any} size={16} color={category === cat.id ? '#3A3A3A' : '#BDBDBD'} />
                  <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>{cat.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Location — smart picker (events only) */}
          {!isReminder && (
            <View style={styles.padded}>
              <LocationPicker value={location} onChange={setLocation} googleApiKey={GOOGLE_API_KEY} />
            </View>
          )}

          {/* Date */}
          <View style={styles.padded}>
            <DateTimeField label="DATE" value={date} mode="date" onChange={setDate} />
          </View>

          {/* Times */}
          {!isReminder ? (
            <View style={styles.timeRow}>
              <DateTimeField
                label="START" value={startTime} mode="time"
                onChange={d => { setStartTime(d); if (endTime <= d) setEndTime(new Date(d.getTime() + 3600000)); }}
                style={styles.timeField}
              />
              <DateTimeField label="END" value={endTime} mode="time" onChange={setEndTime} style={styles.timeField} />
            </View>
          ) : (
            <View style={styles.padded}>
              <DateTimeField label="REMINDER TIME" value={reminderTime} mode="time" onChange={setReminderTime} />
            </View>
          )}

          {/* Save */}
          <View style={styles.buttonWrapper}>
            {isLoading
              ? <ActivityIndicator size="large" color="#FF8787" />
              : (
                <Pressable style={styles.saveButton} onPress={handleSave}>
                  <LinearGradient colors={['#FF8787','#FF9F9F']} style={styles.saveGradient}>
                    <Text style={styles.saveText}>
                      {isEditMode ? 'Save Changes' : isReminder ? 'Create Reminder' : 'Create Event'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              )
            }
          </View>
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex:1 },
  contentWrapper: { flex:1 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:55, paddingBottom:16 },
  headerButton: { padding:8, borderRadius:20, backgroundColor:'#FFF', width:40, alignItems:'center' },
  headerTitle: { fontSize:18, fontWeight:'700', color:'#3A3A3A' },
  toggleContainer: { paddingHorizontal:20, marginBottom:20 },
  toggleBackground: { flexDirection:'row', backgroundColor:'#F0F0F0', borderRadius:25, padding:4, height:50, width: width * 0.9 },
  toggleThumb: { position:'absolute', width:'48%', height:42, backgroundColor:'#FFF', borderRadius:22, top:4, shadowColor:'#000', shadowOpacity:0.1, shadowRadius:4, elevation:2 },
  toggleOption: { flex:1, alignItems:'center', justifyContent:'center', zIndex:1 },
  toggleText: { fontSize:14, fontWeight:'500', color:'#8E8E93' },
  toggleTextActive: { color:'#FF8787', fontWeight:'700' },
  scrollContent: { paddingBottom:40 },
  card: { backgroundColor:'#FFFFFF', borderRadius:16, marginHorizontal:20, marginBottom:12, padding:16, elevation:1, shadowColor:'#9BD8EC', shadowOpacity:0.06, shadowRadius:4 },
  cardTitle: { fontSize:10, fontWeight:'700', color:'#BDBDBD', marginBottom:8, letterSpacing:1 },
  padded: { paddingHorizontal:20 },
  timeRow: { flexDirection:'row', paddingHorizontal:20, gap:12 },
  timeField: { flex:1, marginHorizontal:0 },
  input: {},
  buttonWrapper: { marginHorizontal:20, marginTop:20 },
  saveButton: { borderRadius:25, overflow:'hidden' },
  saveGradient: { paddingVertical:16, alignItems:'center' },
  saveText: { color:'#FFF', fontSize:16, fontWeight:'700' },
  categoryScroll: { marginTop:8 },
  categoryBadge: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:8, borderRadius:20, borderWidth:1, borderColor:'#F0F0F0', marginRight:10, gap:6, backgroundColor:'#FAFAFA' },
  categoryText: { fontSize:12, color:'#8E8E93', fontWeight:'600' },
  categoryTextActive: { color:'#3A3A3A' },
});