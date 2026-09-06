import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OfflineBanner from './OfflineBanner';
import { LowDataProvider } from '../context/LowDataContext';

describe('OfflineBanner', () => {
  it('shows online status and toggles low data', async () => {
    const user = userEvent.setup();
    render(
      <LowDataProvider>
        <OfflineBanner />
      </LowDataProvider>,
    );
    expect(screen.getByText(/Online/i)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));
    expect(localStorage.getItem('sheettomate_low_data')).toBe('1');
  });
});
