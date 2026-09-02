import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, SafeAreaView } from 'react-native';
import { Header } from '../components/Header';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in password fields.');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/settings/password', { currentPassword, newPassword });
      Alert.alert('Success', 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await api.post('/auth/logout-all');
      await logout();
    } catch (err) {
      Alert.alert('Error', 'Could not logout from all sessions.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headerTitle}>Account & Settings</Text>

        {/* Profile Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>ACCOUNT PROFILE</Text>
          <Text style={styles.label}>Email Address</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>

        {/* Change Password Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>CHANGE PASSWORD</Text>
          <Input
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            secureTextEntry
          />
          <Input
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 8 characters"
            secureTextEntry
          />
          <Button
            title="Update Password"
            onPress={handleChangePassword}
            loading={loading}
          />
        </View>

        {/* Logout All Sessions */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>SECURITY</Text>
          <Button
            title="Logout From All Devices"
            onPress={handleLogoutAll}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    padding: 20,
    gap: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 18,
  },
  cardHeader: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
  },
  value: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
});
