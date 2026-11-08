export const MEETING_ROLES = [
  { key: 'class_leader', label: 'Lớp trưởng', caption: 'Tổng quan nền nếp và hoạt động lớp', theme: 'role-violet' },
  { key: 'vice_leader', label: 'Lớp phó', caption: 'Học tập, phong trào và tiến bộ', theme: 'role-sky' },
  { key: 'secretary', label: 'Bí thư', caption: 'Đoàn thể, tinh thần và gắn kết', theme: 'role-rose' },
  { key: 'team_1', label: 'Tổ 1', caption: 'Tiếng nói của tập thể tổ 1', theme: 'role-amber' },
  { key: 'team_2', label: 'Tổ 2', caption: 'Tiếng nói của tập thể tổ 2', theme: 'role-mint' },
  { key: 'team_3', label: 'Tổ 3', caption: 'Tiếng nói của tập thể tổ 3', theme: 'role-indigo' }
];
export const safeMeetingText = value => String(value ?? '').slice(0,4000);
export function countMeetingProgress(reports=[]) {
  return {
    submitted: reports.filter(r => Boolean(r.submitted_at)).length,
    filled: reports.filter(r => Boolean((r.general||'').trim() || (r.strengths||'').trim() || (r.limitations||'').trim())).length,
    assigned: reports.filter(r => Boolean(r.assigned_to)).length
  };
}
export function formatMeetingPlainText(meeting, byKey={}) {
  const parts = [`BIÊN BẢN SINH HOẠT LỚP`, meeting?.title || 'Buổi sinh hoạt', meeting?.theme || '', ''];
  for (const r of MEETING_ROLES) {
    const item=byKey[r.key];
    parts.push(r.label.toUpperCase(), `1. Tình hình chung:`, item?.general?.trim() || '(Chưa ghi nhận)',
      `2. Ưu điểm:`, item?.strengths?.trim() || '(Chưa ghi nhận)',
      `3. Hạn chế & vi phạm:`, item?.limitations?.trim() || '(Chưa ghi nhận)', '');
  }
  return parts.join('\n');
}
