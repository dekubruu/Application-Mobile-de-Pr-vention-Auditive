import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { HeadphoneGateView } from '../components/HeadphoneGateView';

describe('HeadphoneGateView', () => {
  test('renders the prompt', () => {
    const { getByText } = render(<HeadphoneGateView onNext={jest.fn()} onCancel={jest.fn()} />);
    expect(getByText('Connectez vos écouteurs')).toBeTruthy();
  });

  test('does not call onNext when pressed before confirming', () => {
    const onNext = jest.fn();
    const { getByText } = render(<HeadphoneGateView onNext={onNext} onCancel={jest.fn()} />);
    fireEvent.press(getByText('Suivant'));
    expect(onNext).not.toHaveBeenCalled();
  });

  test('calls onNext when pressed after checking the confirmation box', () => {
    const onNext = jest.fn();
    const { getByText } = render(<HeadphoneGateView onNext={onNext} onCancel={jest.fn()} />);
    fireEvent.press(getByText('Je confirme avoir des écouteurs connectés'));
    fireEvent.press(getByText('Suivant'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  test('toggles the confirmation checkbox off again on a second press', () => {
    const onNext = jest.fn();
    const { getByText } = render(<HeadphoneGateView onNext={onNext} onCancel={jest.fn()} />);
    const checkboxLabel = getByText('Je confirme avoir des écouteurs connectés');
    fireEvent.press(checkboxLabel);
    fireEvent.press(checkboxLabel);
    fireEvent.press(getByText('Suivant'));
    expect(onNext).not.toHaveBeenCalled();
  });

  test('calls onCancel when "Annuler" is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(<HeadphoneGateView onNext={jest.fn()} onCancel={onCancel} />);
    fireEvent.press(getByText('Annuler'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
