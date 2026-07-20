import { auth, storage } from './firebase';
import { ref, getDownloadURL as sdkGetDownloadURL, uploadBytes as sdkUploadBytes } from 'firebase/storage';

export async function webUploadFile(path: string, blob: Blob): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const token = await user.getIdToken(true);
  const bucket = 'familiesenter-837bb.firebasestorage.app';
  const encodedPath = encodeURIComponent(path);

  const res = await fetch(
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodedPath}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': blob.type || 'application/octet-stream',
      },
      body: blob,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed (${res.status}): ${err}`);
  }

  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
}

export async function webGetDownloadURL(path: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const token = await user.getIdToken(true);
  const bucket = 'familiesenter-837bb.firebasestorage.app';
  const encodedPath = encodeURIComponent(path);

  const res = await fetch(
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Download URL failed (${res.status}): ${err}`);
  }

  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
}

export async function webFetchAsBlob(url: string): Promise<Blob> {
  const user = auth.currentUser;
  const headers: Record<string, string> = {};

  if (user) {
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.blob();
}
