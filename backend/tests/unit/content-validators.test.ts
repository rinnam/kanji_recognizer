import { describe, expect, it } from 'vitest';
import { addLessonMaterialLinkSchema } from '../../src/validators/lesson.js';
import { extractYouTubeVideoId } from '../../src/validators/shadowing.js';

describe('shadowing and lesson validators', () => {
  it('extractYouTubeVideoId extracts 11-char IDs from URLs and raw IDs', () => {
    expect(extractYouTubeVideoId('SmxSCZzV7j0')).toBe('SmxSCZzV7j0');
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=SbfEPD4BuLs&t=12s')).toBe(
      'SbfEPD4BuLs',
    );
    expect(extractYouTubeVideoId('https://youtu.be/kWl7muWnuM0?si=abc')).toBe('kWl7muWnuM0');
    expect(extractYouTubeVideoId('youtube.com/shorts/SmxSCZzV7j0')).toBe('SmxSCZzV7j0');
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/SbfEPD4BuLs')).toBe('SbfEPD4BuLs');
    expect(extractYouTubeVideoId('https://example.com/not-youtube')).toBeNull();
    expect(extractYouTubeVideoId('invalid')).toBeNull();
  });

  it('addLessonMaterialLinkSchema normalizes Drive links without protocol and rejects javascript URLs', () => {
    const drive = addLessonMaterialLinkSchema.parse({
      title: 'Tài liệu Google Drive',
      externalUrl: 'drive.google.com/file/d/123456/view?usp=sharing',
      description: '',
    });
    expect(drive.externalUrl).toBe('https://drive.google.com/file/d/123456/view?usp=sharing');

    expect(() =>
      addLessonMaterialLinkSchema.parse({
        title: 'Bad',
        externalUrl: 'javascript:alert(1)',
        description: '',
      }),
    ).toThrow();
  });
});
