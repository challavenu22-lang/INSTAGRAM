import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { ProfileMenu } from './ProfileMenu';

export const Header = () => {
  const { user } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={styles.header}>
      {/* Brand Left */}
      <View style={styles.brand}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>⬇</Text>
        </View>
        <Text style={styles.brandTitle}>Video Downloader</Text>
      </View>

      {/* Profile Right */}
      {user && (
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Account Dropdown / Modal Menu */}
      <ProfileMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  profileBtn: {
    padding: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
