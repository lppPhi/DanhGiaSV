// --- START OF FILE Code.gs ---

// --- CONFIGURATION ---
const ADMIN_EMAIL = "lpphi.1701@gmail.com"; // Giữ nguyên
const SPREADSHEET_ID = "1_YsKUUuEPBrFk8sswmBkPHbw-S3ySShhz11toEZoZwU"; // Giữ nguyên
const SHEET_NAME = "De3"; // Giữ nguyên
// GEMINI_API_KEY IS NO LONGER NEEDED HERE as it's moved to client-side script.js

// doGet (Can be simplified or kept for basic check)
function doGet() {
  try {
    // const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    // if (!sheet) { return ContentService.createTextOutput("Error: Sheet not found."); }
    // const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    // return ContentService.createTextOutput("Ready. Headers: " + headers.join(" | ") + ". Key Found (on client).");
    return ContentService.createTextOutput("Google Apps Script is ready. AI evaluation is handled client-side.");
  } catch (e) {
    return ContentService.createTextOutput("Error in doGet: " + e.toString());
  }
}


function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    Logger.log("Data received (doPost from client with AI eval): " + JSON.stringify(data, null, 2));
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) { throw new Error("Sheet not found."); }

    // AI Evaluation results are now expected from the client
    let clientAIEvaluation = data.aiEvaluation || {};
    let aiOverallSummary = clientAIEvaluation.overallSummaryForStudent || "AI summary not provided or failed on client.";
    let aiScore = clientAIEvaluation.score || "N/A";
    let aiFullFeedbackForAdmin = clientAIEvaluation.fullFeedbackForAdmin || "AI full feedback not provided or failed on client.";

    Logger.log("Parsed AI Overall Summary from client: " + aiOverallSummary);
    Logger.log("Parsed AI Score from client: " + aiScore);
    Logger.log("Parsed AI Full Feedback for Admin from client: " + aiFullFeedbackForAdmin);

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = [];
    const headerMap = {};
    headers.forEach((h, i) => {
      headerMap[h.trim().toLowerCase()] = i;
      headerMap[h.trim()] = i; 
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
                          value = rawPhone ? `'${rawPhone}` : ""; break;
            case "major": value = studentInfoLowerKeys.major || ""; break;
            case "email": value = studentInfoLowerKeys.email || ""; break;
            case "evaluation": value = aiOverallSummary; break; // Use summary from client
            case "score": value = aiScore; break; // Use score from client
            default:
                if (/^q([1-9]|1[0-9]|20)$/.test(headerKey)) {
                    value = data.answers[headerKey] || "";
                }
        }
        if (headerMap.hasOwnProperty(headerKey)) { newRow[headerMap[headerKey]] = value; }
    }
    sheet.appendRow(newRow);
    Logger.log("Data appended to sheet (doPost): " + JSON.stringify(newRow));

    // Admin receives full feedback (which client constructed) and score
    sendAdminNotification(data.studentInfo, aiScore, aiFullFeedbackForAdmin); 
    // Student receives overall summary (which client constructed)
    sendStudentConfirmation(data.studentInfo, aiOverallSummary); 

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Nộp bài thành công. Chúc bạn một ngày học tập và làm việc hiệu quả!",
      aiOverallSummary: aiOverallSummary // Pass back the summary (originally from client) for display
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("CRITICAL ERROR in doPost: " + error.toString() + " Stack: " + error.stack);
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Server error: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// evaluateWithGemini function is REMOVED as this logic is now in script.js

// sendAdminNotification (Adjusted to take aiScore and aiFullFeedbackForAdmin directly)
function sendAdminNotification(studentInfo, score, fullFeedbackForAdmin) {
  try {
    const subject = `New Aptitude Test Submission: ${studentInfo.fullName || 'N/A'} (${studentInfo.studentID || 'N/A'})`;
    let body = `Admin,\n\nA new submission has been received. AI evaluation was performed client-side:\n\n`;
    body += `--- STUDENT INFORMATION ---\n`;
    body += `Full Name: ${studentInfo.fullName || ''}\nStudent ID: ${studentInfo.studentID || ''}\nEmail: ${studentInfo.email || ''}\n\n`;
    body += `--- AI EVALUATION (FROM CLIENT) ---\n`;
    body += `Estimated Score: ${score || 'N/A'}\n`;
    body += `Full AI Output (includes detailed feedback if provided by AI):\n${fullFeedbackForAdmin || 'N/A'}\n\n`;
    body += `View all submissions: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
    MailApp.sendEmail(ADMIN_EMAIL, subject, body);
  } catch (e) { Logger.log("Error sending admin email: " + e.toString()); }
}

// sendStudentConfirmation (Adjusted to take studentInfo and overallAISummary directly)
function sendStudentConfirmation(studentInfo, overallAISummary) { 
  try {
    const email = studentInfo.email;
    if (!email || !isValidEmail(email)) { Logger.log("Invalid or missing student email: " + email); return; }
    const subject = "Your Programming Aptitude Test Submission - Initial Feedback";
    let body = `Dear ${studentInfo.fullName || 'Student'},\n\nThank you for completing the Programming Aptitude Test.\nWe have received your submission. Here is a brief overall feedback from our AI assistant (generated based on your input):\n\n`;
    body += `--- OVERALL FEEDBACK ---\n`;
    body += `${overallAISummary || 'An overall summary is currently unavailable.'}\n\n`;
    body += `Please note: This is an automated preliminary feedback. Your official score and detailed evaluation (if any) will be determined after review by our instructors.\n\n`;
    body += `Best regards,\nThe Aptitude Test Committee`;
    MailApp.sendEmail(email, subject, body);
  } catch (e) { Logger.log("Error sending student email: " + e.toString()); }
}

// isValidEmail (Giữ nguyên)
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

// --- END OF FILE Code.gs ---