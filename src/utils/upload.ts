export const uriToBlob = (uri: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (typeof fetch !== 'undefined') {
      fetch(uri)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status}`);
          }
          return response.blob();
        })
        .then((blob) => {
          if (blob.size === 0) {
            throw new Error('Blob is empty');
          }
          resolve(blob);
        })
        .catch(() => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(xhr.response);
            } else {
              reject(new Error(`XHR failed: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('XHR request failed'));
          xhr.open('GET', uri);
          xhr.responseType = 'blob';
          xhr.send();
        });
    } else {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject(new Error(`XHR failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('XHR request failed'));
      xhr.open('GET', uri);
      xhr.responseType = 'blob';
      xhr.send();
    }
  });
};
