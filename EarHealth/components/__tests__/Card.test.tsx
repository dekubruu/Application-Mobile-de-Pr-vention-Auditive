import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { Card } from '../Card';

describe('Card', () => {
  test('renders its children', () => {
    const { getByText } = render(<Card><Text>Contenu</Text></Card>);
    expect(getByText('Contenu')).toBeTruthy();
  });

  test('renders as a plain View (not pressable) with no onPress', () => {
    const { getByText } = render(<Card><Text>Statique</Text></Card>);
    // Should not throw / behave oddly when "pressed" since there's no handler.
    expect(() => fireEvent.press(getByText('Statique'))).not.toThrow();
  });

  test('calls onPress when tapped, given a handler', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Card onPress={onPress}><Text>Cliquable</Text></Card>);
    fireEvent.press(getByText('Cliquable'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
