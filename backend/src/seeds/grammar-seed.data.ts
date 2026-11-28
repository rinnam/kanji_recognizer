export interface GrammarSeedExample {
  ja: string;
  reading: string;
  vi: string;
}

export interface GrammarSeedPoint {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  category: string;
  pattern: string;
  structure: string;
  meaningVi: string;
  nuanceVi: string;
  examples: GrammarSeedExample[];
}

export interface GrammarSeedStarSentence {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  meaningVi: string;
  prefixJa: string;
  suffixJa: string;
  parts: [string, string, string, string];
  starIndex: 0 | 1 | 2 | 3;
  explanationVi: string;
}

export interface GrammarSeedBlitzQuestion {
  id: string;
  kind: 'particle' | 'conjugation';
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  promptMain: string;
  promptSub: string;
  meaningVi: string;
  correct: string;
  choices: [string, string, string, string];
  tipVi: string;
}

export const INITIAL_GRAMMAR_POINTS: readonly GrammarSeedPoint[] = [
  {
    "id": "n5_masu_tai",
    "level": "N5",
    "category": "state_attitude",
    "pattern": "〜たいです",
    "structure": "Vます (bỏ ます) + たいです",
    "meaningVi": "Muốn làm gì đó (nguyện vọng của bản thân)",
    "nuanceVi": "Chỉ dùng trực tiếp cho ngôi 1 (tôi) hoặc hỏi ngôi 2. Với ngôi 3 dùng 〜たがっている.",
    "examples": [
      {
        "ja": "日本へ行きたいです。",
        "reading": "にほんへいきたいです。",
        "vi": "Tôi muốn đi Nhật."
      },
      {
        "ja": "おいしい寿司が食べたいです。",
        "reading": "おいしいすしがたべたいです。",
        "vi": "Tôi muốn ăn sushi ngon."
      }
    ]
  },
  {
    "id": "n5_te_kudasai",
    "level": "N5",
    "category": "state_attitude",
    "pattern": "〜てください",
    "structure": "Vて + ください",
    "meaningVi": "Hãy vui lòng làm ~ (nhờ vả, chỉ dẫn lịch sự)",
    "nuanceVi": "Thể て đứng trước ください dùng phổ biến trong lớp học, nhà hàng, hướng dẫn khách hàng.",
    "examples": [
      {
        "ja": "ここに名前を書いてください。",
        "reading": "ここになまえをかいてください。",
        "vi": "Xin vui lòng viết tên vào đây."
      },
      {
        "ja": "もう少しゆっくり話してください。",
        "reading": "もうすこしゆっくりはなしてください。",
        "vi": "Xin hãy nói chậm lại một chút."
      }
    ]
  },
  {
    "id": "n5_kara_reason",
    "level": "N5",
    "category": "cause_result",
    "pattern": "〜から / 〜ので (Lý do)",
    "structure": "Câu ngắn / Thể thường + から · ので",
    "meaningVi": "Vì... nên...",
    "nuanceVi": "から mang sắc thái chủ quan của người nói; ので khách quan, mềm mại và lịch sự hơn khi xin phép.",
    "examples": [
      {
        "ja": "今日は雨が降っているから、家にいます。",
        "reading": "きょうはあめがふっているから、いえにいます。",
        "vi": "Vì hôm nay trời mưa nên tôi ở nhà."
      },
      {
        "ja": "熱があるので、早退してもいいですか。",
        "reading": "ねつがあるので、そうたいしてもいいですか。",
        "vi": "Vì bị sốt nên tôi xin phép về sớm được không ạ?"
      }
    ]
  },
  {
    "id": "n5_te_mo_ii",
    "level": "N5",
    "category": "state_attitude",
    "pattern": "〜てもいいですか",
    "structure": "Vて + もいいですか",
    "meaningVi": "Tôi làm ~ có được không?",
    "nuanceVi": "Cấu trúc xin phép lịch sự chuẩn mực; phủ định không được phép là 〜てはいけません.",
    "examples": [
      {
        "ja": "ここで写真を撮ってもいいですか。",
        "reading": "ここでしゃしんをとってもいいですか。",
        "vi": "Tôi chụp ảnh ở đây có được không?"
      },
      {
        "ja": "ペンを使ってもいいですか。",
        "reading": "ペンをつかってもいいですか。",
        "vi": "Tôi dùng cây bút này được không?"
      }
    ]
  },
  {
    "id": "n5_nakute_wa_ikemasen",
    "level": "N5",
    "category": "state_attitude",
    "pattern": "〜なければなりません",
    "structure": "Vない (bỏ い) + ければなりません",
    "meaningVi": "Phải làm ~ (nghĩa vụ, quy định)",
    "nuanceVi": "Văn nói hay rút gọn thành 〜なくちゃ / 〜なきゃ. Đừng nhầm với 〜なくてもいい (không cần cũng được).",
    "examples": [
      {
        "ja": "毎日薬を飲まなければなりません。",
        "reading": "まいにちくすりをのまなければなりません。",
        "vi": "Mỗi ngày tôi phải uống thuốc."
      },
      {
        "ja": "明日は朝早く起きなければなりません。",
        "reading": "あしたはあさはやくおきなければなりません。",
        "vi": "Ngày mai tôi phải dậy sớm."
      }
    ]
  },
  {
    "id": "n5_ta_koto_ga_aru",
    "level": "N5",
    "category": "time_sequence",
    "pattern": "〜たことがあります",
    "structure": "Vた + ことがあります",
    "meaningVi": "Đã từng làm ~ (kinh nghiệm quá khứ)",
    "nuanceVi": "Chỉ dùng Vた cho trải nghiệm từng xảy ra ít nhất 1 lần. Nếu dùng Vる + ことがある nghĩa là \"thỉnh thoảng có khi\".",
    "examples": [
      {
        "ja": "富士山に登ったことがあります。",
        "reading": "ふじさんにのぼったことがあります。",
        "vi": "Tôi đã từng leo núi Phú Sĩ."
      },
      {
        "ja": "納豆を食べたことがありません。",
        "reading": "なっとうをたべたことがありません。",
        "vi": "Tôi chưa từng ăn natto bao giờ."
      }
    ]
  },
  {
    "id": "n4_te_miru",
    "level": "N4",
    "category": "purpose_habit",
    "pattern": "〜てみる",
    "structure": "Vて + みる",
    "meaningVi": "Thử làm ~ xem sao",
    "nuanceVi": "Diễn tả hành động làm thử để kiểm chứng kết quả hoặc trải nghiệm mới.",
    "examples": [
      {
        "ja": "この靴を履いてみてもいいですか。",
        "reading": "このくつをはいてみてもいいですか。",
        "vi": "Tôi đi thử đôi giày này được không?"
      },
      {
        "ja": "自分で作ってみたら、意外と簡単だった。",
        "reading": "じぶんでつくってみたら、意外とかんたんだった。",
        "vi": "Thử tự làm thì thấy dễ bất ngờ."
      }
    ]
  },
  {
    "id": "n4_te_shimau",
    "level": "N4",
    "category": "state_attitude",
    "pattern": "〜てしまう",
    "structure": "Vて + しまう (khẩu ngữ: ちゃう / じゃう)",
    "meaningVi": "Lỡ làm mất / Làm hoàn tất xong xuôi",
    "nuanceVi": "Mang 2 sắc thái rõ: tiếc nuối ngoài ý muốn (lỡ quên ví) hoặc hoàn thành dứt điểm (đọc hết quyển sách).",
    "examples": [
      {
        "ja": "電車に傘を忘れてしまいました。",
        "reading": "でんしゃにかさをわすれてしまいました。",
        "vi": "Tôi lỡ để quên ô trên tàu mất rồi."
      },
      {
        "ja": "宿題を全部やってしまいました。",
        "reading": "しゅくだいをぜんぶやってしまいました。",
        "vi": "Tôi đã làm xong hết toàn bộ bài tập rồi."
      }
    ]
  },
  {
    "id": "n4_koto_ni_suru",
    "level": "N4",
    "category": "purpose_habit",
    "pattern": "〜ことにする / 〜ことになる",
    "structure": "Vる / Vない + ことにする · ことになる",
    "meaningVi": "Quyết định làm ~ (tự chọn) / Được quyết định thành ~ (khách quan)",
    "nuanceVi": "Cặp hay bẫy đề thi: ことにする do bản thân chủ ý quyết định; ことになる là quy định công ty, hoàn cảnh đưa tới.",
    "examples": [
      {
        "ja": "健康のために、毎日走ることにしました。",
        "reading": "けんこうのために、まいにちはしることにしました。",
        "vi": "Vì sức khỏe, tôi quyết định chạy bộ mỗi ngày."
      },
      {
        "ja": "来月から大阪へ転勤することになりました。",
        "reading": "らいげつからおおさかへてんきんすることになりました。",
        "vi": "Theo quyết định, tháng sau tôi sẽ chuyển công tác sang Osaka."
      }
    ]
  },
  {
    "id": "n4_you_da_sou_da",
    "level": "N4",
    "category": "inference_quote",
    "pattern": "〜そうだ (Nghe nói vs Trông có vẻ)",
    "structure": "Vる/A (thể thường) + そうだ (nghe nói) · Vます/A(bỏ い) + そうだ (trông có vẻ)",
    "meaningVi": "Nghe nói rằng ~ / Trông có vẻ sắp ~",
    "nuanceVi": "Phân biệt bằng cách chia: nguyên thể đi với そうだ là truyền đạt lại thông tin; gốc Vます/tính từ bỏ い là nhìn trực giác.",
    "examples": [
      {
        "ja": "天気予報によると、明日は寒いそうです。",
        "reading": "てんきよほうによると、あしたはさむいそうです。",
        "vi": "Theo dự báo thời tiết thì nghe nói ngày mai trời lạnh."
      },
      {
        "ja": "このケーキ、とてもおいしそうですね。",
        "reading": "このけーき、とてもおいしそうですね。",
        "vi": "Cái bánh này trông có vẻ ngon quá nhỉ."
      }
    ]
  },
  {
    "id": "n4_ba_condition",
    "level": "N4",
    "category": "condition_scope",
    "pattern": "〜ば (Điều kiện)",
    "structure": "V (cột え) + ば · Aい → ければ · N/Na → なら",
    "meaningVi": "Nếu ~ thì...",
    "nuanceVi": "Nêu điều kiện giả định chung (\"Nếu luyện tập mỗi ngày thì sẽ giỏi\"). Vế sau thường không đi với mệnh lệnh nếu vế trước cùng chủ ngữ hành động.",
    "examples": [
      {
        "ja": "毎日練習すれば、必ず上手になります。",
        "reading": "まいにちれんしゅうすれば、かならずじょうずになります。",
        "vi": "Nếu luyện tập mỗi ngày, chắc chắn sẽ giỏi lên."
      },
      {
        "ja": "時間がなければ、タクシーで行きましょう。",
        "reading": "じかんがなければ、たくしーでいきましょう。",
        "vi": "Nếu không có thời gian thì đi taxi nhé."
      }
    ]
  },
  {
    "id": "n4_keigo_basic",
    "level": "N4",
    "category": "state_attitude",
    "pattern": "お〜になります / 〜ております",
    "structure": "お + Vます + になります (Tôn kính) · Vて + おります (Khiêm nhường)",
    "meaningVi": "Ngài làm ~ (nâng người đối diện) / Tôi đang ~ (hạ mình lịch sự)",
    "nuanceVi": "Cực kỳ quan trọng khi đi phỏng vấn và họp Horenso tại công ty Nhật!",
    "examples": [
      {
        "ja": "社長はもうお帰りになりましたか。",
        "reading": "しゃちょうはもうおかえりになりましたか。",
        "vi": "Giám đốc đã về rồi ạ?"
      },
      {
        "ja": "ただいま資料を作成しております。",
        "reading": "ただいましりょうをさくせいしております。",
        "vi": "Hiện tôi đang soạn tài liệu ạ."
      }
    ]
  },
  {
    "id": "n3_ts_uchi_ni",
    "level": "N3",
    "category": "time_sequence",
    "pattern": "〜うちに",
    "structure": "Vる / Vている / Vない / Aい / Aな + な / Nの + うちに",
    "meaningVi": "Tranh thủ lúc còn ~ / Trong lúc đang ~ (thì xảy ra biến đổi)",
    "nuanceVi": "Thường hàm ý trạng thái hiện tại sắp kết thúc nên cần tranh thủ làm ngay, hoặc một thay đổi tự nhiên diễn ra trong lúc đang làm A.",
    "examples": [
      {
        "ja": "忘れないうちに、メモしておきます。",
        "reading": "わすれないうちに、めもしておきます。",
        "vi": "Tranh thủ lúc chưa quên, tôi sẽ ghi chú lại."
      },
      {
        "ja": "音楽を聴いているうちに、眠ってしまった。",
        "reading": "おんがくをきいているうちに、ねむってしまった。",
        "vi": "Trong lúc đang nghe nhạc thì tôi ngủ thiếp đi lúc nào không hay."
      }
    ]
  },
  {
    "id": "n3_ts_aida_ni",
    "level": "N3",
    "category": "time_sequence",
    "pattern": "〜間 / 〜間に",
    "structure": "Vている / Nの + 間（に）",
    "meaningVi": "Trong suốt khoảng thời gian ~ (間) / Tranh thủ một lúc nào đó trong khoảng ~ (間に)",
    "nuanceVi": "間 đi với hành động kéo dài suốt khoảng đó; 間に đi với hành động diễn ra chớp nhoáng trong khoảng thời gian ấy.",
    "examples": [
      {
        "ja": "夏休みの間、ずっと実家で過ごした。",
        "reading": "なつやすみのあいだ、ずっとじっかですごした。",
        "vi": "Suốt kỳ nghỉ hè, tôi ở nhà bố mẹ suốt."
      },
      {
        "ja": "子どもが寝ている間に、晩ご飯を作ろう。",
        "reading": "こどもがねているあいだに、ばんごはんをつくろう。",
        "vi": "Tranh thủ lúc con đang ngủ, nấu bữa tối thôi."
      }
    ]
  },
  {
    "id": "n3_ts_saichuu_ni",
    "level": "N3",
    "category": "time_sequence",
    "pattern": "〜最中に（さいちゅうに）",
    "structure": "Vている / Nの + 最中に",
    "meaningVi": "Đúng ngay lúc đang ~ cao trào (thì có sự việc bất ngờ chen vào)",
    "nuanceVi": "Vế sau thường là sự cố bất ngờ, gián đoạn hoặc điều không mong đợi xảy ra đúng cao điểm.",
    "examples": [
      {
        "ja": "大事な会議の最中に、携帯が鳴ってしまった。",
        "reading": "だいじなかいぎのさいちゅうに、けいたいがなってしまった。",
        "vi": "Đúng lúc cuộc họp quan trọng đang diễn ra thì điện thoại lại reo mất."
      },
      {
        "ja": "ご飯を食べている最中に、地震が起きた。",
        "reading": "ごはんをたべているさいちゅうに、じしんがおきた。",
        "vi": "Đúng lúc đang ăn cơm thì động đất xảy ra."
      }
    ]
  },
  {
    "id": "n3_ts_te_kara_de_naito",
    "level": "N3",
    "category": "time_sequence",
    "pattern": "〜てからでないと / 〜てからでなければ",
    "structure": "Vて + からでないと（〜ない）",
    "meaningVi": "Nếu không làm A xong trước thì không thể làm B",
    "nuanceVi": "Vế sau gần như luôn là câu phủ định hoặc mang nghĩa chưa thể thực hiện được.",
    "examples": [
      {
        "ja": "両親と相談してからでないと、決められません。",
        "reading": "りょうしんとそうだんしてからでないと、きめられません。",
        "vi": "Nếu chưa bàn bạc với bố mẹ trước thì tôi chưa thể quyết định được."
      },
      {
        "ja": "実物を見てからでなければ、買わないつもりだ。",
        "reading": "じつぶつをみてからでなければ、かわないつもりだ。",
        "vi": "Nếu chưa xem tận mắt thì tôi định không mua."
      }
    ]
  },
  {
    "id": "n3_ts_ta_bakari",
    "level": "N3",
    "category": "time_sequence",
    "pattern": "〜たばかり",
    "structure": "Vた + ばかりだ",
    "meaningVi": "Vừa mới làm xong ~ (theo cảm nhận của người nói)",
    "nuanceVi": "Khác với 〜たところ (vừa mới tính bằng phút/giây): 〜たばかり có thể dùng cho \"vừa mới tháng trước\" nếu người nói thấy vẫn còn mới.",
    "examples": [
      {
        "ja": "先月日本に来たばかりなので、まだ道が分かりません。",
        "reading": "せんげつにほんにきたばかりなので、まだみちがわかりません。",
        "vi": "Vì mới sang Nhật tháng trước thôi nên tôi vẫn chưa rành đường."
      },
      {
        "ja": "このパソコンは先週買ったばかりなのに、壊れた。",
        "reading": "このぱそこんはせんしゅうかったばかりなのに、こわれた。",
        "vi": "Máy tính này vừa mới mua tuần trước thế mà đã hỏng."
      }
    ]
  },
  {
    "id": "n3_ts_tokoro",
    "level": "N3",
    "category": "time_sequence",
    "pattern": "〜るところ / 〜ているところ / 〜たところ",
    "structure": "Vる / Vている / Vた + ところだ",
    "meaningVi": "Sắp sửa làm ~ / Đang đúng lúc làm ~ / Vừa mới làm xong ~",
    "nuanceVi": "Nhấn mạnh thời điểm chính xác ngay trước, ngay giữa hoặc ngay sau khi hành động vừa dứt.",
    "examples": [
      {
        "ja": "これから昼ご飯を食べるところです。",
        "reading": "これからひるごはんをたべるところです。",
        "vi": "Ngay bây giờ tôi chuẩn bị ăn trưa đây."
      },
      {
        "ja": "今、家に着いたところです。",
        "reading": "いま、いえについたところです。",
        "vi": "Tôi vừa mới về tới nhà tức thì."
      }
    ]
  },
  {
    "id": "n3_ts_tsuide_ni",
    "level": "N3",
    "category": "time_sequence",
    "pattern": "〜ついでに",
    "structure": "Vる / Vた / Nの + ついでに",
    "meaningVi": "Nhân tiện lúc làm A thì làm luôn B",
    "nuanceVi": "Hành động A là việc chính, hành động B chỉ là việc phụ làm kèm cho đỡ tốn công.",
    "examples": [
      {
        "ja": "スーパーへ行くついでに、手紙を出してきます。",
        "reading": "すーぱーへいくついでに、てがみをだしてきます。",
        "vi": "Nhân tiện đi siêu thị tôi gửi thư luôn."
      },
      {
        "ja": "散歩のついでに、パンを買ってきた。",
        "reading": "さんぽのついでに、ぱんをかってきた。",
        "vi": "Nhân lúc đi dạo tôi mua bánh mì về luôn."
      }
    ]
  },
  {
    "id": "n3_ts_tabi_ni",
    "level": "N3",
    "category": "time_sequence",
    "pattern": "〜たびに",
    "structure": "Vる / Nの + たびに",
    "meaningVi": "Mỗi lần ~ thì lại ~",
    "nuanceVi": "Diễn tả sự lặp lại có quy luật: cứ hễ A xảy ra lần nào là B lại xảy ra theo.",
    "examples": [
      {
        "ja": "この曲を聴くたびに、高校時代を思い出す。",
        "reading": "このきょくをきくたびに、こうこうじだいをおもいだす。",
        "vi": "Mỗi lần nghe bài hát này tôi lại nhớ về thời cấp 3."
      },
      {
        "ja": "出張のたびに、お土産を買って帰ります。",
        "reading": "しゅっちょうのたびに、おみやげをかってかえります。",
        "vi": "Mỗi lần đi công tác tôi đều mua quà về."
      }
    ]
  },
  {
    "id": "n3_ts_te_irai",
    "level": "N3",
    "category": "time_sequence",
    "pattern": "〜て以来（ていらい）",
    "structure": "Vて + 以来",
    "meaningVi": "Kể từ sau khi ~ đến nay (suốt thời gian đó)",
    "nuanceVi": "Nhấn mạnh trạng thái kéo dài liên tục không đổi từ mốc sự kiện trong quá khứ đến hiện tại.",
    "examples": [
      {
        "ja": "大学を卒業して以来、一度も彼に会っていない。",
        "reading": "だいがくをそつぎょうしていらい、いちどもかれにあっていない。",
        "vi": "Kể từ khi tốt nghiệp đại học đến giờ tôi chưa gặp lại anh ấy lần nào."
      },
      {
        "ja": "日本へ来て以来、毎日自炊しています。",
        "reading": "にほんへきていらい、まいにちじすいしています。",
        "vi": "Từ khi sang Nhật tới giờ ngày nào tôi cũng tự nấu ăn."
      }
    ]
  },
  {
    "id": "n3_ts_ka_to_omou_to",
    "level": "N3",
    "category": "time_sequence",
    "pattern": "〜かと思うと / 〜かと思ったら",
    "structure": "Vた + かと思うと · かと思ったら",
    "meaningVi": "Vừa mới tưởng ~ xong thì thoắt cái đã ~",
    "nuanceVi": "Diễn tả hai việc nối tiếp bất ngờ, thay đổi nhanh ngoài dự đoán của người nói (không dùng cho hành động chủ ý của bản thân).",
    "examples": [
      {
        "ja": "さっきまで晴れていたかと思うと、急に雨が降り出した。",
        "reading": "さっきまではれていたかとおもうと、きゅうにあめがふりだした。",
        "vi": "Vừa mới nắng ráo ban nãy xong mà thoắt cái trời đã đổ mưa."
      },
      {
        "ja": "子どもが静かになったかと思ったら、もう寝ていた。",
        "reading": "こどもがしずかになったかとおもったら、もうねていた。",
        "vi": "Vừa thấy con im ắng chút mà quay lại đã thấy ngủ mất rồi."
      }
    ]
  },
  {
    "id": "n3_ts_te_hajimete",
    "level": "N3",
    "category": "time_sequence",
    "pattern": "〜てはじめて",
    "structure": "Vて + はじめて",
    "meaningVi": "Sau khi trải qua ~ thì lần đầu tiên mới nhận ra/biết được...",
    "nuanceVi": "Nhấn mạnh bước ngoặt nhận thức: trước đó chưa từng hiểu, nhờ có A mới ngộ ra B.",
    "examples": [
      {
        "ja": "一人暮らしをしてはじめて、親のありがたみが分かった。",
        "reading": "ひとりぐらしをしてはじめて、おやのありがたみがわかった。",
        "vi": "Sống tự lập một mình rồi mới lần đầu thấu hiểu công ơn bố mẹ."
      },
      {
        "ja": "病気になってはじめて、健康の大切さに気づく。",
        "reading": "びょうきになってはじめて、けんこうのたいせつさにきづく。",
        "vi": "Đến khi đổ bệnh mới nhận ra sức khỏe quý giá nhường nào."
      }
    ]
  },
  {
    "id": "n3_cr_okage_sei",
    "level": "N3",
    "category": "cause_result",
    "pattern": "〜おかげで vs 〜せいで",
    "structure": "Thể thường (Aな/Nの) + おかげで · せいで",
    "meaningVi": "Nhờ có ~ (kết quả tốt) vs Tại vì ~ (kết quả xấu)",
    "nuanceVi": "おかげで bày tỏ lòng biết ơn vì kết quả tích cực; せいで mang sắc thái đổ lỗi cho nguyên nhân dẫn tới chuyện không hay.",
    "examples": [
      {
        "ja": "先生のおかげで、N3に合格できました。",
        "reading": "せんせいのおかげで、えぬさんにごうかくできました。",
        "vi": "Nhờ có thầy/cô mà tôi đã đỗ N3."
      },
      {
        "ja": "台風のせいで、飛行機が欠航になった。",
        "reading": "たいふうのせいで、ひこうきがけっこうになった。",
        "vi": "Tại bão mà chuyến bay bị hủy mất rồi."
      }
    ]
  },
  {
    "id": "n3_cr_tame_ni",
    "level": "N3",
    "category": "cause_result",
    "pattern": "〜ため（に）(Nguyên nhân)",
    "structure": "V/A/Aな/Nの + ため（に）",
    "meaningVi": "Bởi vì / Do nguyên nhân ~ nên...",
    "nuanceVi": "Trang trọng hơn から / ので, thường dùng trong tin tức, thông báo nguyên nhân sự cố hoặc lý do khách quan.",
    "examples": [
      {
        "ja": "大雪のため、電車が遅れております。",
        "reading": "おおゆきのため、でんしゃがおくれております。",
        "vi": "Do tuyết rơi dày nên tàu điện đang bị chậm."
      },
      {
        "ja": "事故があったために、道が渋滞している。",
        "reading": "じこがあったために、みちがじゅうたいしている。",
        "vi": "Vì có tai nạn nên đường đang kẹt cứng."
      }
    ]
  },
  {
    "id": "n3_cr_ni_yotte",
    "level": "N3",
    "category": "cause_result",
    "pattern": "〜によって / 〜による",
    "structure": "N + によって（động từ）/ による + N",
    "meaningVi": "Tùy thuộc vào ~ / Do, bởi (tác nhân, phương pháp)",
    "nuanceVi": "Có 4 cách dùng chuẩn N3: tùy theo ai/cái gì, do ai sáng tác/tạo ra, bằng phương thức nào, nguyên nhân (bị động).",
    "examples": [
      {
        "ja": "国によって、食事のマナーが違います。",
        "reading": "くにによって、しょくじのまなーがちがいます。",
        "vi": "Tùy từng quốc gia mà phép lịch sự bàn ăn khác nhau."
      },
      {
        "ja": "この小説は有名な作家によって書かれた。",
        "reading": "このしょうせつはゆうめいなさっかによってかかれた。",
        "vi": "Cuốn tiểu thuyết này được viết bởi một tác giả nổi tiếng."
      }
    ]
  },
  {
    "id": "n3_cr_koto_kara",
    "level": "N3",
    "category": "cause_result",
    "pattern": "〜ことから",
    "structure": "V/A (thể thường) · N + である + ことから",
    "meaningVi": "Từ việc / Vì dấu hiệu ~ mà suy ra hoặc đặt tên...",
    "nuanceVi": "Dùng khi nêu căn cứ dẫn đến tên gọi hoặc suy luận hợp lý.",
    "examples": [
      {
        "ja": "見た目が星に似ていることから、スターフルーツと呼ばれる。",
        "reading": "みためがほしににていることから、すたーふるーつとよばれる。",
        "vi": "Vì bề ngoài giống ngôi sao nên được gọi là quả khế (star fruit)."
      },
      {
        "ja": "玄関の電気が消えていることから、留守だと分かった。",
        "reading": "げんかんのでんきがけえていることから、るすだとわかった。",
        "vi": "Từ việc đèn hiên tắt nên biết là không có ai ở nhà."
      }
    ]
  },
  {
    "id": "n3_cr_amari",
    "level": "N3",
    "category": "cause_result",
    "pattern": "〜あまり（に）",
    "structure": "Vる / Vた / Aな + な / Nの + あまり（に）",
    "meaningVi": "Vì quá mức ~ đến nỗi dẫn đến phản ứng khác thường",
    "nuanceVi": "Thường đi với cảm xúc mãnh liệt (lo lắng quá, vui quá, hồi hộp quá) khiến vế sau mất kiểm soát hoặc hành động cực đoan.",
    "examples": [
      {
        "ja": "緊張のあまり、スピーチの内容を忘れてしまった。",
        "reading": "きんちょうのあまり、すぴーちのないようをわすれてしまった。",
        "vi": "Vì quá hồi hộp nên tôi quên mất nội dung bài phát biểu."
      },
      {
        "ja": "うれしさのあまり、思わず涙が出た。",
        "reading": "うれしさのあまり、おもわずなみだがでた。",
        "vi": "Vì quá vui mừng mà bất giác rơi nước mắt."
      }
    ]
  },
  {
    "id": "n3_cr_te_tamaranai",
    "level": "N3",
    "category": "cause_result",
    "pattern": "〜てたまらない / 〜てしょうがない",
    "structure": "Vて / Aくて / Aなで + たまらない · しょうがない",
    "meaningVi": "Quá ~ đến mức không chịu nổi nữa",
    "nuanceVi": "Diễn tả cảm giác cơ thể hoặc tâm trạng mãnh liệt (nhớ nhà, đau răng, nóng bức) vượt ngưỡng chịu đựng.",
    "examples": [
      {
        "ja": "久しぶりに家族の声が聞けて、うれしくてたまらない。",
        "reading": "ひさしぶりにかぞくのこえがきけて、うれしくてたまらない。",
        "vi": "Lâu rồi mới nghe giọng gia đình nên vui không tả xiết."
      },
      {
        "ja": "試験の結果が気になってしょうがない。",
        "reading": "しけんのけっかがきになってしょうがない。",
        "vi": "Tôi cứ thấp thỏm lo kết quả thi không yên được."
      }
    ]
  },
  {
    "id": "n3_cr_zu_ni_wa_irarenai",
    "level": "N3",
    "category": "cause_result",
    "pattern": "〜ずにはいられない",
    "structure": "Vない (bỏ ない) + ずにはいられない (する → せずにはいられない)",
    "meaningVi": "Không thể kìm lòng mà không làm ~ / Bắt buộc tự nhiên phải làm",
    "nuanceVi": "Do cảm xúc hoặc thói quen thôi thúc từ bên trong khiến bản thân không thể nhịn được (nhịn cười không nổi, không thể không lo).",
    "examples": [
      {
        "ja": "あの動画を見ると、笑わずにはいられない。",
        "reading": "あのどうがをみると、わらわずにはいられない。",
        "vi": "Cứ xem video đó là không nhịn cười được."
      },
      {
        "ja": "友人が困っていたら、助けずにはいられない。",
        "reading": "ゆうじんがこまっていたら、たすけずにはいられない。",
        "vi": "Thấy bạn gặp khó khăn thì không thể đứng nhìn mà không giúp."
      }
    ]
  },
  {
    "id": "n3_cr_wake_da",
    "level": "N3",
    "category": "cause_result",
    "pattern": "〜わけだ",
    "structure": "Thể thường (Aな/Nの・な) + わけだ",
    "meaningVi": "Thảo nào / Hóa ra là ~ / Tính ra là ~ (kết luận đương nhiên)",
    "nuanceVi": "Nhấn mạnh sự thấu hiểu \"à, hèn gì...\" khi biết nguyên nhân hoặc tổng hợp dữ kiện.",
    "examples": [
      {
        "ja": "彼は日本人の母がいるから、日本語が上手なわけだ。",
        "reading": "かれはにほんじんのははがいるから、にほんごがじょうずなわけだ。",
        "vi": "Mẹ anh ấy là người Nhật nên thảo nào tiếng Nhật giỏi thế."
      },
      {
        "ja": "5%割引ということは、950円で買えるわけですね。",
        "reading": "ごぱーせんとわりびきということは、きゅうひゃくごじゅうえんでかえるわけですね。",
        "vi": "Giảm 5% tức là tính ra mua được với giá 950 yên nhỉ."
      }
    ]
  },
  {
    "id": "n3_cr_kekka",
    "level": "N3",
    "category": "cause_result",
    "pattern": "〜結果（として）",
    "structure": "Vた / Nの + 結果（として）",
    "meaningVi": "Kết quả là sau quá trình dài làm ~ thì...",
    "nuanceVi": "Đi sau một quá trình thử nghiệm, điều tra, cố gắng lâu dài để chốt lại kết cục thực tế.",
    "examples": [
      {
        "ja": "いろいろ調べた結果、この方法が最適だと分かった。",
        "reading": "いろいろしらべたけっか、このほうほうがさいてきだとわかった。",
        "vi": "Kết quả sau khi tìm hiểu nhiều cách, tôi thấy phương pháp này tối ưu nhất."
      },
      {
        "ja": "会議で話し合った結果、計画を延期することになった。",
        "reading": "かいぎではなしあったけっか、けいかくをえんきすることになった。",
        "vi": "Sau khi bàn bạc trong cuộc họp, kết quả là kế hoạch sẽ dời lại."
      }
    ]
  },
  {
    "id": "n3_cr_kara_niwa",
    "level": "N3",
    "category": "cause_result",
    "pattern": "〜からには / 〜以上（は）",
    "structure": "Vる / Vた / A / Nである + からには · 以上は",
    "meaningVi": "Một khi đã ~ thì đương nhiên phải ~",
    "nuanceVi": "Vế sau luôn mang ý chí mạnh mẽ, lời khuyên, nghĩa vụ hoặc sự quyết tâm (\"Đã tham gia thì phải thắng\").",
    "examples": [
      {
        "ja": "日本へ留学するからには、N2以上を取りたい。",
        "reading": "にほんへりゅうがくするからには、えぬにいじょうをとりたい。",
        "vi": "Một khi đã du học Nhật thì tôi muốn lấy từ N2 trở lên."
      },
      {
        "ja": "約束した以上は、最後まで責任を持ってやります。",
        "reading": "やくそくしたいじょうは、さいごまでせきにんをもってやります。",
        "vi": "Đã hứa rồi thì tôi sẽ chịu trách nhiệm làm tới cùng."
      }
    ]
  },
  {
    "id": "n3_ph_tame_vs_you_ni",
    "level": "N3",
    "category": "purpose_habit",
    "pattern": "〜ために vs 〜ように (Mục đích)",
    "structure": "Vる(ý chí) / Nの + ために · Vる(khả năng/vô ý)/Vない + ように",
    "meaningVi": "Để (đạt được mục tiêu gì đó)...",
    "nuanceVi": "Cặp kinh điển đề thi N3: ために dùng với động từ kiểm soát được; ように dùng với động từ khả năng, trạng thái hoặc Vない.",
    "examples": [
      {
        "ja": "マイホームを買うために、毎月貯金している。",
        "reading": "まいほーむをかうために、まいつきちょきんしている。",
        "vi": "Tôi tiết kiệm mỗi tháng để mua nhà riêng."
      },
      {
        "ja": "漢字が読めるように、アプリで毎日練習している。",
        "reading": "かんじがよめるように、あぷりでまいにちれんしゅうしている。",
        "vi": "Để có thể đọc được Kanji, tôi luyện trên app mỗi ngày."
      }
    ]
  },
  {
    "id": "n3_ph_you_ni_suru",
    "level": "N3",
    "category": "purpose_habit",
    "pattern": "〜ようにする",
    "structure": "Vる / Vない + ようにする",
    "meaningVi": "Cố gắng duy trì thực hiện / Cố gắng tránh không làm ~",
    "nuanceVi": "Nhấn mạnh nỗ lực ý thức hàng ngày để hình thành thói quen tốt.",
    "examples": [
      {
        "ja": "毎日30分は日本語を聞くようにしています。",
        "reading": "まいにちさんじゅっぷんはにほんごをきくようにしています。",
        "vi": "Tôi cố gắng duy trì nghe tiếng Nhật ít nhất 30 phút mỗi ngày."
      },
      {
        "ja": "寝る前にスマホを見ないようにしたいです。",
        "reading": "ねるまえにすまほをみないようにしたいです。",
        "vi": "Tôi muốn cố gắng không xem điện thoại trước khi ngủ."
      }
    ]
  },
  {
    "id": "n3_ph_you_ni_naru",
    "level": "N3",
    "category": "purpose_habit",
    "pattern": "〜ようになる",
    "structure": "Vる (thường là khả năng) / Vない + ようになる",
    "meaningVi": "Trở nên có thể làm được ~ / Bắt đầu có thói quen thay đổi sang ~",
    "nuanceVi": "Diễn tả sự biến đổi trạng thái theo thời gian: trước đây không biết/không làm, bây giờ đã làm được.",
    "examples": [
      {
        "ja": "3か月練習して、字幕なしでアニメが分かるようになった。",
        "reading": "さんかげつれんしゅうして、じまくなしであにめがわかるようになった。",
        "vi": "Luyện 3 tháng xong, giờ tôi đã hiểu anime không cần phụ đề rồi."
      },
      {
        "ja": "最近、野菜をたくさん食べるようになりました。",
        "reading": "さいきん、やさいをたくさんたべるようになりました。",
        "vi": "Gần đây tôi đã bắt đầu ăn được nhiều rau hơn rồi."
      }
    ]
  },
  {
    "id": "n3_ph_you_ni_iu",
    "level": "N3",
    "category": "purpose_habit",
    "pattern": "〜ように言う / 〜ように頼む",
    "structure": "Vる / Vない + ように + 言う · 頼む · 注意する",
    "meaningVi": "Bảo / Nhờ / Nhắc nhở ai đó hãy làm (hoặc đừng làm) ~",
    "nuanceVi": "Dạng câu tường thuật gián tiếp mệnh lệnh hoặc lời khuyên trong công việc và đời sống.",
    "examples": [
      {
        "ja": "医者に「毎日水をよく飲むように」と言われました。",
        "reading": "いしゃにまいにちみずをよくのむようにといわれました。",
        "vi": "Bác sĩ dặn tôi mỗi ngày phải uống nhiều nước."
      },
      {
        "ja": "部下にミスを繰り返さないように注意した。",
        "reading": "ぶかにみすをくりかえさないようにちゅういした。",
        "vi": "Tôi đã nhắc nhở cấp dưới đừng lặp lại lỗi sai đó nữa."
      }
    ]
  },
  {
    "id": "n3_ph_koto_ni_shite_iru",
    "level": "N3",
    "category": "purpose_habit",
    "pattern": "〜ことにしている",
    "structure": "Vる / Vない + ことにしている",
    "meaningVi": "Giữ nguyên tắc bản thân là luôn ~ (thói quen tự đặt ra)",
    "nuanceVi": "Khác ことにした (quyết định mới 1 lần), ことにしている diễn tả kỷ luật cá nhân đang duy trì đều đặn.",
    "examples": [
      {
        "ja": "朝起きたら、まずコップ一杯の水を飲むことにしている。",
        "reading": "あさおきたら、まずこっぷいっぱいのみずをのむことにしている。",
        "vi": "Sáng ngủ dậy, tôi giữ thói quen luôn uống một cốc nước trước."
      },
      {
        "ja": "夜10時以降は甘いものを食べないことにしています。",
        "reading": "よるじゅうじいこうはあまいものをたべないことにしています。",
        "vi": "Tôi đặt quy tắc không ăn đồ ngọt sau 10 giờ tối."
      }
    ]
  },
  {
    "id": "n3_ph_koto_ni_natte_iru",
    "level": "N3",
    "category": "purpose_habit",
    "pattern": "〜ことになっている",
    "structure": "Vる / Vない + ことになっている",
    "meaningVi": "Theo quy định / lịch trình đã ấn định thì ~",
    "nuanceVi": "Diễn tả nội quy công ty, luật lệ trường học hoặc kế hoạch chung không phải do một mình bản thân đặt.",
    "examples": [
      {
        "ja": "この部屋では靴を脱ぐことになっています。",
        "reading": "このへやではくつをぬぐことになっています。",
        "vi": "Theo quy định thì ở phòng này phải cởi giày."
      },
      {
        "ja": "来週の金曜日に会議を開くことになっている。",
        "reading": "らいしゅうのきんようびにかいぎをひらくことになっている。",
        "vi": "Theo lịch đã chốt thì thứ Sáu tuần sau sẽ mở cuộc họp."
      }
    ]
  },
  {
    "id": "n3_ph_you_to_suru",
    "level": "N3",
    "category": "purpose_habit",
    "pattern": "〜ようとする",
    "structure": "V意向形 (thể ý định) + とする",
    "meaningVi": "Định làm ~ / Đang toan bắt tay vào làm ~ / Cố gắng làm ~",
    "nuanceVi": "Khi dùng dạng 〜ようとしたとき (đúng lúc định làm thì...); phủ định 〜ようとしない = nhất quyết không chịu thử/làm.",
    "examples": [
      {
        "ja": "家を出ようとしたとき、急に雨が降り始めた。",
        "reading": "いえをでようとしたとき、きゅうにあめがふりだした。",
        "vi": "Đúng lúc tôi định bước ra khỏi nhà thì trời đột ngột đổ mưa."
      },
      {
        "ja": "彼は失敗を恐れて、挑戦しようとしない。",
        "reading": "かれはしっぱいをおそれて、ちょうせんしようとしない。",
        "vi": "Anh ta sợ thất bại nên chẳng chịu thử thách gì cả."
      }
    ]
  },
  {
    "id": "n3_ph_te_oku",
    "level": "N3",
    "category": "purpose_habit",
    "pattern": "〜ておく",
    "structure": "Vて + おく (khẩu ngữ: 〜とく / 〜どく)",
    "meaningVi": "Làm sẵn trước để chuẩn bị cho việc sau / Giữ nguyên trạng thái",
    "nuanceVi": "Văn nói người Nhật cực hay rút gọn ておく thành とく (見ておく → 見とく).",
    "examples": [
      {
        "ja": "試験の前に、重要単語を復習しておきます。",
        "reading": "しけんのまえに、じゅうようたんごをふくしゅうしておきます。",
        "vi": "Trước kỳ thi tôi sẽ ôn sẵn các từ vựng trọng tâm."
      },
      {
        "ja": "次の人が使うから、電気はつけておいてね。",
        "reading": "つぎのひとがつかうから、でんきはつけておいてね。",
        "vi": "Người tiếp theo sẽ dùng nên cứ để nguyên đèn bật vậy nhé."
      }
    ]
  },
  {
    "id": "n3_ph_tsumori",
    "level": "N3",
    "category": "purpose_habit",
    "pattern": "〜つもりだ / 〜つもりはない",
    "structure": "Vる / Vない + つもりだ (hoặc Vたつもり = tự cho là đã ~)",
    "meaningVi": "Dự định làm ~ / Không hề có ý định ~",
    "nuanceVi": "Chú ý nghĩa N3: Vた + つもり mang nghĩa \"cứ ngỡ là mình đã làm xong / giả vờ như...\" nhưng thực tế không hẳn vậy.",
    "examples": [
      {
        "ja": "相手を傷つけるつもりはまったくありませんでした。",
        "reading": "あいてをきずつけるつもりはまったくありませんでした。",
        "vi": "Tôi hoàn toàn không hề có ý định làm đối phương tổn thương."
      },
      {
        "ja": "覚えたつもりだったのに、テストで書けなかった。",
        "reading": "おぼえたつもりだったのに、てすとでかけなかった。",
        "vi": "Cứ đinh ninh là nhớ kỹ rồi thế mà lúc thi lại không viết được."
      }
    ]
  },
  {
    "id": "n3_ph_te_miseru",
    "level": "N3",
    "category": "purpose_habit",
    "pattern": "〜てみせる",
    "structure": "Vて + みせる",
    "meaningVi": "Làm cho ai đó thấy tận mắt / Quyết tâm làm bằng được để chứng minh",
    "nuanceVi": "Khác với 〜てみる (làm thử xem sao), 〜てみせる thể hiện ý chí mạnh mẽ \"tôi nhất định làm được cho xem\".",
    "examples": [
      {
        "ja": "次のJLPTには絶対に合格してみせます。",
        "reading": "つぎのじぇーえるぴーてぃーにはぜったいにごうかくしてみせます。",
        "vi": "Kỳ JLPT tới tôi nhất định sẽ thi đỗ cho mọi người xem."
      },
      {
        "ja": "先輩が新人の前で手本をやってみせた。",
        "reading": "せんぱいがしんじんのまえでてほんをやってみせた。",
        "vi": "Tiền bối đã làm mẫu trước mặt nhân viên mới."
      }
    ]
  },
  {
    "id": "n3_cs_ba_hodo",
    "level": "N3",
    "category": "condition_scope",
    "pattern": "〜ば〜ほど",
    "structure": "Vば + Vる + ほど · Aければ + Aい + ほど · Naなら + Naな + ほど",
    "meaningVi": "Càng ~ thì lại càng ~",
    "nuanceVi": "Nhớ lặp lại cùng một động từ hoặc tính từ ở hai vế (練習すれば練習するほど / 安ければ安いほど).",
    "examples": [
      {
        "ja": "日本語は勉強すればするほど、おもしろくなります。",
        "reading": "にほんごはべんきょうすればするほど、おもしろくなります。",
        "vi": "Tiếng Nhật càng học càng thấy thú vị."
      },
      {
        "ja": "電車は駅から近ければ近いほど便利です。",
        "reading": "でんしゃはえきからちかければちかいほどべんりです。",
        "vi": "Nhà càng gần ga thì càng tiện lợi."
      }
    ]
  },
  {
    "id": "n3_cs_sae_ba",
    "level": "N3",
    "category": "condition_scope",
    "pattern": "〜さえ〜ば",
    "structure": "N（+ trợ từ）+ さえ + Vば / Aければ / Nなら",
    "meaningVi": "Chỉ cần có duy nhất điều kiện ~ thì mọi thứ khác đều ổn",
    "nuanceVi": "Nhấn mạnh điều kiện tối thiểu duy nhất; với Vます + さえ + すれば cũng dùng rất nhiều.",
    "examples": [
      {
        "ja": "毎日15分さえ練習すれば、漢字は覚えられます。",
        "reading": "まいにちじゅうごふんさえれんしゅうすれば、かんじはおぼえられます。",
        "vi": "Chỉ cần luyện 15 phút mỗi ngày thôi là có thể nhớ được Kanji."
      },
      {
        "ja": "健康でさえあれば、ほかは何もいらない。",
        "reading": "けんこうでさえあれば、ほかなにもいらない。",
        "vi": "Chỉ cần khỏe mạnh là chẳng cần gì thêm nữa."
      }
    ]
  },
  {
    "id": "n3_cs_to_shitara",
    "level": "N3",
    "category": "condition_scope",
    "pattern": "〜としたら / 〜とすれば",
    "structure": "V/A/Aな/N (thể thường) + としたら · とすれば",
    "meaningVi": "Giả sử nếu đúng là ~ thì...",
    "nuanceVi": "Đặt một giả thiết thuần tưởng tượng hoặc dựa vào điều người khác vừa nói để suy luận tiếp.",
    "examples": [
      {
        "ja": "もし1か月休みがあるとしたら、どこへ行きたいですか。",
        "reading": "もしいっかげつやすみがあるとしたら、どこへいきたいですか。",
        "vi": "Giả sử nếu có 1 tháng nghỉ phép thì bạn muốn đi đâu?"
      },
      {
        "ja": "それが本当だとすれば、大変な問題だ。",
        "reading": "それがほんとうだとすれば、たいへんなもんだいだ。",
        "vi": "Nếu điều đó là sự thật thì đây là vấn đề lớn đấy."
      }
    ]
  },
  {
    "id": "n3_cs_nara",
    "level": "N3",
    "category": "condition_scope",
    "pattern": "〜なら（ば）",
    "structure": "V/A/N (thể thường, không thêm だ) + なら",
    "meaningVi": "Nếu nói về chủ đề ~ thì tôi khuyên / thì nên...",
    "nuanceVi": "Tiếp nhận chủ đề đối phương vừa nhắc tới để đưa ra gợi ý hoặc lời khuyên hợp lý nhất.",
    "examples": [
      {
        "ja": "ラーメンを食べるなら、駅前の店が一番おいしいですよ。",
        "reading": "らーめんをたべるなら、えきまえのみせがいちばんおいしいですよ。",
        "vi": "Nếu đi ăn ramen thì quán trước ga là ngon nhất đấy."
      },
      {
        "ja": "使わないなら、電源を切ってください。",
        "reading": "つかわないなら、でんげんをきってください。",
        "vi": "Nếu không dùng thì hãy tắt nguồn đi nhé."
      }
    ]
  },
  {
    "id": "n3_cs_tatoe_temo",
    "level": "N3",
    "category": "condition_scope",
    "pattern": "〜たとえ〜ても",
    "structure": "たとえ + Vて / Aくて / N・Naで + も",
    "meaningVi": "Cho dù giả sử có ~ đi chăng nữa thì vẫn...",
    "nuanceVi": "Từ phó từ たとえ ở đầu mệnh đề điều kiện nhượng bộ nhấn mạnh quyết tâm không lay chuyển ở vế sau.",
    "examples": [
      {
        "ja": "たとえ失敗しても、諦めずに挑戦し続けます。",
        "reading": "たとえしっぱいしても、あきらめずにちょうせんしつづけます。",
        "vi": "Cho dù có thất bại đi nữa tôi cũng không bỏ cuộc mà sẽ tiếp tục thử thách."
      },
      {
        "ja": "たとえ時間がかかっても、正しい発音を身につけたい。",
        "reading": "たとえじかんがかかっても、ただしいはつおんをみにつけたい。",
        "vi": "Dù có tốn thời gian đi nữa tôi cũng muốn nắm chắc phát âm chuẩn."
      }
    ]
  },
  {
    "id": "n3_cs_kagiri",
    "level": "N3",
    "category": "condition_scope",
    "pattern": "〜かぎり（は）",
    "structure": "Vる / Vている / Nの + かぎり（は）",
    "meaningVi": "Trong phạm vi còn ~ / Hết mức khả năng ~",
    "nuanceVi": "Có 2 sắc thái: điều kiện duy trì (\"chừng nào còn sống...\") và giới hạn phạm vi (\"theo như tôi biết thì...\").",
    "examples": [
      {
        "ja": "私が知っているかぎり、彼はまだ帰国していない。",
        "reading": "わたしがしっているかぎり、かれはまだきこくしていない。",
        "vi": "Theo như những gì tôi biết thì anh ấy vẫn chưa về nước."
      },
      {
        "ja": "体力が続くかぎり、スポーツを続けたい。",
        "reading": "たいりょくがつづくかぎり、すぽーつをつづけたい。",
        "vi": "Chừng nào thể lực còn cho phép thì tôi vẫn muốn chơi thể thao."
      }
    ]
  },
  {
    "id": "n3_cs_hodo",
    "level": "N3",
    "category": "condition_scope",
    "pattern": "〜ほど (Mức độ & So sánh)",
    "structure": "Vる / Aい / N + ほど",
    "meaningVi": "Đến mức như ~ / Không đến nỗi bằng ~ (với phủ định)",
    "nuanceVi": "Khi đi với phủ định (今年は去年ほど暑くない) là mẫu so sánh kinh điển N4–N3.",
    "examples": [
      {
        "ja": "涙が出るほど笑いました。",
        "reading": "なみだがでるほどわらいました。",
        "vi": "Tôi cười đến mức chảy cả nước mắt."
      },
      {
        "ja": "今日のテストは、思っていたほど難しくなかった。",
        "reading": "きょうのてすとは、おもっていたほどむずかしくなかった。",
        "vi": "Bài kiểm tra hôm nay không khó như tôi đã tưởng."
      }
    ]
  },
  {
    "id": "n3_cs_kurai",
    "level": "N3",
    "category": "condition_scope",
    "pattern": "〜くらい / 〜ぐらい",
    "structure": "V/A (thể thường) / N + くらい（だ）",
    "meaningVi": "Đến cỡ như ~ / Ít nhất cũng cỡ như ~ (xem nhẹ)",
    "nuanceVi": "Có thể biểu thị mức độ cao (\"mệt đến mức không đứng nổi\") hoặc xem là việc nhỏ (\"ít ra một tiếng chào cũng nói được chứ\").",
    "examples": [
      {
        "ja": "声が枯れるくらい応援しました。",
        "reading": "こえがかれるくらいおうえんしました。",
        "vi": "Tôi đã cổ vũ đến mức khản cả giọng."
      },
      {
        "ja": "忙しくても、メールに返信するくらいできるはずだ。",
        "reading": "いそがしくても、めーるにへんしんするくらいできるはずだ。",
        "vi": "Dù bận thì ít ra việc trả lời email cũng làm được chứ nhỉ."
      }
    ]
  },
  {
    "id": "n3_cs_bakari",
    "level": "N3",
    "category": "condition_scope",
    "pattern": "〜ばかり（だ）",
    "structure": "N + ばかり · Vて + ばかりいる · Vる + ばかりだ (xu hướng xấu)",
    "meaningVi": "Toàn là ~ / Cứ mải mê làm ~ / Ngày càng đi xuống ~",
    "nuanceVi": "Cần phân biệt Vたばかり (vừa mới) với Vてばかりいる (toàn làm chuyện xấu) và Vるばかりだ (ngày càng tăng/tệ hơn).",
    "examples": [
      {
        "ja": "弟はゲームをしてばかりいて、全然勉強しない。",
        "reading": "おとうとはげーむをしてばかりいて、ぜんぜんべんきょうしない。",
        "vi": "Em trai toàn chơi game suốt, chẳng chịu học hành gì."
      },
      {
        "ja": "物価が上がるばかりで、生活が大変だ。",
        "reading": "ぶっかがあがるばかりで、せいかつがたいへんだ。",
        "vi": "Vật giá chỉ toàn tăng lên mãi, cuộc sống thật vất vả."
      }
    ]
  },
  {
    "id": "n3_cs_dake_de_naku",
    "level": "N3",
    "category": "condition_scope",
    "pattern": "〜だけでなく / 〜ばかりでなく",
    "structure": "V/A/Aな(な)/N + だけでなく",
    "meaningVi": "Không chỉ ~ mà còn ~ nữa",
    "nuanceVi": "Nối 2 điểm cộng hoặc 2 thông tin tăng tiến (thường kết hợp với 〜も ở vế sau).",
    "examples": [
      {
        "ja": "このお店はおいしいだけでなく、値段も手頃だ。",
        "reading": "このおみせはおいしいだけでなく、ねだんもてごろだ。",
        "vi": "Quán này không chỉ ngon mà giá cả cũng rất phải chăng."
      },
      {
        "ja": "彼女は英語ばかりでなく、日本語も流暢に話せる。",
        "reading": "かのじょはえいごばかりでなく、にほんごもりゅうちょうにはなせる。",
        "vi": "Cô ấy không chỉ tiếng Anh mà cả tiếng Nhật cũng nói lưu loát."
      }
    ]
  },
  {
    "id": "n3_cs_kara_ni_kakete",
    "level": "N3",
    "category": "condition_scope",
    "pattern": "〜から〜にかけて",
    "structure": "N1 (thời gian/địa điểm) + から + N2 + にかけて",
    "meaningVi": "Từ ~ kéo dài cho đến khoảng ~ (không có ranh giới sắc nét)",
    "nuanceVi": "Khác 〜から〜まで (mốc chính xác): 〜から〜にかけて dùng cho vùng không gian/thời gian ước lượng (mùa mưa, dải miền Trung).",
    "examples": [
      {
        "ja": "今夜から明日の朝にかけて、強い雨が降る見込みです。",
        "reading": "こんやからあしたのあさにかけて、つよいあめがふるみこみです。",
        "vi": "Dự kiến từ đêm nay đến sáng mai sẽ có mưa lớn."
      },
      {
        "ja": "4月から5月にかけて、桜や新緑が美しい季節だ。",
        "reading": "しがつからごがつにかけて、さくらやしんりょくがうつくしいきせつだ。",
        "vi": "Khoảng từ tháng 4 sang tháng 5 là mùa hoa anh đào và lá non tuyệt đẹp."
      }
    ]
  },
  {
    "id": "n3_ct_nagara",
    "level": "N3",
    "category": "contrast",
    "pattern": "〜ながら（も）",
    "structure": "Vます / Aい / Aな / N + ながら（も）",
    "meaningVi": "Tuy rằng ~ thế nhưng vẫn ~",
    "nuanceVi": "Nghĩa nhượng bộ N3 rất hay gặp trong nhận xét đánh giá lịch sự (nhỏ nhưng tiện, tiếc nhưng đành vậy).",
    "examples": [
      {
        "ja": "狭いながらも、日当たりがよくて快適な部屋だ。",
        "reading": "せまいながらも、ひあたりがよくてかいてきなへやだ。",
        "vi": "Tuy hơi chật nhưng phòng đón nắng tốt và rất thoải mái."
      },
      {
        "ja": "残念ながら、今回はご期待に添えません。",
        "reading": "ざんねんながら、こんかいはごきたいにそえません。",
        "vi": "Tuy rất tiếc nhưng lần này chúng tôi chưa thể đáp ứng kỳ vọng của quý vị."
      }
    ]
  },
  {
    "id": "n3_ct_monono",
    "level": "N3",
    "category": "contrast",
    "pattern": "〜ものの",
    "structure": "V/A/Aな(な)/Nである + ものの",
    "meaningVi": "Tuy đã/đúng là ~ nhưng thực tế lại chưa như mong đợi",
    "nuanceVi": "Thừa nhận sự thật ở vế trước, rồi nêu thực tế trái ngược hoặc còn thiếu sót ở vế sau (văn viết lịch sự hơn が/けれど).",
    "examples": [
      {
        "ja": "運転免許を取ったものの、まだ一人で運転できない。",
        "reading": "うんてんめんきょをとったものの、まだひとりでうんてんできない。",
        "vi": "Tuy đã lấy bằng lái xe rồi nhưng tôi vẫn chưa dám tự lái một mình."
      },
      {
        "ja": "春になったものの、朝晩はまだ肌寒い。",
        "reading": "はるになったものの、あさばんはまだはだざむい。",
        "vi": "Tuy đã sang xuân nhưng sáng sớm và tối vẫn còn se lạnh."
      }
    ]
  },
  {
    "id": "n3_ct_kuseni",
    "level": "N3",
    "category": "contrast",
    "pattern": "〜くせに",
    "structure": "V/A(thể thường) · Aな+な · Nの + くせに",
    "meaningVi": "Vậy mà / Thế mà lại... (chê trách, mỉa mai)",
    "nuanceVi": "KHÔNG dùng cho bản thân hay để khen ngợi! Luôn mang thái độ bực bội, chê bai đối phương (biết mà giả vờ, chưa làm đòi nói).",
    "examples": [
      {
        "ja": "自分もできないくせに、人のミスばかり注意する。",
        "reading": "じぶんもできないくせに、ひとのみすばかりちゅういする。",
        "vi": "Bản thân cũng có làm được đâu thế mà suốt ngày soi lỗi người khác."
      },
      {
        "ja": "本当は知っているくせに、教えてくれなかった。",
        "reading": "ほんとうはしっているくせに、おしえてくれなかった。",
        "vi": "Biết rõ mười mươi thế mà chẳng chịu chỉ cho tôi."
      }
    ]
  },
  {
    "id": "n3_ct_wari_ni",
    "level": "N3",
    "category": "contrast",
    "pattern": "〜わりに（は）",
    "structure": "V/A(thể thường) · Aな+な · Nの + わりに（は）",
    "meaningVi": "So với mặt bằng / điều kiện ~ thì (bất ngờ hơn/tệ hơn tưởng)",
    "nuanceVi": "So với tiêu chuẩn chung rút ra từ vế A, kết quả vế B gây ngạc nhiên (rẻ mà ngon bất ngờ, ăn nhiều mà vẫn gầy).",
    "examples": [
      {
        "ja": "このレストランは値段のわりに、ボリュームがすごい。",
        "reading": "このれすとらんはねだんのわりに、ぼりゅーむがすごい。",
        "vi": "Nhà hàng này so với mức giá thì phần ăn nhiều bất ngờ."
      },
      {
        "ja": "よく食べるわりに、全然太らないんですね。",
        "reading": "よくたべるわりに、ぜんぜんふとらないんですね。",
        "vi": "So với lượng ăn nhiều vậy mà bạn chẳng béo lên chút nào nhỉ."
      }
    ]
  },
  {
    "id": "n3_ct_ni_shite_wa",
    "level": "N3",
    "category": "contrast",
    "pattern": "〜にしては",
    "structure": "V/A(thể thường) · N + にしては",
    "meaningVi": "Xét trên tư cách / mốc chuẩn là ~ thì (khác với kỳ vọng)",
    "nuanceVi": "Gần nghĩa わりに nhưng thường đi sau danh từ chỉ đối tượng/kinh nghiệm (\"Mới học 6 tháng mà giỏi quá\", \"Trẻ con mà chững chạc\").",
    "examples": [
      {
        "ja": "日本語を始めて半年にしては、かなり会話が上手だ。",
        "reading": "にほんごをはじめてはんとしにしては、かなりかいわがじょうずだ。",
        "vi": "Mới học tiếng Nhật nửa năm mà giao tiếp vậy là khá giỏi đấy."
      },
      {
        "ja": "小学生にしては、大人っぽい意見を持っている。",
        "reading": "しょうがくせいにしては、おとなっぽいいけんをもっている。",
        "vi": "Là học sinh tiểu học mà có ý kiến chững chạc quá."
      }
    ]
  },
  {
    "id": "n3_ct_ni_mo_kakawarazu",
    "level": "N3",
    "category": "contrast",
    "pattern": "〜にもかかわらず",
    "structure": "V/A/Aな/N (thể thường, không có な/だ) + にもかかわらず",
    "meaningVi": "Mặc dù đã / Bất chấp sự thật ~ thế nhưng vẫn...",
    "nuanceVi": "Mức độ trang trọng cao hơn のに, hay xuất hiện trong báo chí, bài đọc N3 và thông báo chính thức.",
    "examples": [
      {
        "ja": "悪天候にもかかわらず、大勢のファンが集まった。",
        "reading": "あくてんこうにもかかわらず、おおぜいのふぁんがあつまった。",
        "vi": "Bất chấp thời tiết xấu, đông đảo người hâm mộ vẫn tập trung tới."
      },
      {
        "ja": "何度も注意したにもかかわらず、また同じミスをした。",
        "reading": "なんどもちゅういしたにもかかわらず、またおなじみすをした。",
        "vi": "Mặc dù đã nhắc bao nhiêu lần rồi mà vẫn mắc lại cùng một lỗi."
      }
    ]
  },
  {
    "id": "n3_ct_kawari_ni",
    "level": "N3",
    "category": "contrast",
    "pattern": "〜かわりに",
    "structure": "Vる / Nの + かわりに",
    "meaningVi": "Thay thế cho ~ / Đổi lại bù đắp cho ~",
    "nuanceVi": "Có 2 nghĩa chính: làm thay vai trò của người/vật khác, hoặc \"lương cao nhưng đổi lại phải tăng ca\".",
    "examples": [
      {
        "ja": "今日は休むかわりに、明日2時間多く働きます。",
        "reading": "きょうはやすむかわりに、あしたにじかんおおくはたらきます。",
        "vi": "Đổi lại việc nghỉ hôm nay, ngày mai tôi sẽ làm bù thêm 2 tiếng."
      },
      {
        "ja": "砂糖のかわりに、はちみつを使うこともあります。",
        "reading": "さとうのかわりに、はちみつをつかうこともあります。",
        "vi": "Có khi người ta dùng mật ong thay cho đường."
      }
    ]
  },
  {
    "id": "n3_ct_hanmen",
    "level": "N3",
    "category": "contrast",
    "pattern": "〜反面（はんめん）",
    "structure": "Vる / Aい / Aな(な/である) + 反面",
    "meaningVi": "Mặt tích cực này..., mặt khác ngược lại lại có điểm...",
    "nuanceVi": "Nêu hai mặt đối lập tồn tại song song trong CÙNG một sự vật, công việc hoặc giải pháp.",
    "examples": [
      {
        "ja": "スマホは便利な反面、使いすぎると目が疲れる。",
        "reading": "すまほはべんりなはんめん、つかいすぎるとめがつかれる。",
        "vi": "Smartphone tiện lợi thật đấy, nhưng mặt khác dùng quá nhiều sẽ mỏi mắt."
      },
      {
        "ja": "一人暮らしは自由な反面、家事を全部やらなければならない。",
        "reading": "ひとりぐらしはじゆうなはんめん、かじをぜんぶやらなければならない。",
        "vi": "Sống một mình tự do, song mặt trái là phải tự lo hết việc nhà."
      }
    ]
  },
  {
    "id": "n3_ct_ippou_de",
    "level": "N3",
    "category": "contrast",
    "pattern": "〜一方（で）（いっぽうで）",
    "structure": "V/A/Aな(な/である) + 一方（で）",
    "meaningVi": "Trong khi ở phía/mặt này thì..., mặt khác lại...",
    "nuanceVi": "Ngoài so sánh đối chiếu 2 mặt trái ngược, ở N3 còn có 〜一方だ = \"ngày càng tiến triển theo một chiều\".",
    "examples": [
      {
        "ja": "都心は家賃が高い一方で、通勤にはとても便利だ。",
        "reading": "としんはやちんがたかいいっぽうで、つうきんにはとてもべんりだ。",
        "vi": "Trung tâm thành phố tiền thuê nhà đắt, nhưng bù lại đi làm rất tiện."
      },
      {
        "ja": "仕事が増える一方で、休む時間がなくなってきた。",
        "reading": "しごとがふえるいっぽうで、やすむじかんがなくなってきた。",
        "vi": "Công việc thì cứ ngày một tăng lên mãi, thời gian nghỉ chẳng còn."
      }
    ]
  },
  {
    "id": "n3_ct_to_ittemo",
    "level": "N3",
    "category": "contrast",
    "pattern": "〜といっても",
    "structure": "Thể thường + といっても",
    "meaningVi": "Nói là ~ vậy thôi chứ thực chất mức độ không to tát như bạn nghĩ",
    "nuanceVi": "Khiêm tốn hạ nhẹ hoặc đính chính mức độ thực tế sau một danh từ/cụm từ dễ gây hiểu nhầm.",
    "examples": [
      {
        "ja": "料理ができるといっても、簡単なものしか作れません。",
        "reading": "りょうりができるといっても、かんたんなものしかつくれません。",
        "vi": "Nói là biết nấu ăn thôi chứ tôi chỉ làm được mấy món đơn giản."
      },
      {
        "ja": "旅行といっても、一泊二日の短い旅ですよ。",
        "reading": "りょこうといっても、いっぱくふつかのみじかいたびですよ。",
        "vi": "Gọi là đi du lịch vậy chứ chỉ là chuyến đi ngắn 2 ngày 1 đêm thôi."
      }
    ]
  },
  {
    "id": "n3_cp_ni_tsuite",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜について",
    "structure": "N + について（の N / は / も）",
    "meaningVi": "Về chủ đề ~ (nói, viết, suy nghĩ, điều tra về...)",
    "nuanceVi": "Bổ nghĩa danh từ phía sau bắt buộc thêm の: 日本の文化についてのレポート.",
    "examples": [
      {
        "ja": "AI技術の将来について議論しました。",
        "reading": "えーあいぎじゅつのしょうらいについてぎろんしました。",
        "vi": "Chúng tôi đã thảo luận về tương lai của công nghệ AI."
      },
      {
        "ja": "新しい企画についての資料を配ります。",
        "reading": "あたらしいきかくについてのしりょうをくばります。",
        "vi": "Tôi xin phát tài liệu về kế hoạch mới."
      }
    ]
  },
  {
    "id": "n3_cp_ni_totte",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜にとって",
    "structure": "N (người/tổ chức) + にとって（は/も/の N）",
    "meaningVi": "Đối với góc nhìn/lập trường của ~ thì...",
    "nuanceVi": "Đằng sau luôn là nhận xét, cảm nhận đánh giá giá trị (dễ/khó, quan trọng, quý giá).",
    "examples": [
      {
        "ja": "留学生にとって、住居探しは最初の壁だ。",
        "reading": "りゅうがくせいにとって、じゅうきょさがしはさいしょのかべだ。",
        "vi": "Đối với du học sinh, tìm nhà ở là rào cản đầu tiên."
      },
      {
        "ja": "この写真は、私にとって何よりの宝物です。",
        "reading": "このしゃしんは、わたしにとってなによりのたからものです。",
        "vi": "Bức ảnh này đối với tôi là báu vật hơn bất cứ thứ gì."
      }
    ]
  },
  {
    "id": "n3_cp_ni_taishite",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜に対して（にたいして）",
    "structure": "N + に対して / に対する + N",
    "meaningVi": "Hướng tới thái độ/hành động với ai · Trái ngược với ~",
    "nuanceVi": "Phân biệt với にとって: に対して nhấn vào hướng tác động hành động/thái độ (lịch sự với khách) hoặc đối lập 2 đối tượng.",
    "examples": [
      {
        "ja": "お客様に対しては、丁寧な言葉遣いが大切だ。",
        "reading": "おきゃくさまにたいしては、ていねいなことばづかいがたいせつだ。",
        "vi": "Đối với khách hàng, cách dùng từ lịch sự là rất quan trọng."
      },
      {
        "ja": "兄が活発なのに対して、弟はおとなしい性格だ。",
        "reading": "あにがかっぱつなのにたいして、おとうとはおとなしいせいかくだ。",
        "vi": "Trái ngược với người anh hoạt bát, cậu em lại có tính cách trầm lặng."
      }
    ]
  },
  {
    "id": "n3_cp_ni_kanshite",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜に関して（にかんして）",
    "structure": "N + に関して / に関する + N",
    "meaningVi": "Liên quan đến vấn đề ~ (trang trọng hơn について)",
    "nuanceVi": "Bao hàm phạm vi rộng các vấn đề xoay quanh N; dùng nhiều trong văn bản công sở và đề đọc JLPT.",
    "examples": [
      {
        "ja": "この件に関して、質問はありますか。",
        "reading": "このけんにかんして、しつもんはありますか。",
        "vi": "Liên quan đến vấn đề này, mọi người có câu hỏi nào không?"
      },
      {
        "ja": "環境問題に関するイベントに参加した。",
        "reading": "かんきょうもんだいにかんするいべんとにさんかした。",
        "vi": "Tôi đã tham gia sự kiện liên quan đến vấn đề môi trường."
      }
    ]
  },
  {
    "id": "n3_cp_toshite",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜として",
    "structure": "N + として（は / も / の N）",
    "meaningVi": "Với tư cách là / Như là (vai trò, lập trường)",
    "nuanceVi": "Xác định danh phận, chức vụ hoặc công dụng của N.",
    "examples": [
      {
        "ja": "ITエンジニアとして東京で働いています。",
        "reading": "あいてぃーえんじにあとしてとうきょうではたらいています。",
        "vi": "Tôi đang làm việc ở Tokyo với tư cách kỹ sư IT."
      },
      {
        "ja": "ここは温泉地として全国に知られています。",
        "reading": "ここはおんせんちとしてぜんこくにしられています。",
        "vi": "Nơi đây được biết đến trên toàn quốc như một khu suối nước nóng."
      }
    ]
  },
  {
    "id": "n3_cp_wo_chuushin_ni",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜を中心に（して）",
    "structure": "N + を中心に（して / とした N）",
    "meaningVi": "Lấy ~ làm trung tâm / Trọng tâm vào ~",
    "nuanceVi": "Dùng cho người dẫn dắt nhóm, khu vực trọng điểm hoặc đối tượng khách hàng chính.",
    "examples": [
      {
        "ja": "若者を中心に、このゲームが大流行している。",
        "reading": "わかものをちゅうしんに、このげーむがだいりゅうこうしている。",
        "vi": "Lấy giới trẻ làm trung tâm, tựa game này đang cực kỳ thịnh hành."
      },
      {
        "ja": "佐藤さんを中心にして、新しいチームを作った。",
        "reading": "さとうさんをちゅうしんにして、あたらしいちーむをつくった。",
        "vi": "Chúng tôi lập đội mới với anh Sato làm nòng cốt."
      }
    ]
  },
  {
    "id": "n3_cp_wo_hajime",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜をはじめ（として）",
    "structure": "N + をはじめ（として）",
    "meaningVi": "Đầu tiên tiêu biểu là ~, và còn nhiều cái khác nữa...",
    "nuanceVi": "Đưa ra một ví dụ đại diện nổi bật nhất để mở rộng sang cả nhóm (học viện có VN, Thái, Indo...).",
    "examples": [
      {
        "ja": "東京をはじめ、大阪や京都にも観光客が多い。",
        "reading": "とうきょうをはじめ、おおさかやきょうとにもかんこうきゃくがおおい。",
        "vi": "Tiêu biểu là Tokyo, ngoài ra Osaka và Kyoto cũng rất đông khách du lịch."
      },
      {
        "ja": "田中社長をはじめ、社員全員が出席した。",
        "reading": "たなかしゃちょうをはじめ、しゃいんぜんいんがしゅっせきした。",
        "vi": "Đứng đầu là giám đốc Tanaka cùng toàn thể nhân viên đã tham dự."
      }
    ]
  },
  {
    "id": "n3_cp_wo_moto_ni",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜をもとに（して）",
    "structure": "N + をもとに（して / した N）",
    "meaningVi": "Dựa trên nền tảng / nguyên liệu gốc là ~ để sáng tạo/quyết định",
    "nuanceVi": "Hay đi với việc chuyển thể phim từ tiểu thuyết, khảo sát lấy dữ liệu làm cơ sở.",
    "examples": [
      {
        "ja": "この映画は実際の出来事をもとに作られた。",
        "reading": "このえいがはじっさいのできごとをもとにつくられた。",
        "vi": "Bộ phim này được làm dựa trên một sự kiện có thật."
      },
      {
        "ja": "アンケート結果をもとに、サービスを改善します。",
        "reading": "あんけーとけっかをもとに、さーびすをかいぜんします。",
        "vi": "Dựa trên kết quả khảo sát, chúng tôi sẽ cải thiện dịch vụ."
      }
    ]
  },
  {
    "id": "n3_cp_wo_tsujite",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜を通じて / 〜を通して",
    "structure": "N + を通じて · を通して",
    "meaningVi": "Thông qua (trung gian/trải nghiệm) ~ · Suốt cả (thời gian)",
    "nuanceVi": "Vừa có nghĩa \"thông qua môi giới/hoạt động\", vừa có nghĩa \"xuyên suốt cả năm\" (一年を通じて).",
    "examples": [
      {
        "ja": "アルバイトを通じて、敬語の使い方になれた。",
        "reading": "あるばいとをつうじて、けいごのつかいかたになれた。",
        "vi": "Thông qua việc làm thêm, tôi đã quen với cách dùng kính ngữ."
      },
      {
        "ja": "この地域は一年を通して温暖な気候だ。",
        "reading": "このちいきはいちねんをとおしておんだんなきこうだ。",
        "vi": "Khu vực này suốt cả năm có khí hậu ôn hòa."
      }
    ]
  },
  {
    "id": "n3_cp_ni_kurabete",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜に比べて（にくらべて）",
    "structure": "N + に比べて",
    "meaningVi": "So sánh với ~ thì...",
    "nuanceVi": "Trang trọng và rõ mạch hơn より trong bài báo cáo, so sánh số liệu giữa hai năm hay hai quốc gia.",
    "examples": [
      {
        "ja": "去年に比べて、今年は応募者が2割増えた。",
        "reading": "きょねんにくらべて、ことしはおうぼしゃがにわりふえた。",
        "vi": "So với năm ngoái, năm nay số ứng viên tăng 20%."
      },
      {
        "ja": "東京に比べて、地元の生活費はずっと安い。",
        "reading": "とうきょうにくらべて、じもとのせいかつひはずっとやすい。",
        "vi": "So với Tokyo thì chi phí sinh hoạt ở quê rẻ hơn nhiều."
      }
    ]
  },
  {
    "id": "n3_cp_ni_kuwaete",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜に加えて（にくわえて）",
    "structure": "N + に加えて",
    "meaningVi": "Cộng thêm vào ~ đã có sẵn thì còn thêm cả...",
    "nuanceVi": "Thể hiện sự cộng dồn thêm (có thể là thuận lợi chồng chất hoặc khó khăn chồng khó khăn).",
    "examples": [
      {
        "ja": "強風に加えて、大雨まで降ってきた。",
        "reading": "きょうふうにくわえて、おおあめまでふってきた。",
        "vi": "Đã gió mạnh rồi lại cộng thêm cả mưa to kéo tới."
      },
      {
        "ja": "経験に加えて、語学力も評価された。",
        "reading": "けいけんにくわえて、ごがくりょくもひょうかされた。",
        "vi": "Bên cạnh kinh nghiệm, năng lực ngoại ngữ cũng được đánh giá cao."
      }
    ]
  },
  {
    "id": "n3_cp_no_hoka",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜のほか（に）",
    "structure": "Vる / N + のほか（に）",
    "meaningVi": "Ngoài ~ ra thì còn ~ nữa",
    "nuanceVi": "Khi dùng dạng 〜ほかない mang nghĩa \"chẳng còn cách nào khác ngoài làm vậy\".",
    "examples": [
      {
        "ja": "英語のほかに、日本語と中国語も話せます。",
        "reading": "えいごのほかに、にほんごとちゅうごくごもはなせます。",
        "vi": "Ngoài tiếng Anh ra tôi còn nói được cả tiếng Nhật và tiếng Trung."
      },
      {
        "ja": "終電を逃したので、歩いて帰るほかない。",
        "reading": "しゅうでんをのがしたので、あるいてかえるほかない。",
        "vi": "Lỡ chuyến tàu cuối rồi nên chẳng còn cách nào khác ngoài đi bộ về."
      }
    ]
  },
  {
    "id": "n3_cp_muke_muki",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜向け vs 〜向き",
    "structure": "N + 向け（だ/の）· N + 向き（だ/の）",
    "meaningVi": "Được thiết kế riêng cho đối tượng ~ (向け) vs Vốn dĩ hợp với ~ (向き)",
    "nuanceVi": "Cặp N3 rất dễ nhầm: 向け có chủ đích sản xuất cho ai (sách cho người mới); 向き là đặc tính tự nhiên phù hợp (quần áo hợp mùa hè).",
    "examples": [
      {
        "ja": "これはJLPT初心者向けの単語帳です。",
        "reading": "これはじぇーえるぴーてぃーしょしんしゃむけのたんごちょうです。",
        "vi": "Đây là sách từ vựng biên soạn riêng cho người mới học JLPT."
      },
      {
        "ja": "このアパートは広くて、家族向きですね。",
        "reading": "このあぱーとはひろくて、かぞくむきですね。",
        "vi": "Căn hộ này rộng rãi nên hợp cho gia đình ở nhỉ."
      }
    ]
  },
  {
    "id": "n3_cp_wo_megutte",
    "level": "N3",
    "category": "compound_particle",
    "pattern": "〜をめぐって",
    "structure": "N + をめぐって / をめぐる + N",
    "meaningVi": "Xoay quanh (vấn đề còn tranh cãi / thảo luận)",
    "nuanceVi": "Vế sau thường là các động từ như 議論する (tranh luận), 対立する (đối lập), 話し合う.",
    "examples": [
      {
        "ja": "新しい税制をめぐって、激しい議論が続いている。",
        "reading": "あたらしいぜいせいをめぐって、はげしいぎろんがつづいている。",
        "vi": "Xoay quanh chế độ thuế mới, các cuộc tranh luận gay gắt vẫn đang tiếp diễn."
      },
      {
        "ja": "再開発をめぐる住民の意見は分かれている。",
        "reading": "さいかいはつをめぐるじゅうみんのいけんはわかれている。",
        "vi": "Ý kiến cư dân xoay quanh việc tái phát triển đang chia làm nhiều luồng."
      }
    ]
  },
  {
    "id": "n3_iq_hazu_ga_nai",
    "level": "N3",
    "category": "inference_quote",
    "pattern": "〜はずだ / 〜はずがない",
    "structure": "Thể thường (Aな+な/Nの) + はずだ · はずがない",
    "meaningVi": "Chắc chắn phải là ~ / Chắc chắn không đời nào có chuyện ~",
    "nuanceVi": "Suy luận có căn cứ khách quan rõ ràng. Phủ định mạnh ở thực tại dùng はずがない.",
    "examples": [
      {
        "ja": "昨日あんなに準備したから、今日のプレゼンはうまくいくはずだ。",
        "reading": "きのうあんなにじゅんびしたから、きょうのぷれぜんはうまくいくはずだ。",
        "vi": "Hôm qua chuẩn bị kỹ thế kia thì buổi thuyết trình hôm nay chắc chắn sẽ suôn sẻ."
      },
      {
        "ja": "こんな簡単な問題が間違えるはずがない。",
        "reading": "こんなかんたんなもんだいがまちがえるはずがない。",
        "vi": "Bài dễ thế này không đời nào làm sai được."
      }
    ]
  },
  {
    "id": "n3_iq_wake_ga_nai",
    "level": "N3",
    "category": "inference_quote",
    "pattern": "〜わけがない / 〜わけではない",
    "structure": "Thể thường (Aな+な/Nの) + わけがない · わけではない",
    "meaningVi": "Không lý nào lại ~ / Không hẳn lúc nào cũng ~ (phủ định một phần)",
    "nuanceVi": "Cặp hay bẫy: わけがない phủ định 100% (\"Không thể có chuyện đó\"); わけではない là \"Không hẳn là vậy đâu\" (chừa ngoại lệ).",
    "examples": [
      {
        "ja": "一日中寝ていた人が疲れているわけがない。",
        "reading": "いちにちじゅうねていたひとがつかれているわけがない。",
        "vi": "Người ngủ cả ngày rồi thì không lý nào lại mệt được."
      },
      {
        "ja": "甘いものが嫌いなわけではないが、今は食べたくない。",
        "reading": "あまいものがきらいなわけではないが、いまはたべたくない。",
        "vi": "Không phải là tôi ghét đồ ngọt đâu, chỉ là bây giờ không muốn ăn thôi."
      }
    ]
  },
  {
    "id": "n3_iq_ni_chigainai",
    "level": "N3",
    "category": "inference_quote",
    "pattern": "〜に違いない（にちがいない）",
    "structure": "V/A/Aな/N (không thêm な/だ) + に違いない",
    "meaningVi": "Chắc chắn không sai vào đâu được (phán đoán chủ quan mạnh)",
    "nuanceVi": "Thường thể hiện độ tin chắc 90–95% của bản thân người nói.",
    "examples": [
      {
        "ja": "玄関に傘がない。母はもう出かけたに違いない。",
        "reading": "げんかんにかさがない。はははもうでかけたにちがいない。",
        "vi": "Ngoài hiên không thấy ô đâu. Chắc chắn mẹ đã ra ngoài rồi."
      },
      {
        "ja": "毎日あんなに練習しているのだから、優勝するに違いない。",
        "reading": "まいにちあんなにれんしゅうしているのだから、ゆうしょうするにちがいない。",
        "vi": "Luyện tập chăm chỉ thế kia thì chắc chắn sẽ vô địch thôi."
      }
    ]
  },
  {
    "id": "n3_iq_rashii",
    "level": "N3",
    "category": "inference_quote",
    "pattern": "〜らしい (Đặc trưng vs Nghe nói)",
    "structure": "Thể thường / N + らしい",
    "meaningVi": "Nghe phong phanh hình như ~ / Đúng chuẩn chất của ~",
    "nuanceVi": "Khi đi với danh từ + らしい thường mang nghĩa tích cực \"đúng chất\" (男らしい = nam tính, 春らしい = đúng vị xuân).",
    "examples": [
      {
        "ja": "ニュースによると、来月から電車賃が上がるらしい。",
        "reading": "にゅーすによると、らいげつからでんしゃちんがあがるらしい。",
        "vi": "Theo tin tức thì nghe bảo tháng sau giá vé tàu sẽ tăng."
      },
      {
        "ja": "今日は暖かくて、本当に春らしい天気ですね。",
        "reading": "きょうはあたたかくて、ほんとうにはるらしいてんきですね。",
        "vi": "Hôm nay ấm áp, đúng kiểu thời tiết mùa xuân thật đấy nhỉ."
      }
    ]
  },
  {
    "id": "n3_iq_ppoi",
    "level": "N3",
    "category": "inference_quote",
    "pattern": "〜っぽい",
    "structure": "Vます / Aい(bỏ い) / N + っぽい",
    "meaningVi": "Hay có khuynh hướng ~ / Trông cứ na ná như ~ (thường hơi chê)",
    "nuanceVi": "Khác らしい (đúng chất tốt), っぽい hay mang nét chê nhẹ (\"trẻ con quá\", \"hay quên\", \"màu hơi ngả đen\").",
    "examples": [
      {
        "ja": "大人なのに、ちょっと子どもっぽいところがある。",
        "reading": "おとななのに、ちょっとこどもっぽいところがある。",
        "vi": "Người lớn rồi mà vẫn có nét hơi trẻ con."
      },
      {
        "ja": "最近、メモを取らないと忘れっぽくなった。",
        "reading": "さいきん、めもをとらないとわすれっぽくなった。",
        "vi": "Gần đây không ghi chú là tôi hay quên hẳn đi."
      }
    ]
  },
  {
    "id": "n3_iq_mitai_youda",
    "level": "N3",
    "category": "inference_quote",
    "pattern": "〜みたいだ / 〜ようだ",
    "structure": "Thể thường + みたいだ · ようだ (N + みたいだ / Nの + ようだ)",
    "meaningVi": "Hình như là ~ (suy đoán qua cảm quan) / Giống như là ~ (ví von)",
    "nuanceVi": "みたい dùng nhiều trong văn nói, tiếp xúc trực tiếp với danh từ không cần の; よう dùng trang trọng và văn viết.",
    "examples": [
      {
        "ja": "外が濡れているから、さっき雨が降ったみたいだ。",
        "reading": "そとがぬれているから、さっきあめがふったみたいだ。",
        "vi": "Bên ngoài ướt hết rồi nên hình như vừa nãy trời mới mưa."
      },
      {
        "ja": "雪のように真っ白な花が一面に咲いている。",
        "reading": "ゆきのようにまっしろなはながいちめんにさいている。",
        "vi": "Những bông hoa trắng muốt như tuyết nở rộ khắp mặt đất."
      }
    ]
  },
  {
    "id": "n3_iq_to_iu_koto_da",
    "level": "N3",
    "category": "inference_quote",
    "pattern": "〜ということだ",
    "structure": "Thể thường + ということだ",
    "meaningVi": "Nghe thông tin rằng ~ / Điều đó có nghĩa là ~",
    "nuanceVi": "Dùng khi truyền đạt lại tin tức khách quan hoặc giải thích kết luận rút ra từ lời nói trước đó.",
    "examples": [
      {
        "ja": "部長の話では、プロジェクトは順調だということだ。",
        "reading": "ぶちょうのはなしでは、ぷろじぇくとはじゅんちょうだということだ。",
        "vi": "Theo lời trưởng phòng thì dự án đang tiến triển thuận lợi."
      },
      {
        "ja": "不合格だったということは、まだ準備が足りなかったということだ。",
        "reading": "ふごうかくだったということは、まだじゅんびがたりなかったということだ。",
        "vi": "Việc chưa đỗ đồng nghĩa với việc sự chuẩn bị vẫn chưa đủ."
      }
    ]
  },
  {
    "id": "n3_iq_to_iwarete_iru",
    "level": "N3",
    "category": "inference_quote",
    "pattern": "〜と言われている",
    "structure": "Thể thường + と言われている",
    "meaningVi": "Được mọi người nói / cho rằng ~ (quan niệm phổ biến)",
    "nuanceVi": "Rất hay gặp ở mở bài đọc hiểu N3 khi dẫn nhập quan điểm chung trong xã hội.",
    "examples": [
      {
        "ja": "睡眠不足は健康に悪いと言われている。",
        "reading": "すいみんぶそくはけんこうにわるいといわれている。",
        "vi": "Người ta thường nói thiếu ngủ không tốt cho sức khỏe."
      },
      {
        "ja": "このお寺は500年前に建てられたと言われている。",
        "reading": "このおてらはごひゃくねんまえにたてられたといわれている。",
        "vi": "Ngôi chùa này được cho là xây dựng từ 500 năm trước."
      }
    ]
  },
  {
    "id": "n3_iq_kke",
    "level": "N3",
    "category": "inference_quote",
    "pattern": "〜っけ",
    "structure": "Thể thường quá khứ (た / だった) + っけ",
    "meaningVi": "Ủa là gì ấy nhỉ? (tự hỏi hoặc hỏi xác nhận lại điều từng biết)",
    "nuanceVi": "Khẩu ngữ cực tự nhiên trong hội thoại đời thường khi lờ mờ nhớ ra điều gì nhưng chưa chắc chắn.",
    "examples": [
      {
        "ja": "明日の集合時間は何時でしたっけ。",
        "reading": "あしたのしゅうごうじかんはなんじでしたっけ。",
        "vi": "Ủa giờ tập trung ngày mai là mấy giờ ấy nhỉ?"
      },
      {
        "ja": "あ、その言葉、前の授業で習ったっけ。",
        "reading": "あ、そのことば、まえのじゅぎょうでならったっけ。",
        "vi": "À, từ đó hình như học ở buổi trước rồi phải không nhỉ?"
      }
    ]
  },
  {
    "id": "n3_iq_osore_ga_aru",
    "level": "N3",
    "category": "inference_quote",
    "pattern": "〜恐れがある / 〜傾向がある",
    "structure": "Vる / Nの + 恐れがある · 傾向がある",
    "meaningVi": "Có nguy cơ xảy ra chuyện xấu ~ / Có xu hướng hay ~",
    "nuanceVi": "恐れがある CHỈ dùng cho điều tiêu cực (bão đổ bộ, lộ thông tin); 傾向がある mô tả xu thế chung.",
    "examples": [
      {
        "ja": "大型台風が今夜上陸する恐れがあります。",
        "reading": "おおがたたいふうがこんやじょうりくするおそれがあります。",
        "vi": "Có nguy cơ bão lớn sẽ đổ bộ trong đêm nay."
      },
      {
        "ja": "最近はネットで買い物をする人が増える傾向がある。",
        "reading": "さいきんはねっとでかいものをするひとがふえるけいこうがある。",
        "vi": "Gần đây số người mua sắm qua mạng có xu hướng tăng."
      }
    ]
  },
  {
    "id": "n3_sa_gachi",
    "level": "N3",
    "category": "state_attitude",
    "pattern": "〜がち",
    "structure": "Vます / N + がちだ（な N / に）",
    "meaningVi": "Thường hay mắc / Có khuynh hướng thiên về ~ (thường tiêu cực)",
    "nuanceVi": "Hay dùng với những xu hướng không mong muốn như bệnh tật (病気がち), đi muộn (遅れがち), quên (忘れがち).",
    "examples": [
      {
        "ja": "冬は天気が曇りがちになります。",
        "reading": "ふゆはてんきがくもりがちになります。",
        "vi": "Mùa đông trời thường hay âm u nhiều mây."
      },
      {
        "ja": "一人暮らしだと、栄養が偏りがちだ。",
        "reading": "ひとりぐらしだと、えいようがかたよりがちだ。",
        "vi": "Sống một mình thì dinh dưỡng rất hay bị mất cân đối."
      }
    ]
  },
  {
    "id": "n3_sa_gimi",
    "level": "N3",
    "category": "state_attitude",
    "pattern": "〜ぎみ",
    "structure": "Vます / N + ぎみだ（な N / に）",
    "meaningVi": "Hơi có dấu hiệu / Chớm bị ~",
    "nuanceVi": "Nhấn mạnh triệu chứng nhẹ mới chớm xuất hiện trên cơ thể hoặc xu hướng hiện tại (hơi cảm, hơi trễ lịch).",
    "examples": [
      {
        "ja": "昨日から少し風邪ぎみなので、早く寝ます。",
        "reading": "きのうからすこしかぜぎみなので、はやくねます。",
        "vi": "Từ hôm qua tôi hơi chớm cảm nhẹ nên đi ngủ sớm."
      },
      {
        "ja": "最近、仕事が忙しくて疲れぎみです。",
        "reading": "さいきん、しごとがいそがしくてつかれぎみです。",
        "vi": "Gần đây việc bận nên tôi có phần hơi thấm mệt."
      }
    ]
  },
  {
    "id": "n3_sa_kiru_kirenai",
    "level": "N3",
    "category": "state_attitude",
    "pattern": "〜きる / 〜きれない",
    "structure": "Vます + きる · きれない",
    "meaningVi": "Làm triệt để đến tận cùng ~ / Nhiều quá không làm hết nổi ~",
    "nuanceVi": "Cặp rất hay thi N3: 食べきれない (nhiều quá ăn không xuể), 言い切る (khẳng định chắc nịch).",
    "examples": [
      {
        "ja": "ボリュームが多すぎて、一人では食べきれなかった。",
        "reading": "ぼりゅーむがおおすぎて、ひとりではたべきれなかった。",
        "vi": "Suất ăn nhiều quá nên một mình tôi ăn không hết nổi."
      },
      {
        "ja": "長いマラソンを最後まで走りきった。",
        "reading": "ながいまらそんをさいごまではしりきった。",
        "vi": "Tôi đã chạy trọn vẹn đường đua marathon dài tới tận đích."
      }
    ]
  },
  {
    "id": "n3_sa_kakeru",
    "level": "N3",
    "category": "state_attitude",
    "pattern": "〜かける / 〜かけの",
    "structure": "Vます + かける · かけの + N",
    "meaningVi": "Đang làm dở dang ~ / Suýt chút nữa thì ~",
    "nuanceVi": "Khi dùng Vます + かけの N chỉ đồ vật đang làm dang dở (uống dở cốc cà phê, đọc dở trang sách).",
    "examples": [
      {
        "ja": "机の上に読みかけの本が置いてあります。",
        "reading": "つくえのうえによみかけのほんがおいてあります。",
        "vi": "Trên bàn có để quyển sách đang đọc dở."
      },
      {
        "ja": "氷で滑って、転びかけた。",
        "reading": "こおりですべって、ころびかけた。",
        "vi": "Trượt trên băng, suýt chút nữa thì ngã."
      }
    ]
  },
  {
    "id": "n3_sa_nuku",
    "level": "N3",
    "category": "state_attitude",
    "pattern": "〜ぬく",
    "structure": "Vます + ぬく",
    "meaningVi": "Kiên trì vượt qua gian khổ làm cho bằng xong đến cùng",
    "nuanceVi": "Khác 〜きる (hoàn thành hết số lượng): 〜ぬく nhấn mạnh ý chí bền bỉ vượt khó (考えぬく = suy nghĩ nát óc tới cùng).",
    "examples": [
      {
        "ja": "どんなに辛くても、最後までやりぬくつもりだ。",
        "reading": "どんなにつらくても、さいごまでやりぬくつもりだ。",
        "vi": "Dù có vất vả đến mấy tôi cũng quyết làm cho tới cùng."
      },
      {
        "ja": "何日も考えぬいて、やっと答えを見つけた。",
        "reading": "なんにちもかんがえぬいて、やっとこたえをみつけた。",
        "vi": "Suy nghĩ trăn trở suốt mấy ngày liền cuối cùng cũng tìm ra đáp án."
      }
    ]
  },
  {
    "id": "n3_sa_ppanashi",
    "level": "N3",
    "category": "state_attitude",
    "pattern": "〜っぱなし",
    "structure": "Vます + っぱなしだ",
    "meaningVi": "Để mặc nguyên trạng thái đó không thèm thu dọn / cứ đứng mãi",
    "nuanceVi": "Luôn mang sắc thái phê phán sự cẩu thả (quên tắt TV, mở cửa sổ suốt, vứt giày bừa).",
    "examples": [
      {
        "ja": "電気をつけっぱなしで出かけてしまった。",
        "reading": "でんきをつけっぱなしででかけてしまった。",
        "vi": "Tôi đi ra ngoài mà cứ để nguyên đèn sáng như thế mất rồi."
      },
      {
        "ja": "今日は一日中立ちっぱなしで、足が痛い。",
        "reading": "きょうはいちにちじゅうたちっぱなしで、あしがいたい。",
        "vi": "Hôm nay đứng nguyên cả ngày nên chân đau nhừ."
      }
    ]
  },
  {
    "id": "n3_sa_ta_mama",
    "level": "N3",
    "category": "state_attitude",
    "pattern": "〜たまま",
    "structure": "Vた / Vない / Aな(な) / Nの + まま（で）",
    "meaningVi": "Giữ nguyên trạng thái đó mà làm việc tiếp theo",
    "nuanceVi": "Trung tính hơn っぱなし: vừa dùng khi chê (\"đi giày vào phòng\"), vừa dùng bình thường (\"đeo kính ngủ quên\").",
    "examples": [
      {
        "ja": "メガネをかけたまま寝てしまった。",
        "reading": "めがねをかけたままねてしまった。",
        "vi": "Tôi cứ để nguyên kính đeo vậy mà ngủ thiếp đi mất."
      },
      {
        "ja": "靴を履いたまま部屋に入らないでください。",
        "reading": "くつをはいたままへやにはいらないでください。",
        "vi": "Xin đừng giữ nguyên giày bước vào phòng."
      }
    ]
  },
  {
    "id": "n3_sa_zu_ni",
    "level": "N3",
    "category": "state_attitude",
    "pattern": "〜ずに / 〜ないで",
    "structure": "Vない (bỏ ない) + ずに (する → せずに)",
    "meaningVi": "Không làm A mà lại làm B",
    "nuanceVi": "ずに trang trọng hơn ないで một bậc và thường hay viết thành ずにいる (vẫn chưa làm gì).",
    "examples": [
      {
        "ja": "朝ご飯を食べずに、急いで会社へ行った。",
        "reading": "あさごはんをたべずに、いそいでかいしゃへいった。",
        "vi": "Không ăn sáng mà vội vàng đến công ty luôn."
      },
      {
        "ja": "辞書を使わずに、長文を読んでみましょう。",
        "reading": "じしょをつかわずに、ちょうぶんをよんでみましょう。",
        "vi": "Hãy thử đọc đoạn văn dài mà không dùng từ điển xem sao."
      }
    ]
  },
  {
    "id": "n3_sa_koto_wa_nai",
    "level": "N3",
    "category": "state_attitude",
    "pattern": "〜ことはない",
    "structure": "Vる + ことはない",
    "meaningVi": "Không cần thiết phải làm ~ đâu (trấn an)",
    "nuanceVi": "Phân biệt với Vたことがある (kinh nghiệm): Vる + ことはない = \"Bạn không việc gì phải lo đâu\".",
    "examples": [
      {
        "ja": "まだ時間があるから、そんなに急ぐことはないよ。",
        "reading": "まだじかんがあるから、そんなにいそぐことはないよ。",
        "vi": "Vẫn còn thời gian mà, không cần phải vội thế đâu."
      },
      {
        "ja": "小さな失敗で落ち込むことはありません。",
        "reading": "ちいさなしっぱいでおちこむことはありません。",
        "vi": "Không việc gì phải buồn bã vì một lỗi nhỏ như vậy cả."
      }
    ]
  },
  {
    "id": "n3_sa_beki",
    "level": "N3",
    "category": "state_attitude",
    "pattern": "〜べきだ / 〜べきではない",
    "structure": "Vる + べきだ (する → すべき / するべき)",
    "meaningVi": "Nên làm ~ / Không nên làm ~ (bổn phận, lẽ phải)",
    "nuanceVi": "Mạnh hơn ほうがいい: nói về trách nhiệm đạo đức, lẽ thường chung (học sinh nên cố gắng, không nên nói dối).",
    "examples": [
      {
        "ja": "間違えたときは、素直に謝るべきだ。",
        "reading": "まちがえたときは、すなおにあやまるべきだ。",
        "vi": "Lúc làm sai thì nên thành thật xin lỗi."
      },
      {
        "ja": "他人の秘密を勝手に話すべきではない。",
        "reading": "たにんのひみつをかってにはなすべきではない。",
        "vi": "Không nên tự ý nói bí mật của người khác."
      }
    ]
  },
  {
    "id": "n3_sa_hou_ga_mashi",
    "level": "N3",
    "category": "state_attitude",
    "pattern": "〜ほうがましだ",
    "structure": "Vる / Vない / Nの + ほうがましだ",
    "meaningVi": "Thà làm ~ còn đỡ tệ hơn là chịu cảnh kia",
    "nuanceVi": "So sánh giữa 2 lựa chọn đều chẳng hay ho gì, chọn cái ít tệ hơn (\"Thà đi bộ 30 phút còn hơn chờ xe buýt 1 tiếng\").",
    "examples": [
      {
        "ja": "こんな満員電車に乗るくらいなら、歩くほうがましだ。",
        "reading": "こんなまんいんでんしゃにのるくらいなら、あるくほうがましだ。",
        "vi": "Phải chen lên chuyến tàu chật cứng thế này thì thà đi bộ còn hơn."
      },
      {
        "ja": "何もしないで後悔するより、失敗してもやるほうがましだ。",
        "reading": "なにもしないでこうかいするより、しっぱいしてもやるほうがましだ。",
        "vi": "Thà làm dù có thất bại còn hơn ngồi yên chẳng làm gì để rồi hối hận."
      }
    ]
  },
  {
    "id": "n3_sa_te_hoshii",
    "level": "N3",
    "category": "state_attitude",
    "pattern": "〜てほしい / 〜てもらいたい",
    "structure": "Vて / Vないで + ほしい · もらいたい",
    "meaningVi": "Tôi muốn bạn / người khác làm (hoặc đừng làm) ~ cho tôi",
    "nuanceVi": "Cực kỳ lưu ý: 〜たい là bản thân muốn làm; còn muốn AI ĐÓ làm gì phải dùng Nに + Vてほしい.",
    "examples": [
      {
        "ja": "もっと日本語が上手になってほしいと言われた。",
        "reading": "もっとにほんごがじょうずになってほしいといわれた。",
        "vi": "Tôi được nhắn nhủ là mong muốn tiếng Nhật của tôi giỏi hơn nữa."
      },
      {
        "ja": "ここで大きな声を出さないでほしい。",
        "reading": "ここでおおきなこえをださないでほしい。",
        "vi": "Tôi mong bạn đừng nói to tiếng ở đây."
      }
    ]
  },
  {
    "id": "n3_sa_sasete",
    "level": "N3",
    "category": "state_attitude",
    "pattern": "〜させてください / 〜させてもらう",
    "structure": "V使役て (sai khiến thể て) + ください · もらう · いただく",
    "meaningVi": "Xin phép cho tôi được làm ~",
    "nuanceVi": "Mẫu lịch sự bắt buộc trong công việc & phỏng vấn tại Nhật khi muốn xin phép thực hiện việc gì.",
    "examples": [
      {
        "ja": "少し考えさせていただけますか。",
        "reading": "すこしかんがえさせていただけますか。",
        "vi": "Cho phép tôi suy nghĩ thêm một chút được không ạ?"
      },
      {
        "ja": "体調が悪いので、今日は早く帰らせてください。",
        "reading": "たいちょうがわるいので、きょうははやくかえらせてください。",
        "vi": "Vì người hơi mệt nên hôm nay xin phép cho tôi về sớm ạ."
      }
    ]
  },
  {
    "id": "n2_ni_ojite",
    "level": "N2",
    "category": "condition_scope",
    "pattern": "〜に応じて",
    "structure": "N + に応じて",
    "meaningVi": "Tùy theo / Tương ứng với ~",
    "nuanceVi": "Diễn tả sự thay đổi, điều chỉnh cho phù hợp với từng hoàn cảnh, năng lực hoặc nhu cầu.",
    "examples": [
      {
        "ja": "レベルに応じてクラスが分かれています。",
        "reading": "れべるにおうじてくらすがわかれています。",
        "vi": "Các lớp được chia tùy theo trình độ."
      },
      {
        "ja": "季節の移り変わりに応じてメニューを変える。",
        "reading": "きせつのうつりかわりにおうじてめにゅーをかえる。",
        "vi": "Thay đổi thực đơn tương ứng theo sự chuyển mùa."
      }
    ]
  },
  {
    "id": "n2_koto_kara",
    "level": "N2",
    "category": "cause_result",
    "pattern": "〜ことから",
    "structure": "V/A (thể thường) + ことから",
    "meaningVi": "Từ việc / Vì lý do (suy ra tên gọi, phán đoán)...",
    "nuanceVi": "Hay dùng khi giải thích nguồn gốc tên gọi hoặc căn cứ để người nói đưa ra nhận xét.",
    "examples": [
      {
        "ja": "形が似ていることから、「富士山」と呼ばれたそうだ。",
        "reading": "かたちがにていることから、ふじさんとよばれたそうだ。",
        "vi": "Từ việc hình dáng giống nhau nên được gọi tên như vậy."
      },
      {
        "ja": "道が濡れていることから、昨夜雨が降ったと分かる。",
        "reading": "みちがぬれていることから、さくやあめがふったとわかる。",
        "vi": "Từ việc đường ướt có thể biết tối qua trời đã mưa."
      }
    ]
  },
  {
    "id": "n2_ni_kagirazu",
    "level": "N2",
    "category": "condition_scope",
    "pattern": "〜に限らず",
    "structure": "N + に限らず",
    "meaningVi": "Không chỉ giới hạn ở ~ mà còn rộng hơn...",
    "nuanceVi": "Trang trọng hơn だけではなく, thường dùng trong bài đọc N2 và tin tức.",
    "examples": [
      {
        "ja": "このアプリは学生に限らず、社会人にも人気だ。",
        "reading": "このあぷりはがくせいにかぎらず、しゃかいじんにもにんきだ。",
        "vi": "Ứng dụng này không chỉ sinh viên mà người đi làm cũng rất ưa chuộng."
      },
      {
        "ja": "季節に限らず、いつでも注文できる。",
        "reading": "きせつにかぎらず、いつでもちゅうもんできる。",
        "vi": "Không giới hạn mùa nào, lúc nào cũng có thể đặt."
      }
    ]
  },
  {
    "id": "n2_te_wa_irarenai",
    "level": "N2",
    "category": "state_attitude",
    "pattern": "〜てはいられない",
    "structure": "Vて + はいられない",
    "meaningVi": "Không thể cứ ngồi yên ~ mãi được",
    "nuanceVi": "Thể hiện sự sốt ruột trước tình thế cấp bách buộc phải hành động ngay.",
    "examples": [
      {
        "ja": "締切が近いので、のんびりしてはいられない。",
        "reading": "しめきりがちかいので、のんびりしてはいられない。",
        "vi": "Deadline gần kề rồi nên không thể ung dung mãi được."
      },
      {
        "ja": "もうすぐ試験だから、遊んでばかりはいられない。",
        "reading": "もうすぐしけんだから、あそんでばかりはいられない。",
        "vi": "Sắp thi rồi nên không thể chỉ mải chơi mãi được."
      }
    ]
  },
  {
    "id": "n2_wake_ni_wa_ikanai",
    "level": "N2",
    "category": "state_attitude",
    "pattern": "〜わけにはいかない",
    "structure": "Vる / Vない + わけにはいかない",
    "meaningVi": "Không thể làm ~ (vì đạo lý, trách nhiệm, hoàn cảnh)",
    "nuanceVi": "Phân biệt với 〜わけがない (chắc chắn không có chuyện đó). わけにはいかない là dù muốn hay không cũng không thể làm.",
    "examples": [
      {
        "ja": "大事な会議があるので、休むわけにはいかない。",
        "reading": "だいじなかいぎがあるので、やすむわけにはいかない。",
        "vi": "Vì có cuộc họp quan trọng nên tôi không thể nghỉ được."
      },
      {
        "ja": "約束したからには、行かないわけにはいかない。",
        "reading": "やくそくしたからには、いかないわけにはいかない。",
        "vi": "Đã hứa rồi thì không thể không đi được."
      }
    ]
  },
  {
    "id": "n1_wo_kawakiri_ni",
    "level": "N1",
    "category": "time_sequence",
    "pattern": "〜を皮切りに（して）",
    "structure": "N + を皮切りに(して)",
    "meaningVi": "Bắt đầu từ ~ (làm phát súng đầu tiên cho chuỗi sự kiện tiếp theo)",
    "nuanceVi": "Sắc thái trang trọng cho loạt tour diễn, chiến dịch mở rộng, chuỗi cải cách.",
    "examples": [
      {
        "ja": "東京公演を皮切りに、全国ツアーが始まった。",
        "reading": "とうきょうこうえんをかわきりに、ぜんこくつあーがはじまった。",
        "vi": "Mở màn từ buổi diễn Tokyo, tour toàn quốc đã bắt đầu."
      },
      {
        "ja": "今回の法改正を皮切りに、制度の見直しが進む。",
        "reading": "こんかいのほうかいせいをかわきりに、せいどのみなおしがすすむ。",
        "vi": "Khởi đầu từ lần sửa luật này, việc rà soát hệ thống đang tiến triển."
      }
    ]
  },
  {
    "id": "n1_yue_ni",
    "level": "N1",
    "category": "cause_result",
    "pattern": "〜ゆえに",
    "structure": "V/A/N(である) + ゆえに",
    "meaningVi": "Chính vì ~ cho nên (văn phong trang trọng)",
    "nuanceVi": "Giống ために/だから nhưng mang âm hưởng trang nghiêm, văn viết hoặc bài luận N1.",
    "examples": [
      {
        "ja": "若さゆえに、経験が不足している点もある。",
        "reading": "わかさゆえに、けいけんがふそくしているてんもある。",
        "vi": "Chính vì tuổi trẻ nên cũng có điểm còn thiếu kinh nghiệm."
      },
      {
        "ja": "真面目であるがゆえに、悩みも多いのだろう。",
        "reading": "まじめであるがゆえに、なやみもおおいのだろう。",
        "vi": "Có lẽ chính vì nghiêm túc nên cũng nhiều trăn trở."
      }
    ]
  },
  {
    "id": "n1_ni_taeru",
    "level": "N1",
    "category": "state_attitude",
    "pattern": "〜に堪える / 〜に堪えない",
    "structure": "Vる / N + に堪える · に堪えない",
    "meaningVi": "Đáng để ~ / Không chịu nổi (nỗi buồn, cảm xúc, sự xấu hổ)",
    "nuanceVi": "Cùng chữ Hán 堪: Vる + に堪える = xứng đáng để xem/nghe (鑑賞に堪える); N (tiêu cực) + に堪えない = rất lấy làm tiếc/không thể chịu nổi.",
    "examples": [
      {
        "ja": "プロの作品として鑑賞に堪える出来栄えだ。",
        "reading": "ぷろのさくひんとしてかんしょうにたえるできばえだ。",
        "vi": "Chất lượng xứng đáng để thưởng thức như một tác phẩm chuyên nghiệp."
      },
      {
        "ja": "長年の友を失い、悲しみに堪えない。",
        "reading": "ながねんのともをうしない、かなしみにたえない。",
        "vi": "Mất đi người bạn lâu năm, nỗi buồn không sao kể xiết."
      }
    ]
  },
  {
    "id": "n1_to_atte_wa",
    "level": "N1",
    "category": "cause_result",
    "pattern": "〜とあって（は）",
    "structure": "Thể thường / N + とあって",
    "meaningVi": "Bởi vì là dịp đặc biệt / tình huống hiếm có ~ nên...",
    "nuanceVi": "Nhấn mạnh lý do đặc biệt khiến kết quả phía sau diễn ra hào hứng hoặc khác thường.",
    "examples": [
      {
        "ja": "年に一度のセールとあって、朝から行列ができた。",
        "reading": "ねんにいちどのせーるとあって、あさからぎょうれつができた。",
        "vi": "Vì là đợt giảm giá mỗi năm một lần nên từ sáng đã xếp hàng dài."
      },
      {
        "ja": "決勝戦とあって、会場は熱気に包まれた。",
        "reading": "けっしょうせんとあって、かいじょうはねっきにつつまれた。",
        "vi": "Vì là trận chung kết nên khán đài tràn ngập bầu không khí cuồng nhiệt."
      }
    ]
  }
];

