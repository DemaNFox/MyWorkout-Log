import { fireEvent, render, screen } from '@testing-library/react-native';

import { OperationStatusModal } from './OperationStatusModal';

describe('OperationStatusModal', () => {
  it('shows progress without a dismiss button', () => {
    render(
      <OperationStatusModal
        message="Please wait"
        onClose={jest.fn()}
        status="loading"
        title="Importing programs"
        visible
      />,
    );

    expect(screen.getByText('Importing programs')).toBeTruthy();
    expect(screen.getByLabelText('Operation in progress')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows a dismissible success result', () => {
    const onClose = jest.fn();
    render(
      <OperationStatusModal
        message="Imported programs: 2"
        onClose={onClose}
        status="success"
        title="Import complete"
        visible
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows an error result', () => {
    render(
      <OperationStatusModal
        message="No data was changed."
        onClose={jest.fn()}
        status="error"
        title="Import failed"
        visible
      />,
    );

    expect(screen.getByText('Import failed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });
});
