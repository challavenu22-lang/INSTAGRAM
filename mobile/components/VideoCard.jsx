import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Button } from './Button';

export const VideoCard = ({ video, onDownload, downloading }) => {
  if (!video) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>VIDEO PREVIEW</Text>
      
      {video.thumbnailUrl && (
        <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnail} />
      )}

      <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
      <Text style={styles.domain}>🌐 {video.sourceDomain}</Text>

      <View style={styles.actionContainer}>
        <Button
          title={downloading ? "Downloading..." : "⬇ Download Video"}
          onPress={onDownload}
          loading={downloading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginTop: 20,
    width: '100%',
  },
  cardTitle: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  thumbnail: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#1e293b',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  domain: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  actionContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
  },
});
