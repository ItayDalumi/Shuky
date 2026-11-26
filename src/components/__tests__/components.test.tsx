import { fireEvent, render, screen } from '@testing-library/react-native';

import { initialListings, sellers } from '@/data/mock';
import type { Listing } from '@/data/types';
import { Button } from '../Button';
import { EmptyState } from '../EmptyState';
import { ProductCard } from '../ProductCard';
import { StarRating } from '../StarRating';
import { CakeSlice } from 'lucide-react-native';

const ready: Listing = { ...initialListings[0], availability: 'ready', bakedAt: new Date().toISOString() };
const preorder: Listing = { ...initialListings[0], id: 'p1', availability: 'preorder', noticeDays: 2 };
const seller = sellers.find((s) => s.id === ready.sellerId)!;

describe('ProductCard', () => {
  it('shows title, price, freshness, baker and level', async () => {
    const onPress = jest.fn();
    await render(<ProductCard listing={ready} seller={seller} onPress={onPress} />);
    expect(screen.getByText(ready.title)).toBeOnTheScreen();
    expect(screen.getByText(`₪${ready.price}`)).toBeOnTheScreen();
    expect(screen.getByText('נאפה היום')).toBeOnTheScreen();
    expect(screen.getByText(`רמה ${seller.level}`)).toBeOnTheScreen();
    expect(screen.getByText(new RegExp(seller.name.split(' ')[0]))).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: new RegExp(ready.title) }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('labels pre-orders', async () => {
    await render(<ProductCard listing={preorder} seller={seller} />);
    expect(screen.getByText('בהזמנה מראש')).toBeOnTheScreen();
  });

  it('marks my own listing', async () => {
    await render(<ProductCard listing={ready} isMine />);
    expect(screen.getByText('המאפה שלך')).toBeOnTheScreen();
  });

  it('announces the baker to screen readers', async () => {
    await render(<ProductCard listing={ready} seller={seller} />);
    expect(screen.getByLabelText(new RegExp(`אפוי אצל ${seller.name.split(' ')[0]}`))).toBeOnTheScreen();
  });
});

describe('Button', () => {
  it('presses', async () => {
    const onPress = jest.fn();
    await render(<Button label="שמירה" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'שמירה' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('is blocked while disabled or loading', async () => {
    const onPress = jest.fn();
    await render(
      <>
        <Button label="מושבת" disabled onPress={onPress} />
        <Button label="נשלח" loading onPress={onPress} />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'מושבת' }));
    await fireEvent.press(screen.getByRole('button', { name: 'נשלח' }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'מושבת' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'נשלח' })).toBeBusy();
  });
});

describe('StarRating', () => {
  it('reports the tapped star', async () => {
    const onChange = jest.fn();
    await render(<StarRating value={0} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: '4 כוכבים' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('is read-only without onChange', async () => {
    await render(<StarRating value={3} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByLabelText('3 מתוך 5 כוכבים')).toBeOnTheScreen();
  });
});

describe('EmptyState', () => {
  it('renders title, message and action', async () => {
    await render(
      <EmptyState
        icon={CakeSlice}
        art="cakes"
        title="עוד אין מאפים"
        message="תהיו הראשונים"
        action={<Button label="פרסום מאפה" />}
      />,
    );
    expect(screen.getByText('עוד אין מאפים')).toBeOnTheScreen();
    expect(screen.getByText('תהיו הראשונים')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'פרסום מאפה' })).toBeOnTheScreen();
  });
});
