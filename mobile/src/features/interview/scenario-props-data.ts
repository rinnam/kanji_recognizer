export interface MenuDish {
  id: string;
  nameJa: string;
  reading: string;
  meaningVi: string;
  priceYen: number;
  category: 'main' | 'drink';
  tags: string[];
}

export const WASHOKU_MENU: MenuDish[] = [
  {
    id: 'sake_teishoku',
    nameJa: '鮭定食',
    reading: 'さけていしょく',
    meaningVi: 'Set cơm cá hồi nướng muối',
    priceYen: 1100,
    category: 'main',
    tags: ['Đề xuất'],
  },
  {
    id: 'katsudon',
    nameJa: 'カツ丼',
    reading: 'かつどん',
    meaningVi: 'Cơm thịt heo chiên xù trứng',
    priceYen: 980,
    category: 'main',
    tags: ['Trứng'],
  },
  {
    id: 'spicy_ramen',
    nameJa: '辛口味噌ラーメン',
    reading: 'からくちみそらーめん',
    meaningVi: 'Mì Ramen Miso cay',
    priceYen: 950,
    category: 'main',
    tags: ['Cay'],
  },
  {
    id: 'seafood_tempura',
    nameJa: '海鮮天ぷら盛り合わせ',
    reading: 'かいせんてんぷらもりあわせ',
    meaningVi: 'Tempura hải sản tổng hợp',
    priceYen: 1350,
    category: 'main',
    tags: ['Tôm / Hải sản'],
  },
  {
    id: 'veggie_tempura',
    nameJa: '野菜天ぷら定食',
    reading: 'やさいてんぷらていしょく',
    meaningVi: 'Set Tempura rau củ thanh đạm',
    priceYen: 1050,
    category: 'main',
    tags: ['Chay được'],
  },
  {
    id: 'oolong',
    nameJa: 'ウーロン茶',
    reading: 'うーろんちゃ',
    meaningVi: 'Trà Ô-long lạnh/nóng',
    priceYen: 300,
    category: 'drink',
    tags: [],
  },
  {
    id: 'beer',
    nameJa: '生ビール',
    reading: 'なまびーる',
    meaningVi: 'Bia tươi Nhật',
    priceYen: 550,
    category: 'drink',
    tags: ['Có cồn'],
  },
  {
    id: 'matcha_ice',
    nameJa: '抹茶アイス',
    reading: 'まっちゃあいす',
    meaningVi: 'Kem trà xanh Matcha',
    priceYen: 420,
    category: 'drink',
    tags: ['Tráng miệng'],
  },
];

export interface SprintTaskItem {
  id: string;
  title: string;
  status: 'DONE' | 'AT_RISK' | 'TODO';
  progressPct: number;
  note: string;
}

export const HORENSO_SPRINT_TASKS: SprintTaskItem[] = [
  {
    id: 't1',
    title: 'Giao diện Đăng nhập & Hồ sơ (ログイン画面)',
    status: 'DONE',
    progressPct: 100,
    note: 'Hoàn thành đúng hạn, đã qua review.',
  },
  {
    id: 't2',
    title: 'API Thanh toán & Đồng bộ (決済API)',
    status: 'AT_RISK',
    progressPct: 65,
    note: 'Gặp bug timeout ở môi trường staging, nguy cơ chậm 1 ngày.',
  },
  {
    id: 't3',
    title: 'Viết Unit Test tích hợp (単体テスト)',
    status: 'TODO',
    progressPct: 20,
    note: 'Dự kiến hoàn thiện sau khi sửa xong bug API.',
  },
];

export const HORENSO_PROPOSALS = [
  'Phương án A: Xin lùi deadline 1 ngày (đến chiều mai) để fix triệt để và test kỹ.',
  'Phương án B: Nhờ anh Tanaka hỗ trợ review chung 1 tiếng tối nay để kịp release.',
];

export const CLINIC_QUICK_SYMPTOMS = [
  { ja: '熱があります（38度くらい）', vi: 'Bị sốt (~38 độ)' },
  { ja: '喉が痛くて、咳が出ます', vi: 'Đau họng và ho' },
  { ja: '自転車で転んで、右足を強く打ちました', vi: 'Ngã xe đạp, đau/nghi gãy chân phải' },
  { ja: 'お腹が痛くて、吐き気がします', vi: 'Đau bụng và buồn nôn' },
  { ja: '薬のアレルギーはありません', vi: 'Không dị ứng thuốc' },
];
