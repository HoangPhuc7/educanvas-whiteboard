import test from 'node:test';
import assert from 'node:assert/strict';
import { MEETING_ROLES, safeMeetingText, countMeetingProgress, formatMeetingPlainText } from '../src/lib/meetingUtils.js';

test('six distinct roles in required order', () => {
  assert.equal(MEETING_ROLES.length, 6);
  assert.equal(new Set(MEETING_ROLES.map(x=>x.key)).size, 6);
  assert.deepEqual(MEETING_ROLES.map(x=>x.label), ['Lớp trưởng','Lớp phó','Bí thư','Tổ 1','Tổ 2','Tổ 3']);
});
test('count progress separately for assignments, drafts and submissions', () => {
  assert.deepEqual(countMeetingProgress([
    { general:'a', strengths:'',limitations:'',submitted_at:null,assigned_to:'a'},
    { general:'',strengths:'good',limitations:'',submitted_at:'2026-11-08',assigned_to:'b'},
    { general:'',strengths:'',limitations:'',submitted_at:null,assigned_to:null}
  ]), { assigned:2, filled:2, submitted:1 });
});
test('sanitize report text length preserving unicode', () => {
  assert.equal(safeMeetingText('✓ Tiến bộ'), '✓ Tiến bộ');
  assert.equal(safeMeetingText('a'.repeat(9000)).length, 4000);
  assert.equal(safeMeetingText(null), '');
});
test('summary includes 6 reports and all three headings', () => {
  const summary = formatMeetingPlainText({title:'Tuần 12',theme:'Cùng tiến bộ'}, {class_leader:{general:'Nền nếp tốt',strengths:'Đúng giờ',limitations:'Chuyên cần'}});
  for (const role of MEETING_ROLES) assert.ok(summary.includes(role.label.toUpperCase()));
  assert.ok(summary.includes('Nền nếp tốt'));
  assert.equal((summary.match(/Tình hình chung:/g)||[]).length,6);
  assert.equal((summary.match(/Ưu điểm:/g)||[]).length,6);
  assert.equal((summary.match(/Hạn chế & vi phạm:/g)||[]).length,6);
});
