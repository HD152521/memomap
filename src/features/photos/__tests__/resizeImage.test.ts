import { ImageManipulator } from 'expo-image-manipulator';

import { resizeImage, targetSize } from '../resizeImage';

const manipulate = ImageManipulator.manipulate as jest.Mock;

describe('targetSize', () => {
  test('keeps images whose long edge is within the limit', () => {
    expect(targetSize(1200, 900)).toBeNull();
    expect(targetSize(1600, 1600)).toBeNull();
  });

  test('scales the long edge down to 1600 keeping the ratio', () => {
    expect(targetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(targetSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });
});

describe('resizeImage', () => {
  beforeEach(() => {
    manipulate.mockClear();
    manipulate('warmup').resize.mockClear();
    manipulate.mockClear();
  });

  test('resizes large images and saves as compressed JPEG', async () => {
    const result = await resizeImage('file:///big.jpg', 4000, 3000);

    const context = manipulate.mock.results[0].value;
    expect(manipulate).toHaveBeenCalledWith('file:///big.jpg');
    expect(context.resize).toHaveBeenCalledWith({ width: 1600, height: 1200 });
    expect(result).toEqual({ uri: 'file:///resized.jpg', width: 1600, height: 1200 });
  });

  test('re-encodes small images without resizing', async () => {
    await resizeImage('file:///small.jpg', 800, 600);

    const context = manipulate.mock.results[0].value;
    expect(context.resize).not.toHaveBeenCalled();
  });
});
