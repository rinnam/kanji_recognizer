import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { nihongoTheme } from '../../theme/nihongo-theme';
import { speakJapanese } from '../../utils/speak-japanese';
import {
  CLINIC_QUICK_SYMPTOMS,
  HORENSO_PROPOSALS,
  HORENSO_SPRINT_TASKS,
  WASHOKU_MENU,
} from './scenario-props-data';

export type PropModalKind = 'menu' | 'medical_intake' | 'kanban' | 'cv' | 'outcome' | null;

export interface OutcomeCardData {
  title: string;
  items: string[];
  noteVi: string;
}

interface ScenarioPropModalProps {
  kind: PropModalKind;
  customContext: string;
  outcomeCard?: OutcomeCardData | null;
  onClose: () => void;
  onPickPhrase?: (japaneseText: string) => void;
}

export function ScenarioPropModal({
  kind,
  customContext,
  outcomeCard,
  onClose,
  onPickPhrase,
}: ScenarioPropModalProps) {
  if (!kind) return null;

  const title =
    kind === 'menu'
      ? 'Thực đơn · お品書き (Washoku Sakura)'
      : kind === 'medical_intake'
        ? 'Phiếu khai bệnh · 問診票 & Thẻ 保険証'
        : kind === 'kanban'
          ? 'Bảng tiến độ Sprint · スプリント進捗'
          : kind === 'outcome'
            ? outcomeCard?.title || 'Tài liệu kết thúc buổi'
            : 'Hồ sơ CV / 履歴書 của bạn';

  return (
    <Modal visible={kind !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.closeText}>Đóng</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator>
            {kind === 'menu' ? (
              <View style={styles.listGap}>
                <Text style={styles.hint}>
                  Bấm vào món để nghe phát âm tiếng Nhật hoặc bấm &quot;Gọi món&quot; để điền nhanh câu gọi món.
                </Text>
                {WASHOKU_MENU.map((dish) => (
                  <View key={dish.id} style={styles.dishRow}>
                    <Pressable
                      style={styles.dishInfo}
                      onPress={() => void speakJapanese(dish.reading)}
                    >
                      <View style={styles.dishTop}>
                        <Text style={styles.dishJa}>{dish.nameJa}</Text>
                        <Text style={styles.dishPrice}>¥{dish.priceYen.toLocaleString()}</Text>
                      </View>
                      <Text style={styles.dishReading}>
                        {dish.reading} · {dish.meaningVi}
                      </Text>
                      {dish.tags.length > 0 ? (
                        <View style={styles.tagsRow}>
                          {dish.tags.map((t) => (
                            <View key={t} style={styles.tagPill}>
                              <Text style={styles.tagText}>{t}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </Pressable>
                    {onPickPhrase ? (
                      <Pressable
                        style={styles.useBtn}
                        onPress={() => {
                          onPickPhrase(`${dish.nameJa}を一つお願いします。`);
                          onClose();
                        }}
                      >
                        <Text style={styles.useBtnText}>Gọi món</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : kind === 'medical_intake' ? (
              <View style={styles.listGap}>
                <View style={styles.contextBox}>
                  <Text style={styles.boxLabel}>Tình trạng bạn đã khai báo (Bối cảnh hiện tại):</Text>
                  <Text style={styles.boxValue}>
                    {customContext || 'Chưa nhập bối cảnh riêng — bạn có thể mô tả bất kỳ triệu chứng hoặc chấn thương nào (sốt, đau bụng, gãy chân...).'}
                  </Text>
                </View>

                <Text style={styles.hint}>
                  Mẫu câu mô tả thường dùng tại phòng khám Nhật (bấm để nghe hoặc chèn nhanh):
                </Text>
                {CLINIC_QUICK_SYMPTOMS.map((s, idx) => (
                  <View key={idx} style={styles.dishRow}>
                    <Pressable style={styles.dishInfo} onPress={() => void speakJapanese(s.ja)}>
                      <Text style={styles.dishJa}>{s.ja}</Text>
                      <Text style={styles.dishReading}>{s.vi}</Text>
                    </Pressable>
                    {onPickPhrase ? (
                      <Pressable
                        style={styles.useBtn}
                        onPress={() => {
                          onPickPhrase(s.ja);
                          onClose();
                        }}
                      >
                        <Text style={styles.useBtnText}>Dùng câu</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : kind === 'kanban' ? (
              <View style={styles.listGap}>
                {customContext ? (
                  <View style={styles.contextBox}>
                    <Text style={styles.boxLabel}>Bối cảnh cuộc họp bạn đang chọn:</Text>
                    <Text style={styles.boxValue}>{customContext}</Text>
                  </View>
                ) : null}
                <Text style={styles.boxLabel}>Bảng Task mẫu tham khảo (nếu dùng bối cảnh mặc định):</Text>
                {HORENSO_SPRINT_TASKS.map((task) => (
                  <View key={task.id} style={styles.taskCard}>
                    <View style={styles.dishTop}>
                      <Text style={styles.dishJa}>{task.title}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          task.status === 'DONE'
                            ? styles.stDone
                            : task.status === 'AT_RISK'
                              ? styles.stRisk
                              : styles.stTodo,
                        ]}
                      >
                        <Text style={styles.statusText}>{task.progressPct}%</Text>
                      </View>
                    </View>
                    <Text style={styles.dishReading}>{task.note}</Text>
                  </View>
                ))}
                <View style={styles.contextBox}>
                  <Text style={styles.boxLabel}>Gợi ý phương án trao đổi (相談):</Text>
                  {HORENSO_PROPOSALS.map((p, i) => (
                    <Text key={i} style={styles.boxValue}>
                      • {p}
                    </Text>
                  ))}
                </View>
              </View>
            ) : kind === 'outcome' && outcomeCard ? (
              <View style={styles.listGap}>
                <View style={styles.contextBox}>
                  {outcomeCard.items.map((line, i) => (
                    <Text key={i} style={styles.outcomeLine}>
                      • {line}
                    </Text>
                  ))}
                </View>
                {outcomeCard.noteVi ? (
                  <Text style={styles.hint}>{outcomeCard.noteVi}</Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.contextBox}>
                <Text style={styles.boxLabel}>Nội dung CV / 履歴書 đang dùng trong buổi phỏng vấn:</Text>
                <Text style={styles.boxValue}>{customContext || 'Chưa có nội dung CV.'}</Text>
              </View>
            )}
          </ScrollView>
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
  card: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '84%',
    backgroundColor: '#FFFFFF',
    borderRadius: nihongoTheme.radius.card,
    padding: 18,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    flex: 1,
  },
  closeText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  body: {
    maxHeight: 440,
  },
  listGap: {
    gap: 10,
  },
  hint: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 18,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FDF8F0',
    borderWidth: 1,
    borderColor: '#E5D5C3',
    borderRadius: 12,
    padding: 11,
  },
  dishInfo: {
    flex: 1,
    gap: 3,
  },
  dishTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  dishJa: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    flex: 1,
  },
  dishPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  dishReading: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  tagPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  useBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: nihongoTheme.radius.pill,
  },
  useBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  contextBox: {
    backgroundColor: '#FDF8F0',
    borderWidth: 1,
    borderColor: '#E5D5C3',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  boxLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9A5B37',
  },
  boxValue: {
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
    lineHeight: 20,
  },
  taskCard: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  stDone: {
    backgroundColor: nihongoTheme.colors.successBg,
  },
  stRisk: {
    backgroundColor: '#FEF2F2',
  },
  stTodo: {
    backgroundColor: '#E5E7EB',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  outcomeLine: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    lineHeight: 21,
  },
});
