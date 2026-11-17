import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import type { Database } from '@shared/db/types';
import { Button } from '@shared/ui/Button';
import { spacing, useThemeColors } from '@shared/ui/theme';

import { ProgressTransferService, type ProgressTransferOffer } from '../model/progressTransferService';

export const ProgressTransferPrompt = ({ db }: { db: Database }) => {
  const colors = useThemeColors();
  const [offer, setOffer] = useState<ProgressTransferOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void new ProgressTransferService(db).getOffer()
      .then(nextOffer => { if (active) setOffer(nextOffer); })
      .catch(reason => {
        if (active) Alert.alert('Не удалось проверить историю', reason instanceof Error ? reason.message : 'Неизвестная ошибка');
      });
    return () => { active = false; };
  }, [db]));

  const choose = async (transfer: boolean) => {
    if (!offer || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const service = new ProgressTransferService(db);
      if (transfer) {
        const count = await service.accept(offer.planId);
        Alert.alert('Значения перенесены', `Сохранены последние подходы для ${count} упражнений. Они появятся в новых тренировках, если в этой программе ещё нет более свежих результатов.`);
      } else {
        await service.decline();
      }
      setOffer(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось перенести значения');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal animationType="fade" statusBarTranslucent transparent visible={offer !== null} onRequestClose={() => undefined}>
      <View accessibilityViewIsModal style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.58)', padding: spacing.xl }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, gap: spacing.md }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>Перенести прежние значения?</Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            {`Нашли результаты для ${offer?.exerciseCount ?? 0} упражнений в других программах. Подставим последние завершённые подходы в будущих тренировках этой программы. Уже записанные результаты и история не изменятся.`}
          </Text>
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          {busy ? <ActivityIndicator color={colors.primary} /> : null}
          <Button disabled={busy} onPress={() => void choose(true)}>Перенести</Button>
          <Button disabled={busy} variant="secondary" onPress={() => void choose(false)}>Не переносить</Button>
        </View>
      </View>
    </Modal>
  );
};