export const INITIAL_STAR_SENTENCES: readonly GrammarSeedStarSentence[] = [
  {
    "id": "star_n5_1",
    "level": "N5",
    "meaningVi": "Mỗi sáng tôi đều đi bộ đến công ty.",
    "prefixJa": "毎朝、",
    "suffixJa": "行きます。",
    "parts": [
      "歩いて",
      "駅",
      "まで",
      "会社へ"
    ],
    "starIndex": 2,
    "explanationVi": "Trật tự tự nhiên: Phương thức (歩いて) → Địa điểm trung gian (駅まで) → Đích đến cuối (会社へ行きます)."
  },
  {
    "id": "star_n5_2",
    "level": "N5",
    "meaningVi": "Xin vui lòng đừng quên đồ đạc trong phòng học nhé.",
    "prefixJa": "教室に",
    "suffixJa": "くださいね。",
    "parts": [
      "荷物を",
      "忘れて",
      "いか",
      "ないで"
    ],
    "starIndex": 2,
    "explanationVi": "荷物を (hành lý/đồ đạc) + 忘れていかないで (đừng bỏ quên lại mà đi mất) + くださいね."
  },
  {
    "id": "star_n5_3",
    "level": "N5",
    "meaningVi": "Tôi muốn uống một tách cà phê nóng.",
    "prefixJa": "今、",
    "suffixJa": "飲みたいです。",
    "parts": [
      "温かい",
      "コーヒー",
      "を",
      "一杯"
    ],
    "starIndex": 2,
    "explanationVi": "Tính từ bổ nghĩa cho danh từ (温かいコーヒー), trợ từ を rồi mới đến lượng từ (一杯) trước động từ 飲みたいです."
  },
  {
    "id": "star_n5_4",
    "level": "N5",
    "meaningVi": "Bạn đã từng ăn đồ ăn Nhật Bản lần nào chưa?",
    "prefixJa": "日本料理を",
    "suffixJa": "か。",
    "parts": [
      "一度",
      "でも",
      "食べた",
      "ことがあります"
    ],
    "starIndex": 1,
    "explanationVi": "一度でも (dù chỉ một lần) + 食べたことがありますか (đã từng ăn chưa)."
  },
  {
    "id": "star_n4_1",
    "level": "N4",
    "meaningVi": "Tôi đã quyết định thử nấu món Nhật mỗi cuối tuần.",
    "prefixJa": "週末に",
    "suffixJa": "しました。",
    "parts": [
      "日本料理を",
      "作って",
      "みる",
      "ことに"
    ],
    "starIndex": 2,
    "explanationVi": "Cụm Vてみる (làm thử) đứng trước ことにしました (quyết định làm): 日本料理を + 作って + みる + ことに."
  },
  {
    "id": "star_n4_2",
    "level": "N4",
    "meaningVi": "Vì sắp muộn giờ họp, tôi phải đi taxi thôi.",
    "prefixJa": "会議に",
    "suffixJa": "なりません。",
    "parts": [
      "間に合わなさそうなので",
      "タクシーで",
      "行か",
      "なければ"
    ],
    "starIndex": 1,
    "explanationVi": "Lý do 間に合わなさそうなので đứng trước vế kết quả phương tiện タクシーで行かなければなりません."
  },
  {
    "id": "star_n4_3",
    "level": "N4",
    "meaningVi": "Nghe nói cửa hàng này rất nổi tiếng nên cuối tuần hay đông khách.",
    "prefixJa": "この店は",
    "suffixJa": "混んでいます。",
    "parts": [
      "有名だ",
      "そうで",
      "週末は",
      "いつも"
    ],
    "starIndex": 2,
    "explanationVi": "Tính từ な + そうで (nghe nói nổi tiếng nên) → 週末は (cuối tuần thì) → いつも (luôn luôn) 混んでいます."
  },
  {
    "id": "star_n4_4",
    "level": "N4",
    "meaningVi": "Nếu mở cửa sổ ra thì gió mát sẽ thổi vào phòng.",
    "prefixJa": "窓を",
    "suffixJa": "入ります。",
    "parts": [
      "開ければ",
      "涼しい",
      "風が",
      "部屋に"
    ],
    "starIndex": 2,
    "explanationVi": "Mệnh đề điều kiện 窓を開ければ → Chủ ngữ với tính từ 涼しい風が → Nơi chốn 部屋に入ります."
  },
  {
    "id": "star_n3_1",
    "level": "N3",
    "meaningVi": "Để không bị quên từ vựng đã học, tôi ôn Flashcard mỗi tối.",
    "prefixJa": "覚えた言葉を",
    "suffixJa": "しています。",
    "parts": [
      "忘れない",
      "ように",
      "毎晩",
      "復習するように"
    ],
    "starIndex": 1,
    "explanationVi": "Mục đích phủ định dùng 忘れない + ように (để không quên) → 毎晩 + 復習するようにしています (duy trì thói quen ôn mỗi tối)."
  },
  {
    "id": "star_n3_2",
    "level": "N3",
    "meaningVi": "Nhờ có sự hướng dẫn tận tình của tiền bối mà tôi quen việc nhanh hơn.",
    "prefixJa": "先輩が",
    "suffixJa": "慣れました。",
    "parts": [
      "丁寧に",
      "教えてくれた",
      "おかげで",
      "仕事に"
    ],
    "starIndex": 2,
    "explanationVi": "Chủ ngữ 先輩が → 丁寧に教えてくれた (đã chỉ bảo tận tình) → おかげで (nhờ có) → 仕事に慣れました."
  },
  {
    "id": "star_n3_3",
    "level": "N3",
    "meaningVi": "Theo lời bác sĩ thì dường như vết thương này sẽ lành trong 1 tuần.",
    "prefixJa": "先生の話では",
    "suffixJa": "治るはずだ。",
    "parts": [
      "このけがは",
      "一週間",
      "ほどで",
      "きれいに"
    ],
    "starIndex": 2,
    "explanationVi": "Chủ đề このけがは → Thời gian ước lượng 一週間ほどで (trong khoảng 1 tuần) → Trạng thái きれいに治る."
  },
  {
    "id": "star_n3_4",
    "level": "N3",
    "meaningVi": "Tuy thời gian chuẩn bị ngắn nhưng buổi thuyết trình vẫn diễn ra thành công.",
    "prefixJa": "準備期間は",
    "suffixJa": "成功した。",
    "parts": [
      "短かった",
      "ものの",
      "発表は",
      "無事に"
    ],
    "starIndex": 1,
    "explanationVi": "ものの (mặc dù — trang trọng tương tự が/のに) nối 2 vế đối lập: 短かったものの → 発表は無事に成功した."
  },
  {
    "id": "star_n2_1",
    "level": "N2",
    "meaningVi": "Ứng dụng tự điều chỉnh bài đọc tùy theo trình độ người học.",
    "prefixJa": "このシステムは",
    "suffixJa": "問題を作ります。",
    "parts": [
      "学習者の",
      "レベルに",
      "応じて",
      "適切な"
    ],
    "starIndex": 2,
    "explanationVi": "学習者のレベル (trình độ người học) + に応じて (tùy theo) + 適切な問題 (bài tập phù hợp)."
  },
  {
    "id": "star_n2_2",
    "level": "N2",
    "meaningVi": "Vì đã nhận lời mời rồi nên dù bận tôi cũng không thể từ chối được.",
    "prefixJa": "一度引き受けた",
    "suffixJa": "いかない。",
    "parts": [
      "からには",
      "忙しくても",
      "断る",
      "わけには"
    ],
    "starIndex": 2,
    "explanationVi": "〜からには (một khi đã) → 忙しくても → 断るわけにはいかない (không thể từ chối)."
  },
  {
    "id": "star_n2_3",
    "level": "N2",
    "meaningVi": "Không chỉ giới trẻ mà cả người lớn tuổi cũng bắt đầu dùng điện thoại thông minh.",
    "prefixJa": "最近は",
    "suffixJa": "使っている。",
    "parts": [
      "若者に",
      "限らず",
      "高齢者も",
      "スマホを"
    ],
    "starIndex": 1,
    "explanationVi": "N + に限らず (không chỉ giới hạn ở giới trẻ) → 高齢者もスマホを使っている."
  },
  {
    "id": "star_n2_4",
    "level": "N2",
    "meaningVi": "Ngày thi đang đến gần nên tôi không thể cứ chơi mãi thế này được.",
    "prefixJa": "試験が",
    "suffixJa": "いられない。",
    "parts": [
      "近づいて",
      "いるので",
      "遊んで",
      "ばかりは"
    ],
    "starIndex": 2,
    "explanationVi": "近づいているので (vì đang tới gần) + 遊んでばかりはいられない (không thể chỉ mải chơi mãi được)."
  },
  {
    "id": "star_n1_1",
    "level": "N1",
    "meaningVi": "Bắt đầu từ chi nhánh Tokyo, chuỗi cửa hàng đã mở rộng khắp châu Á.",
    "prefixJa": "東京店舗",
    "suffixJa": "展開された。",
    "parts": [
      "を皮切りに",
      "アジア",
      "各地へと",
      "事業が"
    ],
    "starIndex": 1,
    "explanationVi": "N + を皮切りに (khởi đầu từ...) → アジア各地へと (tới khắp châu Á) → 事業が展開された."
  },
  {
    "id": "star_n1_2",
    "level": "N1",
    "meaningVi": "Chính vì là trận chung kết được mong đợi nên sân vận động chật kín khán giả.",
    "prefixJa": "待ちに待った",
    "suffixJa": "埋まった。",
    "parts": [
      "決勝戦",
      "とあって",
      "会場は",
      "満員に"
    ],
    "starIndex": 2,
    "explanationVi": "決勝戦とあって (vì là dịp đặc biệt trận chung kết) → 会場は満員に埋まった."
  },
  {
    "id": "star_n3_5",
    "level": "N3",
    "meaningVi": "Tranh thủ lúc vẫn còn nhớ rõ chi tiết, hãy viết báo cáo ngay đi.",
    "prefixJa": "記憶が",
    "suffixJa": "書きましょう。",
    "parts": [
      "新しい",
      "うちに",
      "早く",
      "レポートを"
    ],
    "starIndex": 1,
    "explanationVi": "記憶が新しい (ký ức còn mới mẻ) + うちに (tranh thủ lúc) + 早く + レポートを書きましょう."
  },
  {
    "id": "star_n3_6",
    "level": "N3",
    "meaningVi": "Đúng lúc tôi đang trình bày kế hoạch thì điện thoại lại rung.",
    "prefixJa": "企画を",
    "suffixJa": "鳴ってしまった。",
    "parts": [
      "説明している",
      "最中に",
      "スマホが",
      "急に"
    ],
    "starIndex": 1,
    "explanationVi": "Vている + 最中に (đúng ngay lúc cao điểm đang làm) + スマホが急に鳴ってしまった."
  },
  {
    "id": "star_n3_7",
    "level": "N3",
    "meaningVi": "Vì quá vui mừng trước tin đỗ kỳ thi nên tôi không kìm được nước mắt.",
    "prefixJa": "合格の",
    "suffixJa": "泣いてしまった。",
    "parts": [
      "知らせを",
      "聞いて",
      "うれしさの",
      "あまり"
    ],
    "starIndex": 2,
    "explanationVi": "知らせを聞いて → うれしさの (danh từ hóa tính từ い) + あまり (vì quá mức nên...)."
  },
  {
    "id": "star_n3_8",
    "level": "N3",
    "meaningVi": "Tôi đặt nguyên tắc cho bản thân là ngày nào cũng nghe tiếng Nhật 20 phút.",
    "prefixJa": "毎日20分は",
    "suffixJa": "にしています。",
    "parts": [
      "日本語の",
      "ニュースを",
      "聞く",
      "こと"
    ],
    "starIndex": 2,
    "explanationVi": "日本語のニュースを + 聞く + こと + にしています (duy trì thói quen tự đặt ra)."
  },
  {
    "id": "star_n3_9",
    "level": "N3",
    "meaningVi": "Càng luyện phát âm nhiều thì khi giao tiếp bạn càng tự tin hơn.",
    "prefixJa": "発音は",
    "suffixJa": "自信がつきます。",
    "parts": [
      "練習すれば",
      "するほど",
      "話す",
      "ときに"
    ],
    "starIndex": 1,
    "explanationVi": "Mẫu tăng tiến: 練習すれば + するほど (càng luyện càng...) + 話すときに自信がつきます."
  },
  {
    "id": "star_n3_10",
    "level": "N3",
    "meaningVi": "Chỉ cần có môi trường thực hành mỗi ngày thì tiếng Nhật sẽ tiến bộ nhanh.",
    "prefixJa": "毎日使う",
    "suffixJa": "すぐ上達する。",
    "parts": [
      "機会",
      "さえ",
      "あれば",
      "会話は"
    ],
    "starIndex": 1,
    "explanationVi": "N + さえ + あれば (chỉ cần có cơ hội dùng mỗi ngày thôi thì hội thoại tiến bộ ngay)."
  },
  {
    "id": "star_n3_11",
    "level": "N3",
    "meaningVi": "Quán cà phê này tuy hơi xa ga nhưng đổi lại không gian rất yên tĩnh.",
    "prefixJa": "この店は",
    "suffixJa": "静かだ。",
    "parts": [
      "駅から",
      "遠い",
      "かわりに",
      "とても"
    ],
    "starIndex": 2,
    "explanationVi": "駅から遠い + かわりに (đổi lại bù cho điểm xa ga) + とても静かだ."
  },
  {
    "id": "star_n3_12",
    "level": "N3",
    "meaningVi": "Mới sang Nhật sống nửa năm mà nói tiếng Nhật trôi chảy vậy là rất giỏi rồi.",
    "prefixJa": "日本に",
    "suffixJa": "話せるほうだ。",
    "parts": [
      "来て",
      "半年",
      "にしては",
      "よく"
    ],
    "starIndex": 2,
    "explanationVi": "来て半年 (mới tới nửa năm) + にしては (xét trên mốc đó thì) + よく話せる."
  },
  {
    "id": "star_n3_13",
    "level": "N3",
    "meaningVi": "Bất chấp trời mưa khá to, lễ hội truyền thống vẫn được tổ chức náo nhiệt.",
    "prefixJa": "激しい",
    "suffixJa": "行われた。",
    "parts": [
      "雨が",
      "降った",
      "にも",
      "かかわらず"
    ],
    "starIndex": 2,
    "explanationVi": "Thể thường + にもかかわらず (mặc dù / bất chấp mưa to vẫn diễn ra)."
  },
  {
    "id": "star_n3_14",
    "level": "N3",
    "meaningVi": "Không phải là tôi ghét cà phê đâu, chỉ là buổi tối uống xong khó ngủ thôi.",
    "prefixJa": "コーヒーが",
    "suffixJa": "眠れなくなるからだ。",
    "parts": [
      "嫌いな",
      "わけでは",
      "ないが",
      "夜飲むと"
    ],
    "starIndex": 1,
    "explanationVi": "Phủ định một phần: Aな + なわけではないが (không hẳn là ghét đâu nhưng mà...)."
  },
  {
    "id": "star_n3_15",
    "level": "N3",
    "meaningVi": "Phòng không khóa và đèn vẫn tắt, chắc chắn mọi người đã ra ngoài hết rồi.",
    "prefixJa": "部屋が",
    "suffixJa": "に違いない。",
    "parts": [
      "真っ暗",
      "だから",
      "もう",
      "出かけた"
    ],
    "starIndex": 2,
    "explanationVi": "真っ暗だから (vì tối om nên) + もう + 出かけた + に違いない (chắc chắn đã ra ngoài rồi)."
  },
  {
    "id": "star_n3_16",
    "level": "N3",
    "meaningVi": "Vì gần đây bận công việc liên tục nên người hơi có dấu hiệu thấm mệt.",
    "prefixJa": "最近ずっと",
    "suffixJa": "早退した。",
    "parts": [
      "忙しくて",
      "少し",
      "疲れぎみ",
      "なので"
    ],
    "starIndex": 2,
    "explanationVi": "Vます (疲れ) + ぎみ (hơi có dấu hiệu mệt) + なので (vì vậy nên xin về sớm)."
  },
  {
    "id": "star_n3_17",
    "level": "N3",
    "meaningVi": "Trên bàn phòng khách vẫn còn cốc trà uống dở từ sáng nay.",
    "prefixJa": "テーブルの",
    "suffixJa": "残っている。",
    "parts": [
      "上には",
      "今朝の",
      "飲みかけの",
      "お茶が"
    ],
    "starIndex": 2,
    "explanationVi": "上には + 今朝の + 飲みかけの (đang uống dở) + お茶が残っている."
  },
  {
    "id": "star_n3_18",
    "level": "N3",
    "meaningVi": "Tôi lỡ đi ra ngoài mà cứ để nguyên cửa sổ phòng ngủ mở toang mất rồi.",
    "prefixJa": "朝急いで",
    "suffixJa": "出てしまった。",
    "parts": [
      "窓を",
      "開け",
      "っぱなし",
      "で"
    ],
    "starIndex": 2,
    "explanationVi": "Vます + っぱなし + で (giữ nguyên trạng thái mở cửa sổ mà đi ra ngoài)."
  },
  {
    "id": "star_n3_19",
    "level": "N3",
    "meaningVi": "Dựa trên phản hồi của học viên, chúng tôi đã cải tiến giao diện game học tập.",
    "prefixJa": "学習者の",
    "suffixJa": "改善しました。",
    "parts": [
      "意見を",
      "もとに",
      "画面を",
      "大きく"
    ],
    "starIndex": 1,
    "explanationVi": "N + をもとに (dựa trên cơ sở ý kiến người học) + 画面を大きく改善しました."
  },
  {
    "id": "star_n3_20",
    "level": "N3",
    "meaningVi": "So với năm trước, năm nay số lượng từ vựng mình nhớ được tăng lên rất nhiều.",
    "prefixJa": "去年と",
    "suffixJa": "多くなった。",
    "parts": [
      "比べて",
      "覚えた",
      "単語が",
      "ずっと"
    ],
    "starIndex": 1,
    "explanationVi": "去年と比べて (so sánh với năm ngoái) + 覚えた単語がずっと多くなった."
  },
  {
    "id": "star_n3_21",
    "level": "N3",
    "meaningVi": "Kể từ sau khi bắt đầu dùng Flashcard mỗi ngày, tôi đọc báo Nhật nhanh hơn hẳn.",
    "prefixJa": "毎日復習を",
    "suffixJa": "速くなった。",
    "parts": [
      "始めて",
      "以来",
      "読む",
      "スピードが"
    ],
    "starIndex": 1,
    "explanationVi": "Vて + 以来 (kể từ sau khi bắt đầu ôn mỗi ngày) + 読むスピードが速くなった."
  },
  {
    "id": "star_n3_22",
    "level": "N3",
    "meaningVi": "Nếu chưa kiểm tra kỹ hợp đồng trước thì tuyệt đối đừng ký tên.",
    "prefixJa": "内容を",
    "suffixJa": "いけません。",
    "parts": [
      "よく読んで",
      "からで",
      "ないと",
      "サインしては"
    ],
    "starIndex": 1,
    "explanationVi": "Vて + からでないと (nếu chưa đọc kỹ nội dung trước thì không được ký)."
  },
  {
    "id": "star_n3_23",
    "level": "N3",
    "meaningVi": "Nhờ lần đầu sống xa nhà ở Nhật mà tôi mới hiểu sự vất vả của bố mẹ.",
    "prefixJa": "日本で",
    "suffixJa": "気づいた。",
    "parts": [
      "働いて",
      "はじめて",
      "親の",
      "大変さに"
    ],
    "starIndex": 1,
    "explanationVi": "Vて + はじめて (đi làm ở Nhật rồi lần đầu tiên mới nhận ra)."
  },
  {
    "id": "star_n3_24",
    "level": "N3",
    "meaningVi": "Một khi đã nhận trách nhiệm trưởng nhóm thì phải hỗ trợ đồng đội tới cùng.",
    "prefixJa": "リーダーを",
    "suffixJa": "支えたい。",
    "parts": [
      "引き受けた",
      "からには",
      "チームを",
      "最後まで"
    ],
    "starIndex": 1,
    "explanationVi": "Thể thường + からには (một khi đã nhận vai trò trưởng nhóm thì muốn hỗ trợ tới cùng)."
  }
];

