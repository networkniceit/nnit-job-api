import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getSavedJobs, removeSavedJob, jobKey } from '../services/savedJobs';

const WORK_TYPE_LABELS = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' };

export default function SavedJobs({ navigation }) {
  const [jobs, setJobs] = useState([]);

  // Reload every time the tab is opened so jobs saved on the details screen appear here.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSavedJobs().then(list => { if (active) setJobs(list); });
      return () => { active = false; };
    }, [])
  );

  const openJob = job => navigation.navigate('SearchJobs', { screen: 'JobDetailsScreen', params: { job } });
  const removeJob = async job => setJobs(await removeSavedJob(job));

  const renderJob = ({ item }) => (
    <TouchableOpacity style={styles.jobCard} onPress={() => openJob(item)}>
      <View style={styles.cardTop}>
        <View style={styles.cardText}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.company}>{item.company || 'Employer not listed'}</Text>
        </View>
        <TouchableOpacity onPress={() => removeJob(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="bookmark" size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="location" size={14} color="#64748b" />
        <Text style={styles.metaText}>{item.location}</Text>
      </View>
      <View style={styles.badgeRow}>
        {!!item.work_type && (
          <View style={styles.badge}><Text style={styles.badgeText}>{WORK_TYPE_LABELS[item.work_type] || item.work_type}</Text></View>
        )}
        <View style={[styles.badge, styles.sourceBadge]}>
          <Text style={styles.sourceText}>{item.source_label || item.source}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={item => jobKey(item)}
        ListHeaderComponent={
          <LinearGradient colors={['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
            <Text style={styles.title}>Saved Jobs</Text>
            <Text style={styles.subtitle}>
              {jobs.length === 0 ? 'No saved jobs yet' : `${jobs.length} saved ${jobs.length === 1 ? 'job' : 'jobs'}`}
            </Text>
          </LinearGradient>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={64} color="#334155" />
            <Text style={styles.emptyText}>Open a job and tap Save to keep it here for later</Text>
          </View>
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingVertical: 24, paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)' },
  content: { paddingBottom: 30 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 16, textAlign: 'center' },
  jobCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginHorizontal: 15, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardText: { flex: 1, paddingRight: 10 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  company: { fontSize: 13, color: '#94a3b8' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metaText: { fontSize: 12, color: '#64748b', flexShrink: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { backgroundColor: '#334155', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  badgeText: { color: '#e2e8f0', fontSize: 11, fontWeight: '600' },
  sourceBadge: { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
  sourceText: { color: '#a5b4fc', fontSize: 11, fontWeight: '600' },
});
