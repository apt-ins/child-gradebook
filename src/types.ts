import type {ExamType} from '../shared/exam-types.js';
export interface Score {subject:string;score:number;max:number}
export interface Exam {id:string;title:string;examType?:ExamType;classRank?:number;gradeRank?:number;date:string;grade:string;term:string;scores:Score[];note:string}
export interface Photo {id:string;examId:string;label:string}
export interface Profile {nickname:string;subjects:string[]}
export interface Data {profile:Profile;exams:Exam[];photos:Photo[];recoveryAvailable?:boolean}
