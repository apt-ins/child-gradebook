import type {Data} from './types';
const subjects=['语文','数学','英语','物理','化学','生物','道德与法治','历史','地理'];
export const journeyDemo:Data={profile:{nickname:'小禾',subjects},exams:[
 {id:'demo-3',title:'秋季期中考试',examType:'期中',date:'2026-11-06',grade:'初一',term:'2026–2027学年 上学期',classRank:5,gradeRank:27,scores:subjects.map((s,i)=>({subject:s,score:[108,112,109,87,86,92,89,90,88][i]!,max:i<3?120:100})),note:'作文得到了老师的表扬。\n回家的路上，你说终于敢举手读给大家听了。'},
 {id:'demo-2',title:'十月月考',examType:'月考',date:'2026-10-16',grade:'初一',term:'2026–2027学年 上学期',classRank:8,gradeRank:41,scores:subjects.slice(0,6).map((s,i)=>({subject:s,score:[102,108,105,82,79,87][i]!,max:i<3?120:100})),note:'这次记得检查计算过程了。'},
 {id:'demo-1',title:'第一次月考',examType:'月考',date:'2026-09-18',grade:'初一',term:'2026–2027学年 上学期',scores:subjects.slice(0,3).map((s,i)=>({subject:s,score:[96,101,102][i]!,max:120})),note:'新学期，慢慢找到自己的节奏。'}
],photos:[{id:'demo-photo',examId:'demo-3',label:'示例试卷（虚构档案）'}]};