export const INITIAL_PARTICLE_BLITZ: readonly GrammarSeedBlitzQuestion[] = [
  {
    "id": "pb_1",
    "kind": "particle",
    "level": "N5",
    "promptMain": "電車 [ ？ ] 会社へ通っています。",
    "promptSub": "Đi làm hàng ngày bằng tàu điện",
    "meaningVi": "Tôi đi làm bằng tàu điện.",
    "correct": "で",
    "choices": [
      "で",
      "に",
      "を",
      "へ"
    ],
    "tipVi": "Phương tiện di chuyển dùng trợ từ で."
  },
  {
    "id": "pb_2",
    "kind": "particle",
    "level": "N5",
    "promptMain": "毎朝 7時 [ ？ ] 起きます。",
    "promptSub": "Thời điểm cụ thể thực hiện hành động",
    "meaningVi": "Mỗi sáng tôi dậy lúc 7 giờ.",
    "correct": "に",
    "choices": [
      "に",
      "で",
      "を",
      "から"
    ],
    "tipVi": "Mốc thời gian cụ thể (7時, 月曜日) dùng trợ từ に."
  },
  {
    "id": "pb_3",
    "kind": "particle",
    "level": "N5",
    "promptMain": "図書館 [ ？ ] 日本語を勉強します。",
    "promptSub": "Địa điểm diễn ra hành động",
    "meaningVi": "Tôi học tiếng Nhật ở thư viện.",
    "correct": "で",
    "choices": [
      "で",
      "に",
      "へ",
      "が"
    ],
    "tipVi": "Nơi diễn ra hành động (đọc, học, ăn) dùng で; nơi tồn tại (ある/いる) dùng に."
  },
  {
    "id": "pb_4",
    "kind": "particle",
    "level": "N5",
    "promptMain": "机の上 [ ？ ] パソコンがあります。",
    "promptSub": "Vị trí tồn tại của đồ vật",
    "meaningVi": "Trên bàn có chiếc máy tính.",
    "correct": "に",
    "choices": [
      "に",
      "で",
      "を",
      "へ"
    ],
    "tipVi": "Đi với あります / います chỉ vị trí tồn tại dùng trợ từ に."
  },
  {
    "id": "pb_5",
    "kind": "particle",
    "level": "N5",
    "promptMain": "友達 [ ？ ] 日本語を教えてもらいました。",
    "promptSub": "Nhận sự giúp đỡ từ ai đó",
    "meaningVi": "Tôi đã được bạn chỉ cho tiếng Nhật.",
    "correct": "に",
    "choices": [
      "に",
      "を",
      "で",
      "へ"
    ],
    "tipVi": "もらう (nhận từ ai) hoặc 習う đi với người cho là に (hoặc から)."
  },
  {
    "id": "pb_6",
    "kind": "particle",
    "level": "N5",
    "promptMain": "公園の中 [ ？ ] 散歩するのが好きです。",
    "promptSub": "Đi dạo xuyên qua một không gian",
    "meaningVi": "Tôi thích đi dạo trong công viên.",
    "correct": "を",
    "choices": [
      "を",
      "で",
      "に",
      "へ"
    ],
    "tipVi": "Hành động di chuyển đi qua không gian (散歩する, 歩く, 渡る) dùng を."
  },
  {
    "id": "pb_7",
    "kind": "particle",
    "level": "N4",
    "promptMain": "次の角 [ ？ ] 右へ曲がってください。",
    "promptSub": "Điểm rẽ / đi qua giao lộ",
    "meaningVi": "Hãy rẽ phải ở góc đường tiếp theo.",
    "correct": "を",
    "choices": [
      "を",
      "に",
      "へ",
      "で"
    ],
    "tipVi": "Động từ 曲がる (rẽ), 出る (ra khỏi) đi với điểm đi qua/tách ra bằng を."
  },
  {
    "id": "pb_8",
    "kind": "particle",
    "level": "N4",
    "promptMain": "私 [ ？ ] 英語が少し話せます。",
    "promptSub": "Năng lực với thể khả năng",
    "meaningVi": "Tôi có thể nói được một chút tiếng Anh.",
    "correct": "は / が",
    "choices": [
      "は / が",
      "を",
      "で",
      "から"
    ],
    "tipVi": "Động từ thể khả năng (話せる, 分かる, できる) dùng tân ngữ đi với が (ở đây: 私は英語が...)."
  },
  {
    "id": "pb_9",
    "kind": "particle",
    "level": "N4",
    "promptMain": "姉と私 [ ？ ] 背が高いのは姉です。",
    "promptSub": "So sánh giữa 2 đối tượng",
    "meaningVi": "Giữa chị gái và tôi, người cao hơn là chị.",
    "correct": "とで",
    "choices": [
      "とで",
      "より",
      "から",
      "まで"
    ],
    "tipVi": "AとBとで〜のは... dùng khi so sánh chọn 1 trong 2."
  },
  {
    "id": "pb_10",
    "kind": "particle",
    "level": "N3",
    "promptMain": "先生に褒められたこと [ ？ ] 自信がついた。",
    "promptSub": "Lấy sự việc đó làm bước ngoặt/cơ sở",
    "meaningVi": "Nhờ được thầy khen mà tôi thêm tự tin.",
    "correct": "で",
    "choices": [
      "で",
      "を",
      "へ",
      "と"
    ],
    "tipVi": "こと + で biểu thị nguyên nhân/phương tiện dẫn tới kết quả phía sau."
  },
  {
    "id": "pb_11",
    "kind": "particle",
    "level": "N3",
    "promptMain": "私 [ ？ ] この仕事は一番のやりがいです。",
    "promptSub": "Đứng trên góc độ của bản thân",
    "meaningVi": "Đối với tôi, công việc này là nguồn cảm hứng lớn nhất.",
    "correct": "にとって",
    "choices": [
      "にとって",
      "について",
      "として",
      "によって"
    ],
    "tipVi": "N + にとって đứng trước câu đánh giá giá trị từ góc nhìn của N."
  },
  {
    "id": "pb_12",
    "kind": "particle",
    "level": "N3",
    "promptMain": "人 [ ？ ] 考え方が違います。",
    "promptSub": "Tùy thuộc vào từng người khác nhau",
    "meaningVi": "Tùy từng người mà cách suy nghĩ khác nhau.",
    "correct": "によって",
    "choices": [
      "によって",
      "にとって",
      "について",
      "に対して"
    ],
    "tipVi": "人によって〜違う (tùy người mà khác nhau) là cụm cố định hay thi N3–N2."
  },
  {
    "id": "pb_13",
    "kind": "particle",
    "level": "N2",
    "promptMain": "予算の増加 [ ？ ] 計画を見直す。",
    "promptSub": "Đi kèm với sự thay đổi đó",
    "meaningVi": "Cùng với việc tăng ngân sách, chúng ta xem xét lại kế hoạch.",
    "correct": "に伴い",
    "choices": [
      "に伴い",
      "に関わらず",
      "をはじめ",
      "どころか"
    ],
    "tipVi": "〜に伴い (kéo theo / đi kèm với biến đổi A thì B cũng đổi)."
  },
  {
    "id": "pb_14",
    "kind": "particle",
    "level": "N2",
    "promptMain": "経験の有無 [ ？ ] 応募できます。",
    "promptSub": "Bất kể có hay không",
    "meaningVi": "Bất kể có kinh nghiệm hay không đều ứng tuyển được.",
    "correct": "に関わらず",
    "choices": [
      "に関わらず",
      "に応じて",
      "に従って",
      "によって"
    ],
    "tipVi": "〜に関わらず đứng sau cặp từ trái nghĩa (có/không, nam/nữ, ngày/đêm)."
  },
  {
    "id": "pb_n3_1",
    "kind": "particle",
    "level": "N3",
    "promptMain": "日本での生活 [ ？ ] 慣れてきましたか。",
    "promptSub": "Quen dần với cuộc sống mới",
    "meaningVi": "Bạn đã quen dần với cuộc sống ở Nhật chưa?",
    "correct": "に",
    "choices": [
      "に",
      "で",
      "を",
      "へ"
    ],
    "tipVi": "Động từ 慣れる (quen với cái gì) luôn đi với trợ từ に."
  },
  {
    "id": "pb_n3_2",
    "kind": "particle",
    "level": "N3",
    "promptMain": "駅前の新しいカフェ [ ？ ] 知っていますか。",
    "promptSub": "Hỏi về sự hiểu biết thông tin chi tiết",
    "meaningVi": "Bạn có biết về quán cà phê mới trước ga không?",
    "correct": "について",
    "choices": [
      "について",
      "にとって",
      "として",
      "によって"
    ],
    "tipVi": "N + について + 知る / 調べる / 話す mang nghĩa \"về chủ đề/địa điểm đó\"."
  },
  {
    "id": "pb_n3_3",
    "kind": "particle",
    "level": "N3",
    "promptMain": "新人の田中さん [ ？ ]、この業務は少し難しい。",
    "promptSub": "Đứng từ góc độ năng lực của người mới",
    "meaningVi": "Đối với nhân viên mới Tanaka thì nghiệp vụ này hơi khó.",
    "correct": "にとって",
    "choices": [
      "にとって",
      "に対して",
      "について",
      "をもとに"
    ],
    "tipVi": "Đứng trước tính từ đánh giá (難しい, 大切だ) dùng にとって."
  },
  {
    "id": "pb_n3_4",
    "kind": "particle",
    "level": "N3",
    "promptMain": "店員は客 [ ？ ] 丁寧にお辞儀をした。",
    "promptSub": "Hành động hướng tới đối tượng",
    "meaningVi": "Nhân viên cúi chào lịch sự đối với khách hàng.",
    "correct": "に対して",
    "choices": [
      "に対して",
      "にとって",
      "につれて",
      "によって"
    ],
    "tipVi": "Thái độ hoặc hành động hướng về ai dùng に対して."
  },
  {
    "id": "pb_n3_5",
    "kind": "particle",
    "level": "N3",
    "promptMain": "この本はJLPT N3受験者 [ ？ ] 書かれました。",
    "promptSub": "Đối tượng mục tiêu mà sách hướng đến",
    "meaningVi": "Cuốn sách này được biên soạn dành riêng cho thí sinh thi JLPT N3.",
    "correct": "向けに",
    "choices": [
      "向けに",
      "向きに",
      "として",
      "ばかり"
    ],
    "tipVi": "N + 向け là biên soạn/thiết kế chủ đích dành cho đối tượng N."
  },
  {
    "id": "pb_n3_6",
    "kind": "particle",
    "level": "N3",
    "promptMain": "実話 [ ？ ] 作られた映画が大ヒットした。",
    "promptSub": "Lấy chất liệu gốc làm nền tảng",
    "meaningVi": "Bộ phim được dựng dựa trên câu chuyện có thật đã gây sốt lớn.",
    "correct": "をもとに",
    "choices": [
      "をもとに",
      "をはじめ",
      "を中心に",
      "に加えて"
    ],
    "tipVi": "Sáng tác dựa trên tư liệu gốc dùng をもとに（して）."
  },
  {
    "id": "pb_n3_7",
    "kind": "particle",
    "level": "N3",
    "promptMain": "東京 [ ？ ]、全国の主要都市で開催されます。",
    "promptSub": "Nêu một ví dụ tiêu biểu đứng đầu danh sách",
    "meaningVi": "Sự kiện được tổ chức tại nhiều thành phố lớn, tiêu biểu là Tokyo.",
    "correct": "をはじめ",
    "choices": [
      "をはじめ",
      "をもとに",
      "をめぐって",
      "に比べて"
    ],
    "tipVi": "N + をはじめ = tiêu biểu đứng đầu là N (ngoài ra còn nhiều nơi/người khác)."
  },
  {
    "id": "pb_n3_8",
    "kind": "particle",
    "level": "N3",
    "promptMain": "部長 [ ？ ] プロジェクトを進めています。",
    "promptSub": "Lấy trưởng phòng làm đầu tàu hạt nhân",
    "meaningVi": "Chúng tôi đang triển khai dự án lấy trưởng phòng làm trung tâm.",
    "correct": "を中心に",
    "choices": [
      "を中心に",
      "をはじめ",
      "に関して",
      "のかわりに"
    ],
    "tipVi": "Ai đó giữ vai trò nòng cốt dẫn dắt nhóm dùng を中心に."
  },
  {
    "id": "pb_n3_9",
    "kind": "particle",
    "level": "N3",
    "promptMain": "共通の趣味 [ ？ ]、たくさんの友達ができた。",
    "promptSub": "Thông qua cầu nối đó",
    "meaningVi": "Thông qua sở thích chung, tôi kết bạn được với rất nhiều người.",
    "correct": "を通じて",
    "choices": [
      "を通じて",
      "にとって",
      "に対して",
      "によって"
    ],
    "tipVi": "Phương tiện/cầu nối giúp đạt được kết quả dùng を通じて / を通して."
  },
  {
    "id": "pb_n3_10",
    "kind": "particle",
    "level": "N3",
    "promptMain": "前月 [ ？ ]、今月の売上が大幅に伸びた。",
    "promptSub": "So sánh đối chiếu hai mốc thời gian",
    "meaningVi": "So với tháng trước, doanh số tháng này tăng vọt rõ rệt.",
    "correct": "に比べて",
    "choices": [
      "に比べて",
      "に加えて",
      "に応じて",
      "にしたがって"
    ],
    "tipVi": "So sánh A với B để thấy chênh lệch dùng に比べて."
  },
  {
    "id": "pb_n3_11",
    "kind": "particle",
    "level": "N3",
    "promptMain": "彼は営業経験 [ ？ ]、語学スキルも高い。",
    "promptSub": "Bổ sung thêm ưu điểm chồng lên",
    "meaningVi": "Không những có kinh nghiệm kinh doanh, anh ấy còn giỏi ngoại ngữ.",
    "correct": "に加えて",
    "choices": [
      "に加えて",
      "に比べて",
      "をめぐって",
      "にかわって"
    ],
    "tipVi": "Cộng thêm điểm mạnh/yếu mới vào yếu tố sẵn có dùng に加えて."
  },
  {
    "id": "pb_n3_12",
    "kind": "particle",
    "level": "N3",
    "promptMain": "値上げ [ ？ ]、会議で賛否両論が出た。",
    "promptSub": "Xoay quanh chủ đề gây tranh luận",
    "meaningVi": "Xoay quanh việc tăng giá, cuộc họp xuất hiện cả hai luồng ý kiến đồng tình và phản đối.",
    "correct": "をめぐって",
    "choices": [
      "をめぐって",
      "をもとにして",
      "をはじめとして",
      "を通じて"
    ],
    "tipVi": "Chủ đề có tranh luận, đối lập dùng をめぐって."
  },
  {
    "id": "pb_n3_13",
    "kind": "particle",
    "level": "N3",
    "promptMain": "火曜日の夜 [ ？ ] 水曜日の朝、台風が通過する。",
    "promptSub": "Khoảng thời gian kéo dài từ A sang B",
    "meaningVi": "Từ tối thứ Ba sang sáng thứ Tư, bão sẽ đi qua.",
    "correct": "から〜にかけて",
    "choices": [
      "から〜にかけて",
      "から〜をはじめ",
      "によって〜まで",
      "として〜から"
    ],
    "tipVi": "N1 + から + N2 + にかけて biểu thị dải thời gian hoặc không gian liền mạch."
  },
  {
    "id": "pb_n3_14",
    "kind": "particle",
    "level": "N3",
    "promptMain": "先月の台風 [ ？ ]、野菜の値段が上がった。",
    "promptSub": "Nguyên nhân trang trọng dẫn tới biến động",
    "meaningVi": "Do cơn bão tháng trước mà giá rau tăng lên.",
    "correct": "によって",
    "choices": [
      "によって",
      "にとって",
      "について",
      "に対して"
    ],
    "tipVi": "N + によって có thể chỉ nguyên nhân khách quan gây ra biến đổi."
  },
  {
    "id": "pb_n3_15",
    "kind": "particle",
    "level": "N3",
    "promptMain": "私は今、エンジニア [ ？ ] 日本の会社に勤めている。",
    "promptSub": "Chức danh và vai trò công việc",
    "meaningVi": "Hiện tại tôi đang làm ở công ty Nhật với tư cách kỹ sư.",
    "correct": "として",
    "choices": [
      "として",
      "にとって",
      "について",
      "をもとに"
    ],
    "tipVi": "N + として chỉ tư cách, nghề nghiệp hoặc vai trò."
  },
  {
    "id": "pb_n3_16",
    "kind": "particle",
    "level": "N3",
    "promptMain": "体調が悪くても、電話連絡 [ ？ ] はできるだろう。",
    "promptSub": "Ít nhất việc nhỏ đó vẫn làm được",
    "meaningVi": "Dù người mệt thì ít ra một cuộc gọi báo tin cũng làm được chứ nhỉ.",
    "correct": "ぐらい",
    "choices": [
      "ぐらい",
      "ばかり",
      "ごとに",
      "おきに"
    ],
    "tipVi": "N + ぐらい (hoặc くらい) diễn tả mức tối thiểu đáng ra làm được."
  },
  {
    "id": "pb_n3_17",
    "kind": "particle",
    "level": "N3",
    "promptMain": "この薬は6時間 [ ？ ] 飲んでください。",
    "promptSub": "Chu kỳ cách quãng đều đặn",
    "meaningVi": "Xin hãy uống thuốc này cách mỗi 6 tiếng một lần.",
    "correct": "おきに",
    "choices": [
      "おきに",
      "ばかり",
      "ついでに",
      "なりに"
    ],
    "tipVi": "Khoảng cách thời gian đều đặn (6時間おきに = cứ cách 6 tiếng) dùng おきに hoặc ごとに."
  },
  {
    "id": "pb_n3_18",
    "kind": "particle",
    "level": "N3",
    "promptMain": "自分のミス [ ？ ] なのに、人のせいにしている。",
    "promptSub": "Chính lỗi của bản thân thế mà...",
    "meaningVi": "Rõ ràng là lỗi của bản thân thế mà lại đi đổ tại người khác.",
    "correct": "のくせに",
    "choices": [
      "のくせに",
      "のおかげで",
      "のかわりに",
      "のわりに"
    ],
    "tipVi": "Danh từ + の + くせに thể hiện thái độ phê phán/chê bai hành vi trái ngược."
  }
];

