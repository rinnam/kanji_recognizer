import type { FastifyReply, FastifyRequest } from 'fastify';
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
  const folder = await folderService.createFolder(input);
  await reply.code(201).send(folder);
}

export async function list(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const query = listFoldersQuerySchema.parse(req.query);
  const folders = await folderService.listFolders(query);
  await reply.send({ data: folders });
}

export async function getOne(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = folderIdParamSchema.parse(req.params);
  const folder = await folderService.getFolder(id);
  await reply.send(folder);
}

export async function patch(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = folderIdParamSchema.parse(req.params);
  const input = updateFolderSchema.parse(req.body);
  const folder = await folderService.updateFolder(id, input);
  await reply.send(folder);
}

export async function remove(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = folderIdParamSchema.parse(req.params);
  const folder = await folderService.deleteFolder(id);
  await reply.send(folder);
}
