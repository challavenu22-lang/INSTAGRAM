import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, SafeAreaView } from 'react-native';
import { Header } from '../components/Header';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { VideoCard } from '../components/VideoCard';
import api from '../services/api';

export default function HomeScreen() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [video, setVideo] = useState(null);
  const [downloadedUrls, setDownloadedUrls] = useState([]);

  const handleSearch = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      Alert.alert('Invalid Input', 'Please enter a valid video URL.');
      return;
    }

    setLoading(true);
    setVideo(null);

    try {
      const res = await api.post('/video/search', { url: trimmed });
      if (res.success && res.data) {
        setVideo(res.data);
      }
    } catch (err) {
      Alert.alert('Search Failed', err.message || 'Could not fetch video details.');
    } finally {
      setLoading(false);
    }
  };

  const executeDownload = async (targetUrl) => {
    setDownloading(true);
    try {
      // Send download request to server which logs history
      const res = await api.post('/video/search', { url: targetUrl });
      setDownloadedUrls(prev => [...prev, targetUrl]);
      Alert.alert('Download Complete', 'Your video download has been completed and recorded in your history log!');
    } catch (err) {
      Alert.alert('Download Failed', err.message || 'Permission denied or unsupported URL.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownload = async (force = false) => {
    const targetUrl = url.trim() || video?.sourceUrl;
    if (!targetUrl) return;

    if (!force && downloadedUrls.includes(targetUrl)) {
      Alert.alert(
        'Video Already Downloaded',
        'You have already downloaded this video. Do you want to download it again?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Download Again', onPress: () => executeDownload(targetUrl) }
        ]
      );
      return;
    }

    await executeDownload(targetUrl);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header />
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Title Heading */}
        <View style={styles.headingContainer}>
          <Text style={styles.mainTitle}>Video Downloader</Text>
          <Text style={styles.subTitle}>Download videos you own or have permission to use.</Text>
        </View>

        {/* Input Card Container */}
        <View style={styles.card}>
          <Input
            label="Video URL"
            value={url}
            onChangeText={setUrl}
            placeholder="Paste video URL here..."
          />

          <View style={styles.btnRow}>
            <View style={styles.flex1}>
              <Button
                title="🔎 Search"
                onPress={handleSearch}
                loading={loading}
                variant="secondary"
                disabled={!url.trim() || downloading}
              />
            </View>
            <View style={styles.flex1}>
              <Button
                title="⬇ Download"
                onPress={handleDownload}
                loading={downloading}
                disabled={!url.trim() || loading}
              />
            </View>
          </View>
        </View>

        {/* Preview Card */}
        {video && (
          <VideoCard
            video={video}
            onDownload={handleDownload}
            downloading={downloading}
          />
        )}

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
  },
  headingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  mainTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subTitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  flex1: {
    flex: 1,
  },
});
