// 模組一：基本資訊解析器 (Course Meta Parser)
export function parseCourseMeta(input) {
  let rawText = input
    .replace(/學年學期|開課班級|課程代號|課程名稱|選修別|學分數|授課教師/g, '')
    .trim();

  const tokens = rawText.split(/[\t\n]+|\s{2,}/).map(s => s.trim()).filter(Boolean);
  const parts = tokens.length >= 5 ? tokens : rawText.split(/\s+/).filter(Boolean);

  let term = '';
  let classInfo = '';
  let courseId = '';
  let courseName = '';
  let type = '';
  let credits = '';
  let teacher = '';

  const codeIdx = parts.findIndex(p => /[A-Z][0-9A-Z]{6,8}/.test(p));

  if (codeIdx !== -1) {
    courseId = parts[codeIdx].match(/[A-Z][0-9A-Z]{6,8}/)[0];

    const beforeCode = parts.slice(0, codeIdx);
    const termDigits = beforeCode.filter(p => /^\d+$/.test(p)).join('');
    term = termDigits || (parts[0].match(/\d+/) ? parts[0].match(/\d+/)[0] : '');

    const classPart = beforeCode.filter(p => !/^\d+$/.test(p)).join(' ');
    classInfo = classPart;

    const afterCode = parts.slice(codeIdx + 1);
    const typeIdx = afterCode.findIndex(p => /校必|系必|系選|通識|必修|選修/.test(p));

    if (typeIdx !== -1) {
      type = afterCode[typeIdx].match(/校必|系必|系選|通識|必修|選修/)[0];
      courseName = afterCode.slice(0, typeIdx).join(' ');

      const remaining = afterCode.slice(typeIdx + 1);
      if (remaining.length > 0) {
        const creditIdx = remaining.findIndex(p => /\d+/.test(p));
        if (creditIdx !== -1) {
          credits = remaining[creditIdx].match(/\d+/)[0];
          teacher = remaining.slice(creditIdx + 1).join(' ');
        } else {
          teacher = remaining.join(' ');
        }
      }
    } else {
      courseName = afterCode[0] || '';
    }
  } else {
    term = (rawText.match(/\d{3,4}/) || [''])[0];
    type = (rawText.match(/校必|系必|系選|通識|必修|選修/) || [''])[0];
  }

  return { term, classInfo, courseId, courseName, type, credits, teacher };
}

// 模組二：每週課綱與考試解析器 (Syllabus & Exam Parser) - 修正變數名稱 Error
export function parseSyllabus(input) {
  if (!input.trim()) return [];

  const rawWeeks = input
    .split(/(?=(?:第[一二三四五六七八九十0-9]+週|Week\s*\d+|第\d+週))/i)
    .filter(Boolean);

  return rawWeeks.map((text) => {
    const rawTrimmed = text.trim();

    // 1. 自動去頭：去除「第一週」、「第 1 週」、「Week 1」等前綴與冒號
    const cleanContent = rawTrimmed
      .replace(/^(?:第[一二三四五六七八九十0-9]+週|Week\s*\d+|第\d+週)[\s：:\-–—]*/i, '')
      .trim();

    // 2. 排除常見非考試字詞（如：期末回顧、學習日誌）
    const ignoreNonExamWords = rawTrimmed.replace(/期[中末](?:回顧|討論|總結|報告準備)|學習日誌|問卷/g, '');

    // 3. 判斷大考（期中考/期末考/Midterm/Final Exam）
    const isMajorExam = /期中考|期末考|期中測驗|期末測驗|期中考試|期末考試|Midterm|Final\s*Exam|\bFinal\b/i.test(ignoreNonExamWords) ||
                        (/(?:期中|期末)/.test(ignoreNonExamWords) && !/(?:回顧|討論|說明)/.test(rawTrimmed));

    // 4. 判斷小考/測驗
    const isQuiz = /(?:小考|隨堂測驗|Quiz|UnitTest|筆試)/i.test(rawTrimmed) || 
                   (/考/i.test(ignoreNonExamWords) && !/思考|參考|考慮|考察/.test(rawTrimmed));

    let highlightColor = null;

    if (isMajorExam) {
      highlightColor = '#ffcccc'; // 淺紅
    } else if (isQuiz) {
      highlightColor = '#fff3cd'; // 淺黃
    }

    return {
      content: cleanContent || rawTrimmed,
      hasExam: isMajorExam || isQuiz,
      highlightColor
    };
  });
}