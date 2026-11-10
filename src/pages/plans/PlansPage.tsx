import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@app/navigation/types';
import { useDatabase } from '@app/providers/DatabaseProvider';
import type { Plan } from '@entities/plan/model/types';
import { PlanRepository } from '@entities/plan/repository/planRepository';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { Screen } from '@shared/ui/Screen';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { TextField } from '@shared/ui/TextField';
import { useThemeColors } from '@shared/ui/theme';

export const PlansPage = () => {
  const db = useDatabase();
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => setPlans(await new PlanRepository(db).list()), [db]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const create = async () => {
    try {
      const plan = await new PlanRepository(db).create(name);
      setName('');
      setCreating(false);
      await new PlanRepository(db).activate(plan.id);
      await load();
    } catch (error) {
      Alert.alert('Cannot create plan', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <Screen title="Программы" eyebrow="Планирование" subtitle="Тренируйся по своему плану.">
      <Pressable accessibilityRole="button" accessibilityLabel="Добавить программу" onPress={() => setCreating(current => !current)} style={{ alignSelf: 'flex-end', backgroundColor: colors.secondarySurface, padding: 12, borderRadius: 12 }}><Ionicons name={creating ? 'close' : 'add'} color={colors.primary} size={20} /></Pressable>
      {creating ? <Card>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Новая программа</Text>
        <TextField label="Название" onChangeText={setName} placeholder="Сила и форма" value={name} />
        <Button disabled={!name.trim()} onPress={create}>Создать программу</Button>
      </Card> : null}
      {plans.length === 0 ? <EmptyState text="Создай первую программу тренировок." /> : null}
      {plans.some(plan => plan.status === 'active') ? <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Активная программа</Text> : null}
      {plans.map(plan => (
        <Pressable key={plan.id} onPress={() => navigation.navigate('PlanDetails', { planId: plan.id })}>
          <View style={{ backgroundColor: plan.status === 'active' ? colors.primary : colors.surface, borderRadius: 18, padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ color: plan.status === 'active' ? colors.primaryText : colors.text, fontSize: 18, fontWeight: '800', flex: 1 }}>{plan.name}</Text>
              <StatusBadge label={plan.status === 'active' ? 'Активна' : 'Неактивна'} tone={plan.status === 'active' ? 'success' : 'neutral'} />
            </View>
            <Text style={{ color: plan.status === 'active' ? colors.primaryText : colors.muted, opacity: plan.status === 'active' ? 0.8 : 1 }}>Открыть программу и тренировочные дни →</Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
};
