import type { FastifyReply, FastifyRequest } from 'fastify';
import { fetchJapaneseTts } from '../services/tts.service.js';
import { ttsQuerySchema } from '../validators/tts.js';

export async function getTtsAudio(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const query = ttsQuerySchema.parse(req.query);

  const audio = await fetchJapaneseTts(query.text);
  if (!audio) {
    void reply.code(502).send({
      error: 'BadGateway',
      message: 'Không thể tải âm thanh phát âm từ dịch vụ TTS',
    });
    return;
  }

  void reply
    .type(audio.contentType)
    .header('Cache-Control', 'public, max-age=604800, immutable')
    .send(audio.buffer);
}
