import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { nihongoTheme } from '../../theme/nihongo-theme';
import { libraryEndpoint } from '../../library-source';

export interface AiExtractedCard {
  word: string;
  reading: string;
  meaning: string;
  sinoVietnamese: string;
  jlptLevel: string;
  example: string;
  exampleMeaning: string;
}

interface AiFlashcardModalProps {
  visible: boolean;
  folderName: string;
  onClose: () => void;
  onImportCards: (cards: AiExtractedCard[]) => void;
}

async function fileUriToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const s = String(reader.result ?? '');
        const idx = s.indexOf(',');
        resolve(idx >= 0 ? s.slice(idx + 1) : s);
      };
      reader.onerror = () => reject(new Error('Read failed'));
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

export function AiFlashcardModal({
  visible,
  folderName,
  onClose,
  onImportCards,
}: AiFlashcardModalProps) {
  const [textInput, setTextInput] = useState('');
  const [pickedFile, setPickedFile] = useState<{ name: string; base64: string; mime: string } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [cards, setCards] = useState<AiExtractedCard[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePickImage = async () => {
    setErrorMsg(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const base64 = await fileUriToBase64(asset.uri);
      setPickedFile({
        name: asset.name || 'image.jpg',
        base64,
        mime: asset.mimeType || 'image/jpeg',
      });
    } catch {
      setErrorMsg('Không đọc được ảnh/PDF đã chọn.');
    }
  };

  const handleExtract = async () => {
    if ((!textInput.trim() && !pickedFile) || extracting) return;
    setExtracting(true);
    setErrorMsg(null);
    try {
      const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
      const res = await fetch(`${base}/ai/flashcards/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textInput.trim() || undefined,
          imageBase64: pickedFile?.base64,
          mimeType: pickedFile?.mime,
          maxCards: 12,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { cards?: AiExtractedCard[] };
      const list = data.cards ?? [];
      if (list.length === 0) {
        setErrorMsg('AI chưa tìm thấy từ vựng tiếng Nhật nào. Hãy thử ảnh rõ hơn hoặc dán đoạn văn.');
      }
      setCards(list);
    } catch {
      setErrorMsg('Không gọi được AI trích xuất từ (có thể Google AI đang bận). Hãy thử lại sau vài giây.');
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirmSave = () => {
    if (cards.length === 0) return;
    onImportCards(cards);
    setCards([]);
    setTextInput('');
    setPickedFile(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Tạo Flashcard bằng AI</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>Đóng</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Lưu vào: <Text style={styles.bold}>{folderName}</Text> · Dán đoạn văn báo/truyện Nhật hoặc chọn ảnh chụp trang sách/đề JLPT.
          </Text>

          <View style={styles.pickRow}>
            <Pressable style={styles.pickBtn} onPress={() => void handlePickImage()}>
              <Text style={styles.pickBtnText}>
                {pickedFile ? `Đã chọn: ${pickedFile.name}` : '+ Chọn ảnh sách / PDF'}
              </Text>
            </Pressable>
            {pickedFile ? (
              <Pressable onPress={() => setPickedFile(null)}>
                <Text style={styles.clearLink}>Bỏ file</Text>
              </Pressable>
            ) : null}
          </View>

          <TextInput
            value={textInput}
            onChangeText={setTextInput}
            multiline
            numberOfLines={4}
            placeholder="Hoặc dán đoạn văn tiếng Nhật vào đây (ví dụ: đoạn báo NHK, đề JLPT, lời thoại anime)..."
            placeholderTextColor={nihongoTheme.colors.textMuted}
            style={styles.textarea}
          />

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, (extracting || (!textInput.trim() && !pickedFile)) && styles.disabled]}
            disabled={extracting || (!textInput.trim() && !pickedFile)}
            onPress={() => void handleExtract()}
          >
            {extracting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>AI trích xuất từ vựng →</Text>
            )}
          </Pressable>

          {cards.length > 0 ? (
            <View style={styles.previewSection}>
              <Text style={styles.previewHeader}>Xem trước ({cards.length} thẻ vừa trích xuất)</Text>
              <ScrollView style={styles.previewList}>
                {cards.map((c, idx) => (
                  <View key={`${c.word}-${idx}`} style={styles.previewItem}>
                    <View style={styles.previewTop}>
                      <Text style={styles.previewWord}>
                        {c.word} {c.reading ? `(${c.reading})` : ''}
                      </Text>
                      {c.sinoVietnamese ? <Text style={styles.previewSino}>{c.sinoVietnamese}</Text> : null}
                    </View>
                    <Text style={styles.previewMean}>{c.meaning}</Text>
                  </View>
                ))}
              </ScrollView>
              <Pressable style={styles.saveAllBtn} onPress={handleConfirmSave}>
                <Text style={styles.saveAllText}>Lưu tất cả {cards.length} thẻ vào Flashcard</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: nihongoTheme.radius.card,
    padding: 20,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  closeText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  subtitle: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickBtn: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: nihongoTheme.radius.pill,
  },
  pickBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  clearLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  textarea: {
    minHeight: 88,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 11,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  previewSection: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: nihongoTheme.colors.borderLight,
    paddingTop: 10,
  },
  previewHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  previewList: {
    maxHeight: 190,
  },
  previewItem: {
    backgroundColor: '#FDF8F0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5D5C3',
    padding: 10,
    marginBottom: 6,
    gap: 3,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewWord: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  previewSino: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9A5B37',
  },
  previewMean: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
  },
  saveAllBtn: {
    backgroundColor: '#15803D',
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveAllText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
