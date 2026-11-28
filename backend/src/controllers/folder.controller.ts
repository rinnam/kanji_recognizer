import type { FastifyReply, FastifyRequest } from 'fastify';
import { extractBearerUser } from '../services/auth.service.js';
import * as folderService from '../services/folder.service.js';
import {
  createFolderSchema,
  folderIdParamSchema,
  listFoldersQuerySchema,
  updateFolderSchema,
} from '../validators/folder.js';

export async function create(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const input = createFolderSchema.parse(req.body);
  const user = extractBearerUser(req.headers.authorization);
  const folder = await folderService.createFolder(input, user?.id);
  await reply.code(201).send(folder);
}

export async function list(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const query = listFoldersQuerySchema.parse(req.query);
  const user = extractBearerUser(req.headers.authorization);
  const folders = await folderService.listFolders(query, user?.id);
  await reply.send({ data: folders });
}

export async function getOne(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = folderIdParamSchema.parse(req.params);
  const user = extractBearerUser(req.headers.authorization);
  const folder = await folderService.getFolder(id, user?.id);
  await reply.send(folder);
}

export async function patch(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = folderIdParamSchema.parse(req.params);
  const input = updateFolderSchema.parse(req.body);
  const user = extractBearerUser(req.headers.authorization);
  const folder = await folderService.updateFolder(id, input, user?.id);
  await reply.send(folder);
}

export async function remove(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = folderIdParamSchema.parse(req.params);
  const user = extractBearerUser(req.headers.authorization);
  const folder = await folderService.deleteFolder(id, user?.id);
  await reply.send(folder);
}
