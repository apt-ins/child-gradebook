export type ExamType = '月考' | '期中' | '期末' | '自定义';
export const EXAM_TYPES: readonly ExamType[];
export function getExamType(exam: {examType?: string; title?: string}): ExamType | undefined;
