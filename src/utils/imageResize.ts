import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export async function resizeImage(uri: string, maxSize = 512, quality = 0.7): Promise<string> {
  if (!uri || uri.startsWith('http') || uri.startsWith('blob:')) return uri;
  try {
    const rendered = await ImageManipulator.manipulate(uri).resize({ width: maxSize }).renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality });
    rendered.release();
    return result.uri;
  } catch (e) {
    console.log('resizeImage failed, using original:', e);
    return uri;
  }
}
