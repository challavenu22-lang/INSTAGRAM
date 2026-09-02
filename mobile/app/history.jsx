import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView, 
  ActivityIndicator 
} from 'react-native';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import api from '../services/api';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const fetchHistory = async (pageNum) => {
    setLoading(true);
    try {
      const res = await api.get(`/history?page=${pageNum}&limit=20`);
      if (res.success) {
        setHistory(res.items || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
        }
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await api.delete(`/history/${id}`);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not delete item.');
    }
  };

  const handleClearAll = async () => {
    Alert.alert(
      'Confirm Clear',
      'Are you sure you want to clear all history records?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/history');
              setHistory([]);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to clear history.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header />
      <View style={styles.container}>
        
        <View style={styles.topRow}>
          <Text style={styles.headerTitle}>Download History</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={handleClearAll}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : history.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No History Found</Text>
            <Text style={styles.emptySubtitle}>Your downloaded video records will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.historyCard}>
                <View style={styles.cardInfo}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.itemMeta}>🌐 {item.sourceDomain} • {new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteItem(item.id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>🗑 Delete</Text>
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.listContainer}
          />
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  clearText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  listContainer: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 3,
  },
  deleteBtn: {
    padding: 6,
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
