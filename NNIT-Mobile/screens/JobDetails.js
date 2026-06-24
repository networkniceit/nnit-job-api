import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function JobDetails({ route }) {
  const { job } = route.params;
  const [isSaved, setIsSaved] = React.useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.jobHeader}>
            <View style={styles.icon}><Text style={styles.iconText}>{job.company.charAt(0).toUpperCase()}</Text></View>
            <View style={styles.headerContent}>
              <Text style={styles.title}>{job.title}</Text>
              <Text style={styles.company}>{job.company}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Information</Text>
            <View style={styles.infoBox}><Text style={styles.label}>Location: </Text><Text style={styles.value}>{job.location}</Text></View>
            <View style={styles.infoBox}><Text style={styles.label}>Type: </Text><Text style={styles.value}>{job.type}</Text></View>
            <View style={styles.infoBox}><Text style={styles.label}>Salary: </Text><Text style={styles.value}>{job.salary}</Text></View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Job</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>

          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.applyBtn}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.applyGradient}>
                <Text style={styles.applyText}>Apply Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  actionSection: { flexDirection: 'row', gap: 12, marginVertical: 20 },
  applyBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  applyGradient: { alignItems: 'center', paddingVertical: 14 },
  applyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
