import { fireEvent, render, screen } from '@testing-library/react-native';

import { ExerciseNoteField } from './ExerciseNoteField';

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: () => null,
}));

describe('ExerciseNoteField', () => {
  it('switches from compact edit action to an active save action', () => {
    const onChangeText = jest.fn();
    const onEdit = jest.fn();
    const onSave = jest.fn();
    const { rerender } = render(
      <ExerciseNoteField
        dirty={false}
        editing={false}
        onChangeText={onChangeText}
        onEdit={onEdit}
        onSave={onSave}
        value="Keep elbows stable"
      />,
    );

    fireEvent.press(screen.getByLabelText('Edit exercise comment'));
    expect(onEdit).toHaveBeenCalledTimes(1);

    rerender(
      <ExerciseNoteField
        dirty
        editing
        onChangeText={onChangeText}
        onEdit={onEdit}
        onSave={onSave}
        value="Keep elbows stable"
      />,
    );
    fireEvent.press(screen.getByLabelText('Save exercise comment'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
