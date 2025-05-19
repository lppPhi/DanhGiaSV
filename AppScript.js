const ADMIN_EMAIL = "lpphi.1701@gmail.com";
const SPREADSHEET_ID = "1_YsKUUuEPBrFk8sswmBkPHbw-S3ySShhz11toEZoZwU";
const SHEET_NAME = "De3";
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

// doGet (Giữ nguyên)
function doGet() {
  try {
    if (!GEMINI_API_KEY) { return ContentService.createTextOutput("Error: GEMINI_API_KEY is not set in Script Properties."); }
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) { return ContentService.createTextOutput("Error: Sheet not found."); }
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    return ContentService.createTextOutput("Ready. Headers: " + headers.join(" | ") + ". Key Found.");
  } catch (e) { return ContentService.createTextOutput("Error in doGet: " + e.toString()); }
}


function doPost(e) {
  try {
    if (!GEMINI_API_KEY) { throw new Error("Gemini API Key is not configured on the server."); }

    const data = JSON.parse(e.postData.contents);
    Logger.log("Data received (doPost): " + JSON.stringify(data, null, 2));
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) { throw new Error("Sheet not found."); }

    let aiEvaluationResult = { 
        fullFeedbackForAdmin: "AI full evaluation was not performed or failed.", 
        overallSummaryForStudent: "An overall summary is currently unavailable.", 
        score: "N/A" 
    };
    try {
      aiEvaluationResult = evaluateWithGemini(data);
      Logger.log("AI Evaluation Result (doPost): " + JSON.stringify(aiEvaluationResult));
    } catch (geminiError) {
      Logger.log("Error calling Gemini (doPost): " + geminiError.toString());
      aiEvaluationResult.fullFeedbackForAdmin = "Error during AI full evaluation: " + geminiError.message;
      aiEvaluationResult.overallSummaryForStudent = "Error during AI overall summary: " + geminiError.message;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = [];
    const headerMap = {};
    headers.forEach((h, i) => {
      headerMap[h.trim().toLowerCase()] = i;  // dùng khi khớp bằng chữ thường
      headerMap[h.trim()] = i;                // fallback nếu tên cột là viết hoa
    });
    for (let i = 0; i < headers.length; i++) { newRow.push(""); }
    
    const studentInfoLowerKeys = {};
    for (const key in data.studentInfo) { studentInfoLowerKeys[key.toLowerCase()] = data.studentInfo[key];}

    for (const headerFromFile of headers) {
        const headerKey = headerFromFile.trim().toLowerCase();
        let value = "";
        switch (headerKey) {
            case "timestamp": value = new Date(); break;
            case "fullname": value = studentInfoLowerKeys.fullname || ""; break;
            case "studentid": value = studentInfoLowerKeys["studentid"] || ""; break;
            case "school": value = studentInfoLowerKeys["school"] || ""; break;
            case "studentyear": value = studentInfoLowerKeys["studentyear"] || ""; break;
            case "phone": const rawPhone = studentInfoLowerKeys["phone"] || "";
            value = rawPhone ? `'${rawPhone}` : "";  // Thêm dấu nháy đơn để ép Google Sheet hiểu là text
            break;
            case "major": value = studentInfoLowerKeys.major || ""; break;
            case "email": value = studentInfoLowerKeys.email || ""; break;
            // >>> ĐIỂM THAY ĐỔI QUAN TRỌNG KHI LƯU VÀO SHEET <<< 
            // Cột "Evaluation" trong sheet sẽ lưu nhận xét tổng quan cho sinh viên
            case "evaluation": value = aiEvaluationResult.overallSummaryForStudent || "N/A"; break; 
            case "score": value = aiEvaluationResult.score || "N/A"; break;
            default:
                if (/^q([1-9]|1[0-9]|20)$/.test(headerKey)) {
                    value = data.answers[headerKey] || "";
                }
        }
        if (headerMap.hasOwnProperty(headerKey)) { newRow[headerMap[headerKey]] = value; }
    }
    sheet.appendRow(newRow);
    Logger.log("Data appended to sheet (doPost): " + JSON.stringify(newRow));

    // Admin vẫn nhận fullFeedbackForAdmin (có thể là toàn bộ output Gemini hoặc phần chi tiết) và score
    sendAdminNotification(data, aiEvaluationResult); 
    // Sinh viên chỉ nhận overallSummaryForStudent
    sendStudentConfirmation(data, aiEvaluationResult.overallSummaryForStudent); 

    // Trả về CHỈ overallSummaryForStudent cho client
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Nộp bài thành công. Chúc bạn một ngày học tập và làm việc hiệu quả!",
      aiOverallSummary: aiEvaluationResult.overallSummaryForStudent 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("CRITICAL ERROR in doPost: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Server error: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}


function evaluateWithGemini(submissionData) {
  const studentAnswers = submissionData.answers;
  const questions = submissionData.questions;

  // >>> PROMPT ĐƯỢC CẬP NHẬT ĐỂ YÊU CẦU TIẾNG VIỆT VÀ CHỈ NHẬN XÉT TỔNG QUAN <<<
  let promptText = "Bạn là một trợ lý AI chuyên đánh giá bài kiểm tra năng lực lập trình. " +
                   "Hãy xem xét toàn bộ bài làm của sinh viên (từ câu hỏi q1 đến q20) được cung cấp dưới đây.\n" +
                   "Dựa trên tổng thể bài làm, hãy viết một ĐOẠN NHẬN XÉT TỔNG QUAN bằng TIẾNG VIỆT (khoảng 3-5 câu văn, không quá 150 từ). " +
                   "Nhận xét này cần tập trung vào chất lượng chung, những điểm mạnh (nếu có), và những lĩnh vực chính mà sinh viên cần cải thiện. " +
                   "KHÔNG được ghi \"Phần 1:\", \"Phần 2:\" hay bất kỳ nhãn đánh dấu phần nào trong đoạn nhận xét này. Chỉ cung cấp duy nhất đoạn văn bản nhận xét tổng quan.\n\n" +
                   "SAU ĐOẠN NHẬN XÉT TỔNG QUAN, vui lòng thêm các thông tin sau cho mục đích nội bộ (sử dụng các tiền tố chính xác này):\n" +
                   "INTERNAL_SCORE: [Điểm số ước tính/100] (Ví dụ: INTERNAL_SCORE: 75/100)\n" +
                   "INTERNAL_DETAILED_FEEDBACK_FOR_ADMIN:\n[Bắt đầu từ đây, bạn có thể cung cấp nhận xét chi tiết hơn về từng câu hỏi nếu muốn, hoặc một bản tóm tắt dài hơn cho quản trị viên. Phần này không hiển thị cho sinh viên.]\n\n" +
                   "Dữ liệu bài làm của sinh viên:\n";

  const questionKeys = Object.keys(studentAnswers).sort((a, b) => parseInt(a.substring(1)) - parseInt(b.substring(1)));
  questionKeys.forEach(qKey => {
    const questionText = (questions[qKey] || `Nội dung câu hỏi ${qKey.toUpperCase()} không có.`).replace(/<br\s*\/?>/gi, '\n');
    const answerText = studentAnswers[qKey] || "Sinh viên không trả lời.";
    promptText += `--- ${qKey.toUpperCase()} ---\nĐề bài: ${questionText}\nBài làm: ${answerText}\n\n`;
  });
                
  Logger.log("Prompt for Gemini (evaluateWithGemini): " + promptText);
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + GEMINI_API_KEY;
  const payload = {
    "contents": [{"parts": [{"text": promptText}]}],
    // Điều chỉnh generationConfig nếu cần
    "generationConfig": {"temperature": 0.6, "maxOutputTokens": 4096, "topP": 0.95, "topK": 40}
  };
  const options = {'method': 'post', 'contentType': 'application/json', 'payload': JSON.stringify(payload), 'muteHttpExceptions': true};

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode === 200) {
    const jsonResponse = JSON.parse(responseBody);
    if (jsonResponse.candidates && jsonResponse.candidates[0] && jsonResponse.candidates[0].content && jsonResponse.candidates[0].content.parts && jsonResponse.candidates[0].content.parts[0].text) {
      const rawGeminiOutput = jsonResponse.candidates[0].content.parts[0].text;
      Logger.log("Raw Gemini Output (evaluateWithGemini): \n" + rawGeminiOutput);

      let overallSummaryForStudent = "Không thể trích xuất nhận xét tổng quan từ AI.";
      let score = "N/A";
      let fullFeedbackForAdmin = rawGeminiOutput; // Mặc định là toàn bộ output cho admin

      const scoreMarker = "\nINTERNAL_SCORE:"; // Thêm \n để đảm bảo tách dòng
      const detailMarker = "\nINTERNAL_DETAILED_FEEDBACK_FOR_ADMIN:";

      const scoreIndex = rawGeminiOutput.indexOf(scoreMarker);
      const detailIndex = rawGeminiOutput.indexOf(detailMarker);

      // Trích xuất Nhận xét tổng quan cho sinh viên
      if (scoreIndex !== -1) {
        overallSummaryForStudent = rawGeminiOutput.substring(0, scoreIndex).trim();
      } else if (detailIndex !== -1) { // Nếu không có score marker nhưng có detail marker
        overallSummaryForStudent = rawGeminiOutput.substring(0, detailIndex).trim();
      } else { // Nếu không có marker nào, giả định toàn bộ là summary (hoặc phần đầu)
        // Cố gắng lấy đến hai dấu xuống dòng nếu có, hoặc một đoạn cố định
        const firstParagraphEnd = rawGeminiOutput.indexOf("\n\n");
        if (firstParagraphEnd !== -1 && firstParagraphEnd < 500) { // Giới hạn độ dài summary
             overallSummaryForStudent = rawGeminiOutput.substring(0, firstParagraphEnd).trim();
        } else {
            overallSummaryForStudent = rawGeminiOutput.substring(0, Math.min(rawGeminiOutput.length, 500)).trim(); // Giới hạn 500 ký tự
        }
      }
      // Loại bỏ các từ "Phần 1:", "Phần 2:" nếu chúng vẫn xuất hiện
      overallSummaryForStudent = overallSummaryForStudent.replace(/Phần \d+:/gi, "").trim();
      
      // Trích xuất điểm
      if (scoreIndex !== -1) {
        let scorePart = "";
        if(detailIndex !== -1 && detailIndex > scoreIndex){
            scorePart = rawGeminiOutput.substring(scoreIndex + scoreMarker.length, detailIndex).trim();
        } else {
            scorePart = rawGeminiOutput.substring(scoreIndex + scoreMarker.length).trim();
        }
        const scoreMatch = scorePart.match(/(\d+(\.\d+)?\s*\/\s*100)/i);
        if (scoreMatch && scoreMatch[1]) {
          score = scoreMatch[1].trim();
        }
      }
      
      // Phần fullFeedbackForAdmin có thể là toàn bộ rawGeminiOutput
      // hoặc chỉ phần sau INTERNAL_DETAILED_FEEDBACK_FOR_ADMIN: nếu bạn muốn tách rõ ràng hơn
      if (detailIndex !== -1) {
          // fullFeedbackForAdmin = rawGeminiOutput.substring(detailIndex + detailMarker.length).trim(); // Chỉ phần chi tiết
          // Hoặc giữ nguyên rawGeminiOutput để admin có đầy đủ context
      }


      Logger.log("Extracted Overall Summary for Student: " + overallSummaryForStudent);
      Logger.log("Extracted Score: " + score);
      Logger.log("Full Feedback for Admin: " + fullFeedbackForAdmin);

      return { 
        fullFeedbackForAdmin: fullFeedbackForAdmin, 
        overallSummaryForStudent: overallSummaryForStudent,
        score: score 
      };
    } else { /* ... xử lý lỗi format response ... */ throw new Error("AI response format unexpected."); }
  } else { /* ... xử lý lỗi API call ... */ throw new Error("AI evaluation failed. API Status: " + responseCode); }
}

// sendAdminNotification (Admin vẫn nhận fullFeedbackForAdmin và score)
function sendAdminNotification(data, aiEvaluationResult) {
  try {
    const subject = `New Aptitude Test Submission: ${data.studentInfo.fullName || 'N/A'} (${data.studentInfo.studentID || 'N/A'})`;
    let body = `Admin,\n\nA new submission has been received and evaluated by AI:\n\n`;
    body += `--- STUDENT INFORMATION ---\n`;
    body += `Full Name: ${data.studentInfo.fullName || ''}\nStudent ID: ${data.studentInfo.studentID || ''}\nEmail: ${data.studentInfo.email || ''}\n\n`;
    body += `--- AI EVALUATION ---\n`;
    body += `Estimated Score: ${aiEvaluationResult.score || 'N/A'}\n`;
    body += `Full AI Output (includes detailed feedback if provided by AI):\n${aiEvaluationResult.fullFeedbackForAdmin || 'N/A'}\n\n`;
    body += `View all submissions: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
    MailApp.sendEmail(ADMIN_EMAIL, subject, body);
  } catch (e) { Logger.log("Error sending admin email: " + e.toString()); }
}

// sendStudentConfirmation (Chỉ gửi overallSummaryForStudent)
function sendStudentConfirmation(data, overallAISummary) { 
  try {
    const email = data.studentInfo.email;
    if (!email || !isValidEmail(email)) { return; }
    const subject = "Your Programming Aptitude Test Submission - Initial Feedback";
    let body = `Dear ${data.studentInfo.fullName || 'Student'},\n\nThank you for completing the Programming Aptitude Test.\nWe have received your submission. Here is a brief overall feedback from our AI assistant:\n\n`;
    body += `--- OVERALL FEEDBACK ---\n`;
    body += `${overallAISummary || 'An overall summary is currently unavailable.'}\n\n`;
    body += `Please note: This is an automated preliminary feedback. Your official score and detailed evaluation (if any) will be determined after review by our instructors.\n\n`;
    body += `Best regards,\nThe Aptitude Test Committee`;
    MailApp.sendEmail(email, subject, body);
  } catch (e) { Logger.log("Error sending student email: " + e.toString()); }
}

// isValidEmail (Giữ nguyên)
function isValidEmail(email) { /* ... */ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }