import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useThemeColors } from '@/features/theme/ThemeContext';
import { INFO_DISCLAIMER, type InfoContent } from '../constants/hearing-info';

interface InfoTooltipProps {
  content: InfoContent;
  size?:   number;
  color?:  string;
  /** When set, render a labelled button instead of the "ⓘ" icon. */
  label?:  string;
}

// A trigger (either a small "ⓘ" icon or a labelled button) that opens a
// bottom-sheet with the educational content. Rendered as its own Pressable so
// it can live inside another Pressable (e.g. the home summary card) without
// triggering the parent's navigation.
export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content, size = 16, color = Colors.textTertiary, label,
}) => {
  const { colors: tierColors } = useThemeColors();
  const [open, setOpen] = useState(false);

  const openLink = () => {
    if (content.link) WebBrowser.openBrowserAsync(content.link.url).catch(() => { /* ignore */ });
  };

  return (
    <>
      {label ? (
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.labelBtn, pressed && styles.labelBtnPressed]}
        >
          <Ionicons name="shield-checkmark-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.labelBtnText}>{label}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => setOpen(true)} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="information-circle-outline" size={size} color={color} />
        </Pressable>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{content.title}</Text>

            {content.paragraphs.map((p, i) => (
              <Text key={i} style={styles.paragraph}>{p}</Text>
            ))}

            {content.scale && (
              <View style={styles.scaleCard}>
                {content.scale.map((s, i) => (
                  <View
                    key={s.range}
                    style={[styles.scaleRow, i < content.scale!.length - 1 && styles.scaleRowBorder]}
                  >
                    <Text style={styles.scaleRange}>{s.range}</Text>
                    <Text style={styles.scaleLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {content.link && (
              <Pressable
                onPress={openLink}
                style={[styles.linkBtn, { backgroundColor: tierColors.primaryLight }]}
              >
                <Ionicons name="open-outline" size={16} color={tierColors.primary} />
                <Text style={[styles.linkText, { color: tierColors.primaryDark }]}>
                  Plus d’informations · {content.link.label}
                </Text>
              </Pressable>
            )}

            {!content.hideDisclaimer && (
              <View style={styles.disclaimer}>
                <Ionicons name="alert-circle-outline" size={14} color={Colors.textTertiary} />
                <Text style={styles.disclaimerText}>{INFO_DISCLAIMER}</Text>
              </View>
            )}

            <Pressable
              onPress={() => setOpen(false)}
              style={[styles.closeBtn, { backgroundColor: tierColors.primary }]}
            >
              <Text style={styles.closeText}>Fermer</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  iconBtn: { padding: 2 },

  labelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    alignSelf: 'center',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  labelBtnPressed: { opacity: 0.7 },
  labelBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.2 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '82%',
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  content: { paddingHorizontal: 24, paddingTop: 10 },

  title: { fontSize: 20, fontWeight: '800', color: Colors.text, letterSpacing: -0.3, marginBottom: 14 },
  paragraph: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: 12 },

  scaleCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 2,
    marginBottom: 14,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  scaleRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  scaleRange: { fontSize: 13, fontWeight: '800', color: Colors.text },
  scaleLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  linkText: { flex: 1, fontSize: 13, fontWeight: '700' },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    marginBottom: 16,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.textTertiary, lineHeight: 16 },

  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  closeText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
