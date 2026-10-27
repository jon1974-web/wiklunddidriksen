// Type declarations for the platform-specific TripDocumentUpload component.
// Implementations: TripDocumentUpload.native.tsx (expo-image-picker), TripDocumentUpload.web.tsx (file input)
import type { FC } from 'react';

interface TripDocumentUploadProps {
  tripId: string;
  onUploaded: (url: string, fileName: string) => void;
}

export declare const TripDocumentUpload: FC<TripDocumentUploadProps>;
