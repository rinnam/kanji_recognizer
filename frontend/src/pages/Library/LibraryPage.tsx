import { useEffect, useState, type ReactElement } from 'react';
import { countFolders } from '../../entities/folder';
import { countVocabularies } from '../../entities/vocabulary';
import { useDb } from '../../shared/db';
import { EmptyState } from '../../shared/ui';

interface Counts {
  folders: number;
  vocabularies: number;
}

/** Trang Thư viện — khung cho folder-tree (F1) và Overview + Quick Add (F2). */
export function LibraryPage(): ReactElement {
  const db = useDb();
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([countFolders(db), countVocabularies(db)])
      .then(([folders, vocabularies]) => {
        if (active) setCounts({ folders, vocabularies });
      })
      .catch(() => {
        if (active) setCounts({ folders: 0, vocabularies: 0 });
      });
    return () => {
      active = false;
    };
  }, [db]);

  const description =
    counts === null
      ? 'Đang đọc kho cục bộ…'
      : `${counts.folders} thư mục · ${counts.vocabularies} từ vựng. Cây thư mục (F1) và danh sách + Quick Add (F2) sẽ hiện ở đây.`;

  return (
    <section aria-labelledby="library-heading">
      <h2 id="library-heading">Thư viện</h2>
      <EmptyState title="Thư viện từ vựng" description={description} />
    </section>
  );
}
