import { useState, type ReactElement } from 'react';
import { FolderTree } from '../../features/folder-tree';
import { EmptyState } from '../../shared/ui';
import './LibraryPage.css';

/** Trang Thư viện: cây thư mục (F1) ở sidebar; Overview + Quick Add (F2) ở vùng chính. */
export function LibraryPage(): ReactElement {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  return (
    <section className="kn-library" aria-labelledby="library-heading">
      <h2 id="library-heading" className="kn-library__heading">
        Thư viện
      </h2>
      <div className="kn-library__body">
        <aside className="kn-library__sidebar" aria-label="Thư mục">
          <FolderTree selectedId={selectedFolderId} onSelect={setSelectedFolderId} />
        </aside>
        <div className="kn-library__main">
          <EmptyState
            title="Danh sách từ vựng"
            description={
              selectedFolderId === null
                ? 'Overview + Quick Add sẽ hiện ở đây (F2). Đang xem: tất cả từ.'
                : 'Overview + Quick Add sẽ hiện ở đây (F2). Đang xem một thư mục đã chọn.'
            }
          />
        </div>
      </div>
    </section>
  );
}
