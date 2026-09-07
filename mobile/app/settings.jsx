import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, SafeAreaView, TouchableOpacity, Image } from 'react-native';
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
  const [activeDetail, setActiveDetail] = useState(null);

  const displayUserName = user?.username || user?.userName || user?.name || user?.fullName || 'venu';
  const displayName = user?.fullName || user?.name || displayUserName;

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

        {/* ACCOUNT DETAILS */}
        <Text style={styles.sectionHeader}>ACCOUNT DETAILS</Text>
        
        {activeDetail === null ? (
          <View style={styles.listCard}>
            {/* ROW 1: Profile pic */}
            <TouchableOpacity style={styles.listRow} onPress={() => setActiveDetail('pic')}>
              <Text style={styles.listRowText}>Profile pic</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* ROW 2: User name */}
            <TouchableOpacity style={styles.listRow} onPress={() => setActiveDetail('username')}>
              <Text style={styles.listRowText}>User name</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* ROW 3: User id */}
            <TouchableOpacity style={styles.listRow} onPress={() => setActiveDetail('userid')}>
              <Text style={styles.listRowText}>User id</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* ROW 4: Mail id */}
            <TouchableOpacity style={styles.listRow} onPress={() => setActiveDetail('email')}>
              <Text style={styles.listRowText}>Mail id</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => setActiveDetail(null)} style={styles.backButton}>
              <Text style={styles.backButtonText}>‹ Back to Account Details</Text>
            </TouchableOpacity>

            {activeDetail === 'pic' && (
              <View style={styles.detailBoxCenter}>
                <Text style={styles.label}>Profile Pic</Text>
                {user?.picture ? (
                  <Image source={{ uri: user.picture }} style={styles.profileImg} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{displayUserName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
            )}

            {activeDetail === 'username' && (
              <View style={styles.detailBox}>
                <Text style={styles.label}>User Name</Text>
                <Text style={styles.value}>{displayUserName}</Text>
              </View>
            )}

            {activeDetail === 'userid' && (
              <View style={styles.detailBox}>
                <Text style={styles.label}>User ID</Text>
                <Text style={styles.value}>{user?.id || 'VEn'}</Text>
              </View>
            )}

            {activeDetail === 'email' && (
              <View style={styles.detailBox}>
                <Text style={styles.label}>Mail ID</Text>
                <Text style={styles.value}>{user?.email || 'challavenu22@gmail.com'}</Text>
              </View>
            )}
          </View>
        )}

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
  sectionHeader: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  listCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  listRow: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listRowText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  chevron: {
    color: '#64748b',
    fontSize: 20,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 4,
  },
  value: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailBox: {
    paddingVertical: 8,
  },
  detailBoxCenter: {
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  profileImg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginTop: 8,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  avatarText: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
