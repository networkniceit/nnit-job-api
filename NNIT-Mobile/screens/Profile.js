import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function Profile() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>JD</Text></View>
        <Text style={styles.name}>John Developer</Text>
        <Text style={styles.email}>john@example.com</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="settings" size={20} color="#6366f1" />
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle" size={20} color="#6366f1" />
          <Text style={styles.menuText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingVertical: 24, paddingHorizontal: 20, marginBottom: 20, alignItems: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: '#fff' },
  email: { fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 },
  content: { paddingHorizontal: 15, paddingBottom: 30 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  menuText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff', marginLeft: 12 },
  logoutBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 10, borderWidth: 2, borderColor: '#ef4444', alignItems: 'center' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
});
