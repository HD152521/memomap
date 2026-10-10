import * as Clipboard from 'expo-clipboard';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SecretReveal } from '../chips/SecretReveal';

describe('SecretReveal', () => {
  test('keeps the secret masked until tapped, then copies it', async () => {
    // Arrange
    await render(<SecretReveal secret="1234*" />);
    expect(screen.queryByText('1234*')).toBeNull();

    // Act
    await fireEvent.press(screen.getByTestId('secret-reveal'));
    await fireEvent.press(screen.getByTestId('secret-copy'));

    // Assert
    expect(screen.getByTestId('secret-value')).toHaveTextContent('1234*');
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('1234*');
    expect(await screen.findByText('복사했어요')).toBeTruthy();
  });

  test('hides it again on a second tap', async () => {
    await render(<SecretReveal secret="wifi-pass-long-value" />);

    await fireEvent.press(screen.getByTestId('secret-reveal'));
    await fireEvent.press(screen.getByTestId('secret-reveal'));

    expect(screen.queryByTestId('secret-value')).toBeNull();
  });
});
