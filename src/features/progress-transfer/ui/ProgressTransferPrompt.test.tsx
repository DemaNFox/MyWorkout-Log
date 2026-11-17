import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import type { Database } from '@shared/db/types';

import { ProgressTransferPrompt } from './ProgressTransferPrompt';

const mockGetOffer = jest.fn();
const mockAccept = jest.fn();
const mockDecline = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));
jest.mock('../model/progressTransferService', () => ({
  ProgressTransferService: jest.fn().mockImplementation(() => ({
    getOffer: mockGetOffer,
    accept: mockAccept,
    decline: mockDecline,
  })),
}));

it('asks once and transfers only after explicit consent', async () => {
  mockGetOffer.mockResolvedValue({ planId: 'new-plan', exerciseCount: 2 });
  mockAccept.mockResolvedValue(2);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const screen = render(<ProgressTransferPrompt db={{} as Database} />);

  await waitFor(() => expect(screen.getByText('Перенести прежние значения?')).toBeTruthy());
  expect(mockAccept).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Перенести' }));
  await waitFor(() => expect(mockAccept).toHaveBeenCalledWith('new-plan'));
  expect(mockDecline).not.toHaveBeenCalled();
  alert.mockRestore();
});
