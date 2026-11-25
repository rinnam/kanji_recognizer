const GOOGLE_HANDWRITING_URL =
  'https://inputtools.google.com/request?itc=ja-t-i0-handwrit&app=translate';

export async function recognizeKanjiStrokes(strokes: number[][][]): Promise<string[]> {
  if (!Array.isArray(strokes) || strokes.length === 0) return [];

  const ink: [number[], number[]][] = [];
  for (const stroke of strokes) {
    if (!Array.isArray(stroke) || stroke.length === 0) continue;
    const xs: number[] = [];
    const ys: number[] = [];
    for (const pt of stroke) {
      if (Array.isArray(pt) && pt.length >= 2) {
        xs.push(Math.round(Number(pt[0]) || 0));
        ys.push(Math.round(Number(pt[1]) || 0));
      }
    }
    if (xs.length > 0) {
      ink.push([xs, ys]);
    }
  }

  if (ink.length === 0) return [];

  const body = {
    options: 'enable_pre_space',
    requests: [
      {
        writing_guide: {
          writing_area_width: 300,
          writing_area_height: 300,
        },
        ink,
        language: 'ja',
      },
    ],
  };

  const response = await fetch(GOOGLE_HANDWRITING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as unknown;
  if (
    Array.isArray(data) &&
    data[0] === 'SUCCESS' &&
    Array.isArray(data[1]) &&
    Array.isArray(data[1][0]) &&
    Array.isArray(data[1][0][1])
  ) {
    return (data[1][0][1] as unknown[])
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, 12);
  }

  return [];
}
