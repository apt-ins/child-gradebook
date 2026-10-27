export const EXAM_TYPES = Object.freeze(['月考', '期中', '期末', '自定义']);
// Legacy records are displayed by an unambiguous title match, without rewriting data.
export function getExamType(exam) {
  if (EXAM_TYPES.includes(exam.examType)) return exam.examType;
  const matches = EXAM_TYPES.filter(type => type !== '自定义' && (exam.title || '').includes(type));
  return matches.length === 1 ? matches[0] : undefined;
}
