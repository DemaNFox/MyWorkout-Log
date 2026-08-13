import { act, render } from '@testing-library/react-native';
import { AppState, Text, type AppStateStatus } from 'react-native';

import {
  isNativeTimerAlertActive,
  subscribeToNativeTimerAlertStopped,
} from './timerAlert';
import { useTimerAlertDismissal } from './useTimerAlertDismissal';

jest.mock('./timerAlert', () => ({
  isNativeTimerAlertActive: jest.fn(),
  subscribeToNativeTimerAlertStopped: jest.fn(),
}));

const mockedIsNativeTimerAlertActive = jest.mocked(isNativeTimerAlertActive);
const mockedSubscribe = jest.mocked(subscribeToNativeTimerAlertStopped);

const Harness = ({ onDismiss, visible }: { onDismiss: () => void; visible: boolean }) => {
  useTimerAlertDismissal(visible, onDismiss);
  return <Text>Timer alert</Text>;
};

describe('useTimerAlertDismissal', () => {
  beforeEach(() => {
    mockedIsNativeTimerAlertActive.mockResolvedValue(true);
    mockedSubscribe.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('dismisses a visible modal when Android reports that the alert was stopped', () => {
    const onDismiss = jest.fn();
    let onNativeStopped: (() => void) | undefined;
    mockedSubscribe.mockImplementation(listener => {
      onNativeStopped = listener;
      return jest.fn();
    });

    render(<Harness onDismiss={onDismiss} visible />);
    act(() => onNativeStopped?.());

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe while the modal is hidden', () => {
    render(<Harness onDismiss={jest.fn()} visible={false} />);

    expect(mockedSubscribe).not.toHaveBeenCalled();
  });

  it('dismisses after returning to the app when the native stop event was missed', async () => {
    const onDismiss = jest.fn();
    let onAppStateChange: ((state: AppStateStatus) => void) | undefined;
    const appStateSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      onAppStateChange = listener;
      return { remove: jest.fn() } as never;
    });
    mockedIsNativeTimerAlertActive.mockResolvedValue(false);

    render(<Harness onDismiss={onDismiss} visible />);
    await act(async () => {
      onAppStateChange?.('active');
      await Promise.resolve();
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
    appStateSpy.mockRestore();
  });
});
