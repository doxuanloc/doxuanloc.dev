import { localizedPath, type Lang } from '../i18n/ui';

export interface SelectedWork {
  id: string;
  category: string;
  title: string;
  summary: string;
  challenge: string;
  approach: string;
  focus: string[];
  stack: string[];
  href: string;
  visual: 'agent' | 'voice' | 'security';
}

const copy = {
  en: {
    hero: { eyebrow: 'Do Xuan Loc · Engineer & founder', title: 'AI that works.', line2: 'Systems that last.', summary: 'I build production AI systems with reliability, security, and operating cost in mind. From the interface to the inference pipeline.', primary: 'Explore selected work', secondary: 'Let’s talk', location: 'Based in Ho Chi Minh City · Working across borders' },
    sections: { workEyebrow: 'Selected work', workTitle: 'Complex problems. Clear decisions.', workSummary: 'A closer look at how I connect product experience, system architecture, and AI accountability.', experienceEyebrow: 'The work behind the work', experienceTitle: 'Building. Leading. Learning.', experienceSummary: 'Full-stack foundations, enterprise systems, and a growing focus on production AI and developer tooling.', writingEyebrow: 'Field notes', writingTitle: 'Ideas from the engineering floor.', writingSummary: 'Systems, AI, and the decisions that connect them.', contactEyebrow: 'Let’s build something worthwhile', contactTitle: 'Your next difficult problem.', contactSummary: 'For conversations about production AI, software architecture, or building a product together.', contactCta: 'Start a conversation', viewAll: 'Explore experience', readMore: 'Read article', challenge: 'The challenge', approach: 'The approach', projectCta: 'Explore the work' },
    experience: { eyebrow: 'Experience', title: 'From building features to shaping systems.', summary: 'The roles, projects, and engineering decisions behind my work.', focusLabel: 'Current focus · October 2026', focusTitle: 'Closer to the real operating conditions.', focusSummary: 'Recent work connects AI evaluation, security verification, and agent tooling to the way people use systems.', updated: 'Updated October 2026', careerTitle: 'Career & selected projects', projectDetails: 'Contributions & technical details', present: 'Present', sideTitle: 'Independent builds.', sideEyebrow: 'Beyond the day job', educationTitle: 'The foundations.', educationEyebrow: 'Education' },
    recentFocus: [
      { title: 'Production AI evaluation', description: 'Recording quality, transcription, diarization, and speaker roles—evaluated together with the downstream workflow.' },
      { title: 'Security verification', description: 'Trace findings to evidence, inspect release risks, and make the next action clear for the engineering team.' },
      { title: 'AI product operations', description: 'Photo and listing-copy workflows, data synchronization, storage lifecycles, and cloud cost.' },
      { title: 'Agent tooling & privacy', description: 'Local developer workflows, tool permissions, session history, and careful handling of information in logs.' },
    ],
    selectedWork: [
      { id: 'agent-tooling', category: "Developer tools · Valixara · v1.0.3", title: "Xem IDE. Keep the whole picture.", summary: "A macOS workspace for projects, AI sessions, and an inspectable action history. Built for working across repositories without losing context.", challenge: "Projects, conversations, and the effects of AI actions are spread across different tools.", approach: "Bring a multi-pane workbench, resumable conversations, project knowledge, and a hash-chained action ledger into one local-first desktop app.", focus: ["Multi-pane workspace", "Session history", "AI action ledger"], stack: ['Rust', 'Tauri 2', 'React 19', 'SQLite'], visual: 'agent' as const },
      { id: 'production-ai', category: 'Production AI · Voice intelligence', title: 'Turn conversations into context.', summary: 'Call recordings, transcription, speaker separation, and structured summaries connected in one workflow.', challenge: 'Real audio brings noise, overlapping speech, and inconsistent recording conditions.', approach: 'Pair event-driven inference with structured extraction, observability, and evaluation at each stage.', focus: ['Audio evaluation', 'Structured extraction', 'Async inference'], stack: ['Python', 'AWS', 'Whisper', 'NeMo'], visual: 'voice' as const },
      { id: 'security-engineering', category: 'Security · Engineering systems', title: 'Give findings an evidence trail.', summary: 'An AI-assisted security review harness designed around machine-verifiable findings.', challenge: 'A plausible finding still needs a traceable basis before it can drive an engineering decision.', approach: 'Combine established scanners, reproducible checks, and code-assigned verdicts with AI assistance.', focus: ['Proof-based review', 'Release risk', 'DevSecOps'], stack: ['Python', 'LangGraph', 'Semgrep', 'Trivy'], visual: 'security' as const },
    ],
  },
  vi: {
    hero: { eyebrow: 'Đỗ Xuân Lộc · Kỹ sư & nhà sáng lập', title: 'AI tạo giá trị.', line2: 'Hệ thống bền vững.', summary: 'Tôi xây hệ thống AI cho môi trường thực tế, cân bằng độ tin cậy, bảo mật và chi phí vận hành. Từ giao diện đến pipeline suy luận.', primary: 'Khám phá dự án', secondary: 'Cùng trao đổi', location: 'TP. Hồ Chí Minh · Cộng tác xuyên biên giới' },
    sections: { workEyebrow: 'Dự án tiêu biểu', workTitle: 'Bài toán phức tạp. Quyết định rõ ràng.', workSummary: 'Cách tôi kết nối trải nghiệm sản phẩm, kiến trúc hệ thống và khả năng kiểm chứng hành động của AI.', experienceEyebrow: 'Nền tảng phía sau sản phẩm', experienceTitle: 'Xây dựng. Dẫn dắt. Học hỏi.', experienceSummary: 'Từ nền tảng full-stack đến hệ thống doanh nghiệp, AI production và công cụ cho lập trình viên.', writingEyebrow: 'Ghi chép kỹ thuật', writingTitle: 'Góc nhìn từ công việc thực tế.', writingSummary: 'Hệ thống, AI và những quyết định kết nối chúng.', contactEyebrow: 'Cùng xây điều có giá trị', contactTitle: 'Bài toán khó tiếp theo của bạn.', contactSummary: 'Trao đổi về AI production, kiến trúc phần mềm hoặc cùng xây một sản phẩm.', contactCta: 'Bắt đầu trao đổi', viewAll: 'Xem kinh nghiệm', readMore: 'Đọc bài viết', challenge: 'Bài toán', approach: 'Cách tiếp cận', projectCta: 'Xem chi tiết dự án' },
    experience: { eyebrow: 'Kinh nghiệm', title: 'Từ xây tính năng đến định hình hệ thống.', summary: 'Vai trò, dự án và những quyết định kỹ thuật trong công việc của tôi.', focusLabel: 'Trọng tâm hiện tại · Tháng 10/2026', focusTitle: 'Gần hơn với điều kiện vận hành thực tế.', focusSummary: 'Công việc gần đây kết nối đánh giá AI, kiểm chứng bảo mật và công cụ agent với cách con người sử dụng hệ thống.', updated: 'Cập nhật tháng 10/2026', careerTitle: 'Sự nghiệp & dự án tiêu biểu', projectDetails: 'Đóng góp & chi tiết kỹ thuật', present: 'Nay', sideTitle: 'Sản phẩm tự xây.', sideEyebrow: 'Ngoài công việc chính', educationTitle: 'Nền tảng ban đầu.', educationEyebrow: 'Học vấn' },
    recentFocus: [
      { title: 'Đánh giá AI production', description: 'Chất lượng ghi âm, transcription, phân tách người nói và vai trò người nói—đánh giá cùng luồng sử dụng phía sau.' },
      { title: 'Kiểm chứng bảo mật', description: 'Truy finding về bằng chứng, kiểm tra rủi ro release và làm rõ hành động tiếp theo cho đội kỹ thuật.' },
      { title: 'Vận hành sản phẩm AI', description: 'Luồng ảnh và mô tả sản phẩm, đồng bộ dữ liệu, vòng đời lưu trữ và chi phí đám mây.' },
      { title: 'Công cụ agent & quyền riêng tư', description: 'Luồng phát triển cục bộ, quyền thực thi công cụ, lịch sử phiên và xử lý thông tin cẩn trọng trong log.' },
    ],
    selectedWork: [
      { id: 'agent-tooling', category: "Công cụ lập trình · Valixara · v1.0.3", title: "Xem IDE. Nắm toàn cảnh công việc.", summary: "Workspace macOS cho dự án, phiên AI và lịch sử hành động có thể đối chiếu. Làm việc qua nhiều repository mà vẫn giữ được ngữ cảnh.", challenge: "Dự án, hội thoại và thay đổi do AI tạo ra nằm rải rác ở nhiều công cụ.", approach: "Kết nối bàn làm việc nhiều pane, hội thoại có thể tiếp tục, tri thức dự án và sổ cái hành động hash-chain trong một ứng dụng desktop local-first.", focus: ["Workspace nhiều pane", "Lịch sử phiên", "Nhật ký hành động AI"], stack: ['Rust', 'Tauri 2', 'React 19', 'SQLite'], visual: 'agent' as const },
      { id: 'production-ai', category: 'AI production · Phân tích hội thoại', title: 'Biến hội thoại thành ngữ cảnh.', summary: 'Kết nối ghi âm, transcription, phân tách người nói và tóm tắt có cấu trúc trong một luồng.', challenge: 'Âm thanh thực tế có nhiễu, giọng nói chồng lấn và điều kiện ghi âm khác nhau.', approach: 'Kết hợp suy luận hướng sự kiện với trích xuất có cấu trúc, observability và đánh giá từng công đoạn.', focus: ['Đánh giá âm thanh', 'Trích xuất cấu trúc', 'Suy luận bất đồng bộ'], stack: ['Python', 'AWS', 'Whisper', 'NeMo'], visual: 'voice' as const },
      { id: 'security-engineering', category: 'Bảo mật · Hệ thống kỹ thuật', title: 'Mỗi finding có dấu vết bằng chứng.', summary: 'Công cụ review bảo mật có AI hỗ trợ, xây quanh finding có bằng chứng kiểm chứng được bằng máy.', challenge: 'Finding nghe hợp lý vẫn cần cơ sở có thể truy vết trước khi trở thành quyết định kỹ thuật.', approach: 'Kết hợp scanner chuyên dụng, kiểm tra có thể tái hiện và verdict do mã xác định với AI hỗ trợ.', focus: ['Review theo bằng chứng', 'Rủi ro release', 'DevSecOps'], stack: ['Python', 'LangGraph', 'Semgrep', 'Trivy'], visual: 'security' as const },
    ],
  },
  ja: {
    hero: { eyebrow: 'Do Xuan Loc · エンジニア・創業者', title: '実務に届くAI。', line2: '長く使えるシステム。', summary: '信頼性、セキュリティ、運用コストを考慮した本番AIシステムを構築しています。インターフェースから推論パイプラインまで。', primary: '主なプロジェクトを見る', secondary: '相談する', location: 'ホーチミン市を拠点に、国境を越えて協働' },
    sections: { workEyebrow: '主なプロジェクト', workTitle: '複雑な課題に、明確な判断を。', workSummary: 'プロダクト体験、システム設計、AIの行動を検証する仕組みをどう結び付けるか。', experienceEyebrow: 'プロダクトを支える経験', experienceTitle: 'つくる。導く。学ぶ。', experienceSummary: 'フルスタック開発を基礎に、企業システム、本番AI、開発者向けツールへ。', writingEyebrow: '技術ノート', writingTitle: '開発現場からの考察。', writingSummary: 'システム、AI、そして両者を結ぶ設計判断。', contactEyebrow: '価値あるものを、一緒に', contactTitle: '次の難しい課題を。', contactSummary: '本番AI、ソフトウェア設計、共同でのプロダクト開発についてご相談ください。', contactCta: '相談を始める', viewAll: '経歴を見る', readMore: '記事を読む', challenge: '課題', approach: 'アプローチ', projectCta: '取り組みを見る' },
    experience: { eyebrow: '経歴', title: '機能の実装から、システムの設計へ。', summary: 'これまでの役割、プロジェクト、そして技術的な判断。', focusLabel: '現在の重点領域 · 2026年10月', focusTitle: '実際の運用条件に、より近く。', focusSummary: 'AI評価、セキュリティ検証、エージェント向けツールを、人がシステムを使う現場につなげています。', updated: '2026年10月更新', careerTitle: '経歴と主なプロジェクト', projectDetails: '担当内容と技術詳細', present: '現在', sideTitle: '自主開発プロダクト。', sideEyebrow: '本業の外でも', educationTitle: '技術の基礎。', educationEyebrow: '学歴' },
    recentFocus: [
      { title: '本番AIの評価', description: '録音品質、文字起こし、話者分離、話者の役割を、後続の業務フローと合わせて評価。' },
      { title: 'セキュリティ検証', description: '指摘を証拠まで追跡し、リリースのリスクと開発チームが次に取る行動を明確に。' },
      { title: 'AIプロダクトの運用', description: '商品写真と説明文のワークフロー、データ同期、保存ライフサイクル、クラウドコスト。' },
      { title: 'エージェントツールとプライバシー', description: 'ローカル開発フロー、ツールの実行権限、セッション履歴、ログ内情報の慎重な取り扱い。' },
    ],
    selectedWork: [
      { id: 'agent-tooling', category: "開発者ツール · Valixara · v1.0.3", title: "Xem IDE。仕事の全体像をつかむ。", summary: "プロジェクト、AIセッション、確認できる操作履歴をまとめるmacOSワークスペース。複数のリポジトリを扱いながら文脈を保ちます。", challenge: "プロジェクト、会話、AIによる変更が複数のツールに分散しています。", approach: "複数ペインの作業画面、再開できる会話、プロジェクト知識、ハッシュチェーンの操作台帳を、ローカル中心のデスクトップアプリにまとめます。", focus: ["複数ペイン", "セッション履歴", "AI操作台帳"], stack: ['Rust', 'Tauri 2', 'React 19', 'SQLite'], visual: 'agent' as const },
      { id: 'production-ai', category: '本番AI · 音声分析', title: '会話を、使える文脈へ。', summary: '録音、文字起こし、話者分離、構造化要約を一つの業務フローに接続。', challenge: '実際の音声には、雑音、発話の重なり、録音条件のばらつきがあります。', approach: 'イベント駆動の推論に、構造化抽出、可観測性、工程ごとの評価を組み合わせます。', focus: ['音声評価', '構造化抽出', '非同期推論'], stack: ['Python', 'AWS', 'Whisper', 'NeMo'], visual: 'voice' as const },
      { id: 'security-engineering', category: 'セキュリティ · 開発基盤', title: '指摘に、証拠の道筋を。', summary: '機械で検証できる指摘を中心に設計した、AI支援のセキュリティレビューツール。', challenge: '妥当に見える指摘にも、開発判断につなげる前に追跡可能な根拠が必要です。', approach: '専用スキャナー、再現可能な検証、コードによる判定をAI支援と組み合わせます。', focus: ['証拠に基づくレビュー', 'リリースリスク', 'DevSecOps'], stack: ['Python', 'LangGraph', 'Semgrep', 'Trivy'], visual: 'security' as const },
    ],
  },
};

export function getPortfolioCopy(lang: Lang) {
  const localized = copy[lang];
  return {
    ...localized,
    selectedWork: localized.selectedWork.map((work): SelectedWork => ({ ...work, href: `${localizedPath('/experience', lang)}#${work.id}` })),
  };
}
