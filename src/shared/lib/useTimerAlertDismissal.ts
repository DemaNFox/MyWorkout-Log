import { useEffect } from 'react';
import { AppState } from 'react-native';

import {
  isNativeTimerAlertActive,
  subscribeToNativeTimerAlertStopped,
} from './timerAlert';

export const useTimerAlertDismissal = (visible: boolean, onDismiss: () => void): void => {
  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const unsubscribe = subscribeToNativeTimerAlertStopped(onDismiss);
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        return;
      }
      void isNativeTimerAlertActive().then(isActive => {
        if (!isActive) {
          onDismiss();
        }
      });
    });

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [onDismiss, visible]);
};
