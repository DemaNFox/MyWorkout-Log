import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
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
      await new PlanRepository(db).activate(plan.id);
      await load();
    } catch (error) {
      Alert.alert('Cannot create plan', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <Screen title="Plans">
      <Card>
        <TextField label="Plan name" onChangeText={setName} placeholder="Push Pull Legs" value={name} />
        <Button disabled={!name.trim()} onPress={create}>Create active plan</Button>
      </Card>
      {plans.length === 0 ? <EmptyState text="No plans yet." /> : null}
      {plans.map(plan => (
        <Pressable key={plan.id} onPress={() => navigation.navigate('PlanDetails', { planId: plan.id })}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 }}>{plan.name}</Text>
              <StatusBadge label={plan.status} tone={plan.status === 'active' ? 'success' : 'neutral'} />
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
};
