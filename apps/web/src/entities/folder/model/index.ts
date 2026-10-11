export type { LocalFolder, CreateFolderInput, UpdateFolderInput } from './types';
export {
  getAllFoldersLocal,
  getFolderLocal,
  putFolderLocal,
  putFoldersLocal,
  deleteFolderLocal,
  countFolders,
} from './folder.local';
export {
  normalizeFolderName,
  isFolderNameTaken,
  findDuplicateSiblingIds,
  compareFolders,
  folderPath,
  rootFolderId,
  folderOptions,
} from '@kanji-nest/core';
export type { FolderOption } from '@kanji-nest/core';
