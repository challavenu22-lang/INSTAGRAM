import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export const ProfileMenu = ({ visible, onClose }) => {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!visible) return null;

  const navigateTo = (path) => {
    onClose();
    router.push(path);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    router.replace('/login');
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              
              {/* User Email Header */}
              <View style={styles.userHeader}>
                <Text style={styles.signedInLabel}>Signed in as</Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  ✉ {user?.email}
                </Text>
              </View>

              {/* Navigation Options */}
              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/home')}>
                <Text style={styles.itemText}>🏠 Home</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/settings')}>
                <Text style={styles.itemText}>⚙ Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/history')}>
                <Text style={styles.itemText}>🕘 History</Text>
              </TouchableOpacity>

              {/* Logout Option */}
              <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
                <Text style={styles.logoutText}>🚪 Log out</Text>
              </TouchableOpacity>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 65,
    paddingRight: 16,
  },
  menuContainer: {
    width: 240,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  userHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  signedInLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  userEmail: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 4,
  },
  logoutText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '600',
  },
});
