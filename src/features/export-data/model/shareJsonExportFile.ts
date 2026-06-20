import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { AppError } from '@shared/lib/errors';

interface ShareJsonExportInput {
  contents: string;
  fileNamePrefix: string;
  dialogTitle: string;
}

export interface SharedJsonExportFile {
  fileName: string;
  uri: string;
}

const jsonMimeType = 'application/json';

export const shareJsonExportFile = async (input: ShareJsonExportInput): Promise<SharedJsonExportFile> => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new AppError('File storage is not available', 'export.fileStorageUnavailable');
  }

  const exportDirectory = `${documentDirectory}exports/`;
  await FileSystem.makeDirectoryAsync(exportDirectory, { intermediates: true });

  const fileName = `${sanitizeFileName(input.fileNamePrefix)}-${formatFileTimestamp(new Date())}.json`;
  const uri = `${exportDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, input.contents, { encoding: FileSystem.EncodingType.UTF8 });

  if (!(await Sharing.isAvailableAsync())) {
    throw new AppError(`File saved, but sharing is not available: ${uri}`, 'export.sharingUnavailable');
  }

  await Sharing.shareAsync(uri, {
    dialogTitle: input.dialogTitle,
    mimeType: jsonMimeType,
    UTI: 'public.json',
  });

  return { fileName, uri };
};

const sanitizeFileName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'workout-export';

const formatFileTimestamp = (date: Date): string =>
  date.toISOString().replace(/[:.]/g, '-');
