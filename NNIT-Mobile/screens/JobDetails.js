import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getJobDetail } from '../services/jobsApi';

const WORK_TYPE_LABELS = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' };

export default function JobDetails({ route }) {
  const { job } = route.params;
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(!!job.reference);

  // Some sources (Bundesagentur für Arbeit) send the full text separately; load it here so it is read inside the app.
  useEffect(() => {
    if (!job.reference) return undefined;
    let cancelled = false;
    getJobDetail(job.reference)
      .then(result => { if (!cancelled) setDetail(result); })
      .catch(err => { if (!cancelled) setDetailError(err.message); })
      .finally(() => { if (!cancelled) setLoadingDetail(false); });
    return () => { cancelled = true; };
  }, [job.reference]);

  const facts = detail && detail.facts.length > 0
    ? detail.facts
    : [
        { label: 'Location', value: job.location },
        { label: 'Work type', value: WORK_TYPE_LABELS[job.work_type] || job.work_type },
        { label: 'Employment', value: job.employment_type },
        { label: 'Published', value: job.published },
        { label: 'Source', value: job.source_label || job.source },
      ].filter(fact => fact.value);

  const description = (detail && detail.description) || job.description || job.summary || '';
  const company = job.company || 'Employer not listed';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.jobHeader}>
            <View style={styles.icon}><Text style={styles.iconText}>{company.charAt(0).toUpperCase()}</Text></View>
            <View style={styles.headerContent}>
              <Text style={styles.title}>{job.title}</Text>
              <Text style={styles.company}>{company}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Information</Text>
            {facts.map(fact => (
              <View key={fact.label} style={styles.infoBox}>
                <Text style={styles.label}>{fact.label}: </Text>
                <Text style={styles.value}>{fact.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Job</Text>
            {loadingDetail && <ActivityIndicator color="#6366f1" style={styles.loader} />}
            {!!detailError && <Text style={styles.errorText}>{detailError}</Text>}
            {!loadingDetail && !!description && <Text style={styles.description}>{description}</Text>}
            {!loadingDetail && !description && !detailError && (
              <Text style={styles.description}>This vacancy has no text description.</Text>
            )}
            {!!job.reference && (
              <Text style={styles.note}>
                The employer's direct contact and application details are protected by the Bundesagentur's
                security check and appear above only if the employer put them in the description.
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.note}>
              Source:{' '}
              {job.source_url ? (
                <Text style={styles.link} onPress={() => Linking.openURL(job.source_url)}>
                  {job.source_label || job.source}
                </Text>
              ) : (
                job.source_label || job.source
              )}
            </Text>
          </View>

          {!!job.link && (
            <View style={styles.actionSection}>
              <TouchableOpacity style={styles.applyBtn} onPress={() => Linking.openURL(job.link)}>
                <LinearGradient colors={['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.applyGradient}>
                  <Text style={styles.applyText}>{job.reference ? 'Apply: open original listing' : 'Apply Now'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { paddingBottom: 30 },
  header: { paddingVertical: 20, paddingHorizontal: 15, marginBottom: 20 },
  jobHeader: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 56, height: 56, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  headerContent: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  company: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)' },
  content: { paddingHorizontal: 15 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },
  infoBox: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#334155', flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  value: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 },
  description: { fontSize: 14, color: '#cbd5e1', lineHeight: 22, backgroundColor: '#1e293b', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#334155' },
  loader: { marginVertical: 16 },
  errorText: { color: '#ef4444', fontSize: 13, marginBottom: 10 },
  note: { fontSize: 12, color: '#64748b', lineHeight: 18, marginTop: 10 },
  link: { color: '#a5b4fc', textDecorationLine: 'underline' },
  actionSection: { flexDirection: 'row', gap: 12, marginVertical: 20 },
  applyBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  applyGradient: { alignItems: 'center', paddingVertical: 14 },
  applyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
