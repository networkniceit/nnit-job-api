import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { searchJobs } from '../services/jobsApi';

const WORK_TYPES = [
  { value: '', label: 'All' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

const WORK_TYPE_LABELS = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' };

export default function Home({ navigation }) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [workType, setWorkType] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      setJobs(await searchJobs({ query, location, workType }));
    } catch (err) {
      setJobs([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderJob = ({ item }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => navigation.navigate('JobDetailsScreen', { job: item })}
    >
      <Text style={styles.jobTitle}>{item.title}</Text>
      <Text style={styles.company}>{item.company || 'Employer not listed'}</Text>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location" size={14} color="#64748b" />
          <Text style={styles.metaText}>{item.location}</Text>
        </View>
        {!!item.published && (
          <View style={styles.metaItem}>
            <Ionicons name="time" size={14} color="#64748b" />
            <Text style={styles.metaText}>{item.published}</Text>
          </View>
        )}
      </View>
      {!!item.summary && (
        <Text style={styles.summary} numberOfLines={3}>
          {item.summary}
        </Text>
      )}
      <View style={styles.badgeRow}>
        {!!item.work_type && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{WORK_TYPE_LABELS[item.work_type] || item.work_type}</Text>
          </View>
        )}
        {!!item.employment_type && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.employment_type}</Text>
          </View>
        )}
        <View style={[styles.badge, styles.sourceBadge]}>
          <Text style={styles.sourceText}>{item.source_label || item.source}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#6366f1" style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );

  const header = (
    <View>
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.searchHeader}
      >
        <Text style={styles.headerTitle}>Find your next job</Text>
        <Text style={styles.headerSubtitle}>Remote, hybrid and on-site jobs from several sources</Text>
        <TextInput
          style={styles.input}
          placeholder="Job title or keywords"
          placeholderTextColor="#64748b"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={runSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Location (empty = worldwide)"
          placeholderTextColor="#64748b"
          value={location}
          onChangeText={setLocation}
          returnKeyType="search"
          onSubmitEditing={runSearch}
        />
        <View style={styles.chipRow}>
          {WORK_TYPES.map(type => (
            <TouchableOpacity
              key={type.label}
              style={[styles.chip, workType === type.value && styles.chipActive]}
              onPress={() => setWorkType(type.value)}
            >
              <Text style={[styles.chipText, workType === type.value && styles.chipTextActive]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={runSearch} disabled={loading}>
          <Ionicons name="search" size={18} color="#6366f1" />
          <Text style={styles.searchButtonText}>{loading ? 'Searching…' : 'Search jobs'}</Text>
        </TouchableOpacity>
      </LinearGradient>
      {loading && <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {searched && !loading && !error && jobs.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#334155" />
          <Text style={styles.emptyText}>
            No matching listings were found. Try different keywords, clear the location to search
            worldwide, or set the work type to All.
          </Text>
        </View>
      )}
      {!searched && (
        <View style={styles.emptyContainer}>
          <Ionicons name="briefcase-outline" size={64} color="#334155" />
          <Text style={styles.emptyText}>Search for a job title to see listings.</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={(item, index) => `${item.link || item.title}-${index}`}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  listContent: { paddingBottom: 30 },
  searchHeader: { paddingVertical: 20, paddingHorizontal: 15, marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 14 },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 15,
    marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  chipActive: { backgroundColor: '#fff' },
  chipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#6366f1' },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 13,
  },
  searchButtonText: { color: '#6366f1', fontSize: 15, fontWeight: '700' },
  loader: { marginVertical: 24 },
  errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center', marginHorizontal: 20, marginVertical: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 24 },
  emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 16, textAlign: 'center', lineHeight: 20 },
  jobCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  jobTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  company: { fontSize: 13, color: '#94a3b8', marginBottom: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  metaText: { fontSize: 12, color: '#64748b', flexShrink: 1 },
  summary: { fontSize: 13, color: '#cbd5e1', lineHeight: 19, marginBottom: 10 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: '#334155', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  badgeText: { color: '#e2e8f0', fontSize: 11, fontWeight: '600' },
  sourceBadge: { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
  sourceText: { color: '#a5b4fc', fontSize: 11, fontWeight: '600' },
  chevron: { marginLeft: 'auto' },
});
