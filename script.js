// --- START OF FILE script.js ---

document.addEventListener('DOMContentLoaded', function() {
    // --- URL GOOGLE APPS SCRIPT WEB APP ---
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxFzvaERLwnT3VXt6JwuxjgMV5m1KIN3jZCLSOMbG2c6imnHq2TDksdz-LYN0bLw1ZM/exec'; // GIỮ NGUYÊN URL CỦA BẠN

    // --- GEMINI API CONFIGURATION (CLIENT-SIDE) ---
    // !!!!! WARNING: EXPOSING API KEY IN CLIENT-SIDE CODE IS A SECURITY RISK !!!!!
    // !!!!! FOR PRODUCTION, KEEP API KEY ON THE SERVER (LIKE GOOGLE APPS SCRIPT) !!!!!
    const GEMINI_API_KEY_CLIENT = "AIzaSyCLPTpFTj55F_7GQI2eCUSnUk9thOiZ1iA"; // <<<<< THAY THẾ BẰNG API KEY CỦA BẠN
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY_CLIENT}`;

    // --- KHAI BÁO BIẾN ĐỂ LƯU DỮ LIỆU CÂU HỎI SAU KHI TẢI ---
    let theoryQuestionsData = [];
    let practicalQuestionsData = [];

    // --- DOM ELEMENTS ---
    const theoryContainer = document.getElementById('theory-questions-container');
    const practicalContainer = document.getElementById('practical-questions-container');
    const assessmentForm = document.getElementById('assessment-form');
    const submitButton = document.getElementById('submit-button');
    const submitButtonText = document.getElementById('submit-button-text');
    const submitLoader = document.getElementById('submit-loader');
    const formStatusMessage = document.getElementById('form-status-message');
    const aiFeedbackContainer = document.getElementById('ai-feedback-container');
    const studentFieldIds = ['student-name', 'student-id', 'student-school', 'student-major', 'student-email', 'student-phone','student-studentyear'];

    // --- HÀM TẠO HTML CHO CÂU HỎI (GIỮ NGUYÊN) ---
    function createQuestionHTML(question) {
        let optionsHTML = '';
        if (question.type === "mcq" && question.options) {
            optionsHTML = question.options.map(opt =>
                `<div class="option-wrapper">
                   <input type="radio" name="${question.name}" value="${opt.value}" id="${question.name}-${opt.value}">
                   <label for="${question.name}-${opt.value}">${opt.label}</label>
                 </div>`
            ).join('');
        }
        let answerFieldHTML = '';
        if (question.type === "mcq") {
            answerFieldHTML = `<div class="options">${optionsHTML}</div>`;
        } else if (question.type === "textarea") {
            answerFieldHTML = `<textarea name="${question.name}" placeholder="${question.placeholder || ''}" rows="${question.rows || 5}"></textarea>`;
        }
        return `<div class="question-block card">
                  <p class="question-title">Câu ${question.id}: ${question.category}</p>
                  <p class="question-text">${question.text}</p>
                  ${answerFieldHTML}
                </div>`;
    }

    // --- HÀM GỌI GEMINI API TỪ CLIENT-SIDE ---
    async function getAIFeedbackFromClient(submissionData) {
        if (!GEMINI_API_KEY_CLIENT || GEMINI_API_KEY_CLIENT === "YOUR_GEMINI_API_KEY_HERE") {
            console.warn("Gemini API Key is not configured or is a placeholder on the client-side. Skipping AI evaluation.");
            throw new Error("Client-side Gemini API Key not configured.");
        }

        const studentAnswers = submissionData.answers;
        const questions = submissionData.questions;

        let promptText = "Bạn là một trợ lý AI chuyên đánh giá bài kiểm tra năng lực lập trình. " +
                        "Hãy xem xét toàn bộ bài làm của sinh viên (từ câu hỏi q1 đến q20) được cung cấp dưới đây.\n" +
                        "Dựa trên tổng thể bài làm, hãy viết một ĐOẠN NHẬN XÉT TỔNG QUAN bằng TIẾNG VIỆT (3–5 câu, không quá 150 từ).\n" +
                        "Nhận xét nên thể hiện tinh thần khích lệ, tập trung vào những điểm tích cực (nếu có) và những kỹ năng sinh viên có thể cải thiện để tiến bộ hơn. " +
                        "Nếu bài làm chưa tốt, vui lòng tránh những từ ngữ mang tính chê trách; thay vào đó, hãy khuyến khích sinh viên cố gắng hơn trong những lần tới.\n" +
                        "KHÔNG được sử dụng các tiêu đề như \"Phần 1:\", \"Phần 2:\" hay bất kỳ nhãn đánh dấu nào. Chỉ cung cấp đoạn văn nhận xét duy nhất.\n\n" +
                        "SAU ĐOẠN NHẬN XÉT TỔNG QUAN, vui lòng thêm các thông tin sau cho mục đích nội bộ (dùng đúng định dạng):\n" +
                        "INTERNAL_SCORE: [Điểm số ước tính/100] (Ví dụ: INTERNAL_SCORE: 75/100)\n" +
                        "INTERNAL_DETAILED_FEEDBACK_FOR_ADMIN:\n[Bạn có thể trình bày nhận xét chi tiết hơn về từng câu hỏi hoặc đánh giá mở rộng cho quản trị viên. Phần này sẽ không hiển thị cho sinh viên.]\n\n" +
                        "Dữ liệu bài làm của sinh viên:\n";

        const questionKeys = Object.keys(studentAnswers).sort((a, b) => parseInt(a.substring(1)) - parseInt(b.substring(1)));
        questionKeys.forEach(qKey => {
            const questionText = (questions[qKey] || `Nội dung câu hỏi ${qKey.toUpperCase()} không có.`).replace(/<br\s*\/?>/gi, '\n');
            const answerText = studentAnswers[qKey] || "Sinh viên không trả lời.";
            promptText += `--- ${qKey.toUpperCase()} ---\nĐề bài: ${questionText}\nBài làm: ${answerText}\n\n`;
        });

        console.log("Prompt for Gemini (client-side):", promptText);

        const payload = {
            "contents": [{"parts": [{"text": promptText}]}],
            "generationConfig": {"temperature": 0.6, "maxOutputTokens": 4096, "topP": 0.95, "topK": 40}
        };

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}. Body: ${errorBody}`);
        }

        const jsonResponse = await response.json();
        console.log("Raw Gemini Output (client-side): \n", jsonResponse);

        if (jsonResponse.candidates && jsonResponse.candidates[0] && jsonResponse.candidates[0].content && jsonResponse.candidates[0].content.parts && jsonResponse.candidates[0].content.parts[0].text) {
            const rawGeminiOutput = jsonResponse.candidates[0].content.parts[0].text;

            let overallSummaryForStudent = "Không thể trích xuất nhận xét tổng quan từ AI.";
            let score = "N/A";
            let fullFeedbackForAdmin = rawGeminiOutput;

            const scoreMarker = "\nINTERNAL_SCORE:";
            const detailMarker = "\nINTERNAL_DETAILED_FEEDBACK_FOR_ADMIN:";
            const scoreIndex = rawGeminiOutput.indexOf(scoreMarker);
            const detailIndex = rawGeminiOutput.indexOf(detailMarker);

            if (scoreIndex !== -1) {
                overallSummaryForStudent = rawGeminiOutput.substring(0, scoreIndex).trim();
            } else if (detailIndex !== -1) {
                overallSummaryForStudent = rawGeminiOutput.substring(0, detailIndex).trim();
            } else {
                const firstParagraphEnd = rawGeminiOutput.indexOf("\n\n");
                if (firstParagraphEnd !== -1 && firstParagraphEnd < 500) {
                     overallSummaryForStudent = rawGeminiOutput.substring(0, firstParagraphEnd).trim();
                } else {
                    overallSummaryForStudent = rawGeminiOutput.substring(0, Math.min(rawGeminiOutput.length, 500)).trim();
                }
            }
            overallSummaryForStudent = overallSummaryForStudent.replace(/Phần \d+:/gi, "").trim();

            if (scoreIndex !== -1) {
                let scorePart = "";
                if(detailIndex !== -1 && detailIndex > scoreIndex){
                    scorePart = rawGeminiOutput.substring(scoreIndex + scoreMarker.length, detailIndex).trim();
                } else {
                    scorePart = rawGeminiOutput.substring(scoreIndex + scoreMarker.length).trim();
                }
                const scoreMatch = scorePart.match(/(\d+(\.\d+)?\s*\/\s*100)/i);
                if (scoreMatch && scoreMatch[1]) { score = scoreMatch[1].trim(); }
            }
            // fullFeedbackForAdmin is already set to rawGeminiOutput

            console.log("Client-side Extracted Overall Summary: " + overallSummaryForStudent);
            console.log("Client-side Extracted Score: " + score);

            return {
                fullFeedbackForAdmin: fullFeedbackForAdmin,
                overallSummaryForStudent: overallSummaryForStudent,
                score: score
            };
        } else {
            throw new Error("Gemini API response format unexpected.");
        }
    }


    // --- HÀM KHỞI TẠO FORM VÀ CÁC LISTENER SAU KHI DỮ LIỆU CÂU HỎI ĐÃ TẢI ---
    function initializeFormAndListeners() {
        document.getElementById('theory-q-count').textContent = theoryQuestionsData.length;
        document.getElementById('practical-q-count').textContent = practicalQuestionsData.length;
        document.getElementById('current-year').textContent = new Date().getFullYear();

        if (theoryContainer) { theoryQuestionsData.forEach(q => theoryContainer.innerHTML += createQuestionHTML(q)); }
        if (practicalContainer) { practicalQuestionsData.forEach(q => practicalContainer.innerHTML += createQuestionHTML(q)); }

        if (assessmentForm) {
            assessmentForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                setSubmitState('loading', 'Đang xử lý và gửi bài...');
                formStatusMessage.style.display = 'none';
                if (aiFeedbackContainer) {
                    aiFeedbackContainer.style.display = 'none';
                    aiFeedbackContainer.innerHTML = '';
                }

                let isValid = true;
                let firstInvalidField = null;
                studentFieldIds.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (!field.value.trim()) {
                        field.style.borderColor = 'red'; isValid = false; if (!firstInvalidField) firstInvalidField = field;
                    } else {
                        field.style.borderColor = '#ddd';
                        if (fieldId === 'student-email' && !validateEmail(field.value.trim())) {
                            field.style.borderColor = 'red'; isValid = false; if (!firstInvalidField) firstInvalidField = field;
                            if (formStatusMessage.className.indexOf('error') === -1 || !formStatusMessage.textContent) { displayFormStatus('Email không hợp lệ.', 'error');}
                        }
                    }
                });
                if (!isValid) {
                    if (firstInvalidField) firstInvalidField.focus();
                    if (formStatusMessage.className.indexOf('error') === -1 || !formStatusMessage.textContent.includes('Email')) { displayFormStatus('Vui lòng điền đầy đủ thông tin sinh viên.', 'error');}
                    setSubmitState('idle', 'Nộp Bài'); return;
                }

                const formData = new FormData(assessmentForm);
                const dataToSend = { studentInfo: {}, questions: {}, answers: {} };
                studentFieldIds.forEach(fieldId => { const key = document.getElementById(fieldId).name; dataToSend.studentInfo[key] = formData.get(key) || ''; });
                
                const allQuestions = [...theoryQuestionsData, ...practicalQuestionsData];
                allQuestions.forEach(q => { 
                    dataToSend.questions[q.name] = q.text; 
                    dataToSend.answers[q.name] = formData.get(q.name) || ""; 
                });
                
                // --- GET AI FEEDBACK FROM CLIENT-SIDE ---
                let aiEvaluationResult = {
                    fullFeedbackForAdmin: "AI evaluation was not performed or failed on client.",
                    overallSummaryForStudent: "An overall summary is currently unavailable (client-side issue or API key not set).",
                    score: "N/A"
                };

                if (GEMINI_API_KEY_CLIENT && GEMINI_API_KEY_CLIENT !== "YOUR_GEMINI_API_KEY_HERE") {
                    try {
                        setSubmitState('loading', 'Đang tạo nhận xét AI...');
                        aiEvaluationResult = await getAIFeedbackFromClient(dataToSend);
                        setSubmitState('loading', 'Đang gửi bài và nhận xét AI...');
                    } catch (aiError) {
                        console.error('Error getting AI feedback from client:', aiError);
                        // Display AI error to user, but still proceed to submit data to Apps Script
                        displayFormStatus(`Lỗi khi tạo nhận xét AI: ${aiError.message}. Bài làm vẫn sẽ được nộp.`, 'warning');
                        aiEvaluationResult.overallSummaryForStudent = `Lỗi khi tạo nhận xét AI: ${aiError.message}.`;
                        // The form will still be submitted, Apps Script will log this.
                        setSubmitState('loading', 'Đang gửi bài (AI lỗi)...');
                    }
                } else {
                    displayFormStatus('Cảnh báo: Gemini API Key chưa được cấu hình phía client. Nhận xét AI sẽ không được tạo.', 'warning');
                     setSubmitState('loading', 'Đang gửi bài (không có AI)...');
                }
                
                dataToSend.aiEvaluation = aiEvaluationResult; // Add AI results to the data sent to Apps Script
                console.log("Data to send (script.js with AI eval):", JSON.stringify(dataToSend, null, 2));


                if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("YOUR_ACTUAL_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") || !GOOGLE_SCRIPT_URL.endsWith("/exec")) {
                    displayFormStatus('Lỗi cấu hình: URL Google Apps Script không hợp lệ.', 'error');
                    setSubmitState('idle', 'Nộp Bài'); console.error("GOOGLE_SCRIPT_URL invalid:", GOOGLE_SCRIPT_URL); return;
                }

                try {
                    const response = await fetch(GOOGLE_SCRIPT_URL, {
                        method: 'POST', cache: 'no-cache', redirect: 'follow', body: JSON.stringify(dataToSend)
                    });
                    if (!response.ok) {
                        const errorBodyText = await response.text(); let detailedErrorMsg = `Lỗi HTTP: ${response.status} ${response.statusText}`;
                        try { const errorData = JSON.parse(errorBodyText); detailedErrorMsg += ` - Server: ${errorData.message || errorBodyText}`; } catch (parseError) { detailedErrorMsg += ` - Server: ${errorBodyText}`; }
                        throw new Error(detailedErrorMsg);
                    }

                    const result = await response.json(); 

                    if (result.status === "success" || result.status === "partial_success") {
                        displayFormStatus(result.message || 'Nộp bài thành công! Email chứa phản hồi tổng quan đã được gửi.', 'success');
                        assessmentForm.reset();
                        studentFieldIds.forEach(id => { const field = document.getElementById(id); if (field) field.style.borderColor = '#ddd'; });

                        // Display AI feedback (which now comes from client-side call, passed through Apps Script response)
                        if (aiFeedbackContainer && result.aiOverallSummary) { 
                            aiFeedbackContainer.innerHTML = `<h3><i class="fas fa-comment-dots"></i> Nhận Xét Tổng Quan từ AI:</h3>
                                                         <div class="ai-feedback-content">${result.aiOverallSummary.replace(/\n/g, '<br>')}</div>
                                                         <p style="font-style:italic; margin-top:10px;">Lưu ý: Đây là phản hồi tự động ban đầu. Điểm số và đánh giá chi tiết (nếu có) sẽ được thông báo sau bởi giảng viên.</p>`;
                            aiFeedbackContainer.style.display = 'block';
                            aiFeedbackContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else if (aiFeedbackContainer) {
                             aiFeedbackContainer.innerHTML = `<h3><i class="fas fa-comment-dots"></i> Nhận Xét Tổng Quan từ AI:</h3>
                                                         <p>Không nhận được nhận xét tổng quan từ AI hoặc có lỗi trong quá trình xử lý.</p>`;
                            aiFeedbackContainer.style.display = 'block';
                            aiFeedbackContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    } else {
                        console.error('Logic error from Apps Script (script.js):', result.message);
                        let clientMessage = `Lỗi từ server: ${result.message || 'Phản hồi không thành công.'}. Vui lòng thử lại.`;
                        // If Apps Script forwards an AI error message (e.g., client sent an error)
                        if (result.aiOverallSummary && result.aiOverallSummary.startsWith("Lỗi khi tạo nhận xét AI")) { 
                            clientMessage = result.aiOverallSummary;
                        }
                        displayFormStatus(clientMessage, 'error');
                        if (aiFeedbackContainer) aiFeedbackContainer.style.display = 'none';
                    }
                } catch (error) {
                    console.error('Fetch or response processing error (script.js to Apps Script):', error);
                    displayFormStatus(`${error.message || 'Lỗi kết nối hoặc xử lý.'}. Kiểm tra mạng và thử lại.`, 'error');
                    if (aiFeedbackContainer) aiFeedbackContainer.style.display = 'none';
                }
                finally {
                    setSubmitState('idle', 'Nộp Bài Lần Nữa');
                }
            });
        }

        initializeInputFocusListeners();
        initializeIntersectionObserver();
    }

    // --- TẢI DỮ LIỆU CÂU HỎI TỪ questions.json ---
    fetch('questions.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} when fetching questions.json`);
            }
            return response.json();
        })
        .then(data => {
            theoryQuestionsData = data.theoryQuestionsData || [];
            practicalQuestionsData = data.practicalQuestionsData || [];
            console.log("Questions data loaded successfully.");
            initializeFormAndListeners(); 
        })
        .catch(error => {
            console.error('Error loading questions data:', error);
            if (formStatusMessage) { 
                displayFormStatus('Không thể tải dữ liệu câu hỏi. Vui lòng thử làm mới trang.', 'error');
            }
            if(assessmentForm) assessmentForm.style.display = 'none';
        });

    // --- CÁC HÀM HELPER (GIỮ NGUYÊN PHẦN LỚN) ---
    function setSubmitState(state, text) {
        if (submitButton && submitButtonText && submitLoader) {
            if (state === 'loading') {
                submitButton.disabled = true; submitButtonText.textContent = text; submitLoader.style.display = 'inline-block';
            } else {
                submitButton.disabled = false; submitButtonText.textContent = text; submitLoader.style.display = 'none';
            }
        }
    }
    function displayFormStatus(message, type) {
        if (formStatusMessage) { 
            formStatusMessage.textContent = message; formStatusMessage.className = `form-status ${type}`; formStatusMessage.style.display = 'block';
            if (type === 'error' || type === 'warning') {
                formStatusMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; return re.test(String(email).toLowerCase());
    }
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) { e.preventDefault(); 
            const targetElement = document.querySelector(this.getAttribute('href'));
            if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' }); 
        });
    });
    function initializeInputFocusListeners() {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
        inputs.forEach(input => {
            input.removeEventListener('focus', handleInputFocus); input.removeEventListener('blur', handleInputBlur);
            input.addEventListener('focus', handleInputFocus); input.addEventListener('blur', handleInputBlur);
        });
    }
    function handleInputFocus() { if(this.parentNode) this.parentNode.classList.add('focused'); }
    function handleInputBlur() { if(this.parentNode) this.parentNode.classList.remove('focused'); }
    
    function initializeIntersectionObserver() {
        const animatedElements = document.querySelectorAll('.question-block, .card:not(.question-block)');
        if (animatedElements.length > 0 && typeof IntersectionObserver !== 'undefined') { 
            const observer = new IntersectionObserver((entries, observerInstance) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) { entry.target.classList.add('visible'); observerInstance.unobserve(entry.target); }
                });
            }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
            animatedElements.forEach(el => observer.observe(el));
        } else if (animatedElements.length > 0) { 
            animatedElements.forEach(el => el.classList.add('visible'));
        }
    }
});
// --- END OF FILE script.js ---