export const INITIAL_CONJUGATION_BLITZ: readonly GrammarSeedBlitzQuestion[] = [
  {
    "id": "cb_1",
    "kind": "conjugation",
    "level": "N5",
    "promptMain": "書く (かく) → Thể て",
    "promptSub": "Động từ nhóm 1 đuôi く",
    "meaningVi": "Viết (dùng cho 書いてください)",
    "correct": "書いて",
    "choices": [
      "書いて",
      "書って",
      "書いで",
      "書きて"
    ],
    "tipVi": "Nhóm 1 đuôi く chuyển sang いて (ngoại lệ duy nhất 行く → 行って)."
  },
  {
    "id": "cb_2",
    "kind": "conjugation",
    "level": "N5",
    "promptMain": "泳ぐ (およぐ) → Thể て",
    "promptSub": "Động từ nhóm 1 đuôi ぐ",
    "meaningVi": "Bơi lội",
    "correct": "泳いで",
    "choices": [
      "泳いで",
      "泳いて",
      "泳って",
      "泳ぎて"
    ],
    "tipVi": "Đuôi ぐ chuyển thành いで (có âm đục ở で)."
  },
  {
    "id": "cb_3",
    "kind": "conjugation",
    "level": "N5",
    "promptMain": "待つ (まつ) → Thể ない",
    "promptSub": "Động từ nhóm 1 đuôi つ",
    "meaningVi": "Không đợi",
    "correct": "待たない",
    "choices": [
      "待たない",
      "待てない",
      "待ない",
      "待らない"
    ],
    "tipVi": "Đuôi つ (t hàng た) sang cột あ là た → 待たない (cẩn thận không thành 待てない = không thể đợi)."
  },
  {
    "id": "cb_4",
    "kind": "conjugation",
    "level": "N5",
    "promptMain": "買う (かう) → Thể ない",
    "promptSub": "Động từ nhóm 1 đuôi う",
    "meaningVi": "Không mua",
    "correct": "買わない",
    "choices": [
      "買わない",
      "買あない",
      "買いない",
      "買えない"
    ],
    "tipVi": "Động từ đuôi う KHÔNG chuyển thành あ mà thành わ → 買わない."
  },
  {
    "id": "cb_5",
    "kind": "conjugation",
    "level": "N5",
    "promptMain": "来る (くる) → Thể て",
    "promptSub": "Động từ bất quy tắc nhóm 3",
    "meaningVi": "Đến",
    "correct": "来て (きて)",
    "choices": [
      "来て (きて)",
      "来て (くて)",
      "来って",
      "来ない"
    ],
    "tipVi": "Nhóm 3: 来る (くる) → 来て đọc là きて, thể ない là こない."
  },
  {
    "id": "cb_6",
    "kind": "conjugation",
    "level": "N4",
    "promptMain": "食べる (たべる) → Thể khả năng",
    "promptSub": "Động từ nhóm 2 (ăn được)",
    "meaningVi": "Có thể ăn được",
    "correct": "食べられる",
    "choices": [
      "食べられる",
      "食べれる",
      "食べさせる",
      "食べられた"
    ],
    "tipVi": "Nhóm 2 bỏ る thêm られる là chuẩn JLPT (thể れる là khẩu ngữ rút gọn hay bị trừ điểm viết)."
  },
  {
    "id": "cb_7",
    "kind": "conjugation",
    "level": "N4",
    "promptMain": "話す (はなす) → Thể khả năng",
    "promptSub": "Động từ nhóm 1 đuôi す",
    "meaningVi": "Có thể nói được",
    "correct": "話せる",
    "choices": [
      "話せる",
      "話される",
      "話させる",
      "話した"
    ],
    "tipVi": "Nhóm 1 chuyển cột う → cột え + る: す → せる → 話せる."
  },
  {
    "id": "cb_8",
    "kind": "conjugation",
    "level": "N4",
    "promptMain": "呼ぶ (よぶ) → Thể bị động (受身)",
    "promptSub": "Động từ nhóm 1 (được/bị gọi)",
    "meaningVi": "Bị / Được gọi",
    "correct": "呼ばれる",
    "choices": [
      "呼ばれる",
      "呼べる",
      "呼ばせる",
      "呼ばない"
    ],
    "tipVi": "Bị động nhóm 1: cột う → cột あ + れる (よぶ → よばれる)."
  },
  {
    "id": "cb_9",
    "kind": "conjugation",
    "level": "N4",
    "promptMain": "手伝う (てつだう) → Thể sai khiến (使役)",
    "promptSub": "Động từ nhóm 1 (bắt/cho phép ai giúp)",
    "meaningVi": "Sai / Cho phép giúp đỡ",
    "correct": "手伝わせる",
    "choices": [
      "手伝わせる",
      "手伝われる",
      "手伝える",
      "手伝わない"
    ],
    "tipVi": "Sai khiến nhóm 1: đuôi う → わ + せる → 手伝わせる."
  },
  {
    "id": "cb_10",
    "kind": "conjugation",
    "level": "N4",
    "promptMain": "する → Thể bị động (受身)",
    "promptSub": "Động từ nhóm 3 bất quy tắc",
    "meaningVi": "Bị / Được thực hiện",
    "correct": "される",
    "choices": [
      "される",
      "させる",
      "できる",
      "しられる"
    ],
    "tipVi": "する: khả năng = できる · bị động = される · sai khiến = させる."
  },
  {
    "id": "cb_11",
    "kind": "conjugation",
    "level": "N4",
    "promptMain": "大きい (おおきい) → Thể điều kiện ば",
    "promptSub": "Tính từ đuôi い",
    "meaningVi": "Nếu to / lớn thì...",
    "correct": "大きければ",
    "choices": [
      "大きければ",
      "大きなら",
      "大きくば",
      "大きえば"
    ],
    "tipVi": "Tính từ い chuyển sang điều kiện: bỏ い thêm ければ (riêng いい → よければ)."
  },
  {
    "id": "cb_12",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "読む (よむ) → Thể bị động sai khiến (使役受身)",
    "promptSub": "Bị bắt phải đọc",
    "meaningVi": "Bị ép phải đọc",
    "correct": "読まされる / 読ませられる",
    "choices": [
      "読まされる / 読ませられる",
      "読まれる",
      "読ませる",
      "読める"
    ],
    "tipVi": "Nhóm 1 (trừ đuôi す) rút gọn thành cột あ + される: 読まされる."
  },
  {
    "id": "cb_13",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "調べる (しらべる) → Thể ý định (意向形)",
    "promptSub": "Động từ nhóm 2 (\"Hãy cùng kiểm tra / Tôi sẽ kiểm tra\")",
    "meaningVi": "Hãy cùng tra cứu nào",
    "correct": "調べよう",
    "choices": [
      "調べよう",
      "調べろう",
      "調べようう",
      "調べう"
    ],
    "tipVi": "Nhóm 2 chuyển sang ý định: bỏ る thêm よう → 調べよう."
  },
  {
    "id": "cb_14",
    "kind": "conjugation",
    "level": "N2",
    "promptMain": "見る (みる) → Khiêm nhường ngữ (謙譲語)",
    "promptSub": "Nói lịch sự với sếp/khách (\"Tôi xin phép xem\")",
    "meaningVi": "Xin phép xem (khiêm nhường)",
    "correct": "拝見する (はいけんする)",
    "choices": [
      "拝見する (はいけんする)",
      "ご覧になる",
      "見られる",
      "お見になる"
    ],
    "tipVi": "ご覧になる là Tôn kính ngữ (khách xem); 拝見する là Khiêm nhường ngữ (mình xem)."
  },
  {
    "id": "cb_n3_1",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "開く (あく) → Bỏ trống với 「〜っぱなし」",
    "promptSub": "Để cửa mở toang không đóng",
    "meaningVi": "Cứ để cửa mở mãi thế",
    "correct": "開けっぱなし",
    "choices": [
      "開けっぱなし",
      "開くっぱなし",
      "開けったなし",
      "開かっぱなし"
    ],
    "tipVi": "Động từ tha động 開ける bỏ る (thể ます) + っぱなし → 開けっぱなし."
  },
  {
    "id": "cb_n3_2",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "諦める → Kết hợp 「〜ずに」 (không bỏ cuộc)",
    "promptSub": "Dạng phủ định trang trọng thay thế ないで",
    "meaningVi": "Không bỏ cuộc mà tiếp tục",
    "correct": "諦めずに",
    "choices": [
      "諦めずに",
      "諦めないずに",
      "諦めるずに",
      "諦めずで"
    ],
    "tipVi": "Lấy thân thể ない (bỏ ない) gắn ずに → 諦めずに (riêng する → せずに)."
  },
  {
    "id": "cb_n3_3",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "する → Kết hợp 「〜ずに」",
    "promptSub": "Ngoại lệ nhóm 3 cực hay thi",
    "meaningVi": "Không làm ~ mà...",
    "correct": "せずに",
    "choices": [
      "せずに",
      "しずに",
      "するずに",
      "すらずに"
    ],
    "tipVi": "Động từ nhóm 3: する + ずに luôn biến thành せずに (vd: 無理をせずに)."
  },
  {
    "id": "cb_n3_4",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "疲れる → Kết hợp 「〜ぎみ」 (hơi có dấu hiệu mệt)",
    "promptSub": "Cấu trúc Vます + ぎみ",
    "meaningVi": "Hơi thấm mệt",
    "correct": "疲れぎみ",
    "choices": [
      "疲れぎみ",
      "疲れるぎみ",
      "疲れたぎみ",
      "疲れてぎみ"
    ],
    "tipVi": "Mẫu 〜ぎみ / 〜がち đều nối trực tiếp sau Vます (bỏ ます) hoặc Danh từ."
  },
  {
    "id": "cb_n3_5",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "忘れる → Kết hợp 「〜がち」 (hay quên)",
    "promptSub": "Khuynh hướng hay mắc phải",
    "meaningVi": "Thường hay quên",
    "correct": "忘れがち",
    "choices": [
      "忘れがち",
      "忘れるがち",
      "忘れてがち",
      "忘れたがち"
    ],
    "tipVi": "Vます bỏ ます + がち → 忘れがち (hay quên)."
  },
  {
    "id": "cb_n3_6",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "読む → Kết hợp 「〜かけ」 (đang đọc dở)",
    "promptSub": "Vます + かけの N",
    "meaningVi": "Cuốn sách đang đọc dở",
    "correct": "読みかけの本",
    "choices": [
      "読みかけの本",
      "読むかけの本",
      "読んだかけの本",
      "読んでかけの本"
    ],
    "tipVi": "Vます bỏ ます + かけの + Danh từ → 読みかけの本."
  },
  {
    "id": "cb_n3_7",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "走る → Kết hợp 「〜ぬく」 (chạy bền bỉ tới đích)",
    "promptSub": "Vます + ぬく",
    "meaningVi": "Chạy xuyên suốt tới cùng",
    "correct": "走りぬく",
    "choices": [
      "走りぬく",
      "走るぬく",
      "走ってぬく",
      "走らぬく"
    ],
    "tipVi": "Động từ phức Vます + ぬく: 走る (nhóm 1) → 走りぬく."
  },
  {
    "id": "cb_n3_8",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "笑う → Kết hợp 「〜ずにはいられない」",
    "promptSub": "Không thể nhịn cười được",
    "meaningVi": "Không kìm lòng nổi phải bật cười",
    "correct": "笑わずにはいられない",
    "choices": [
      "笑わずにはいられない",
      "笑わいないではいられない",
      "笑うずにはいられない",
      "笑いずにはいられない"
    ],
    "tipVi": "Nhóm 1 đuôi う sang cột あ là わ + ず → 笑わずにはいられない."
  },
  {
    "id": "cb_n3_9",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "静かだ (Aな) → Kết hợp 「〜わりに」",
    "promptSub": "Tính từ đuôi な đứng trước わりに",
    "meaningVi": "So với vẻ yên tĩnh bên ngoài thì...",
    "correct": "静かなわりに",
    "choices": [
      "静かなわりに",
      "静かわりに",
      "静かだわりに",
      "静かのわりに"
    ],
    "tipVi": "Tính từ な giữ nguyên な trước わりに (静かなわりに), còn Danh từ dùng のわりに."
  },
  {
    "id": "cb_n3_10",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "高い (Aい) → Mẫu tăng tiến 「〜ば〜ほど」",
    "promptSub": "Càng cao thì càng...",
    "meaningVi": "Càng đắt càng...",
    "correct": "高ければ高いほど",
    "choices": [
      "高ければ高いほど",
      "高いば高いほど",
      "高くれば高いほど",
      "高ければ高ほど"
    ],
    "tipVi": "Tính từ い sang điều kiện ければ rồi lặp lại nguyên thể + ほど → 高ければ高いほど."
  },
  {
    "id": "cb_n3_11",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "便利だ (Aな) → Mẫu tăng tiến 「〜ば〜ほど」",
    "promptSub": "Càng tiện lợi càng...",
    "meaningVi": "Càng tiện càng tốt",
    "correct": "便利なら便利なほど",
    "choices": [
      "便利なら便利なほど",
      "便利であれば便利ほど",
      "便利ば便利なほど",
      "便利なばほど"
    ],
    "tipVi": "Tính từ な ghép chuẩn: Aななら + Aな + なほど → 便利なら便利なほど."
  },
  {
    "id": "cb_n3_12",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "遅れる → Thể điều kiện 「〜てからでないと」",
    "promptSub": "Nếu không kiểm tra kỹ trước thì...",
    "meaningVi": "Phải xác nhận xong trước rồi mới...",
    "correct": "確認してからでないと",
    "choices": [
      "確認してからでないと",
      "確認するからでないと",
      "確認したからでないと",
      "確認してからないと"
    ],
    "tipVi": "Bắt buộc dùng thể て đứng trước からでないと → 確認してからでないと."
  },
  {
    "id": "cb_n3_13",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "食べる → Thể ý định + 「〜とする」 (đang định ăn thì)",
    "promptSub": "Đúng lúc vừa định ăn thì...",
    "meaningVi": "Định ăn thì...",
    "correct": "食べようとした",
    "choices": [
      "食べようとした",
      "食べろうとした",
      "食べるようとした",
      "食べたいとした"
    ],
    "tipVi": "Nhóm 2 chuyển sang ý định よう + とする → 食べようとした."
  },
  {
    "id": "cb_n3_14",
    "kind": "conjugation",
    "level": "N3",
    "promptMain": "待つ → Thể sai khiến xin phép 「〜させてください」",
    "promptSub": "Xin hãy cho phép tôi suy nghĩ / đợi một chút",
    "meaningVi": "Xin vui lòng cho tôi đợi/giữ lại thêm chút",
    "correct": "待たせてください",
    "choices": [
      "待たせてください",
      "待てせてください",
      "待たれてください",
      "待っせてください"
    ],
    "tipVi": "Sai khiến nhóm 1 (待つ → 待たせる) chia thể て + ください → 待たせてください."
  }
];
