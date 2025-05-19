// --- START OF FILE script.js ---

document.addEventListener('DOMContentLoaded', function() {
    // --- URL GOOGLE APPS SCRIPT WEB APP ---
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzozOC2QaGgoKEy4VMHGJiCUKZ_vydUzV--yhJmFC4HN1FUbQXdJkpT3WglNqMbxT_LyA/exec'; // GIỮ NGUYÊN URL CỦA BẠN

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
    const studentFieldIds = ['student-name', 'student-id', 'student-school', 'student-major', 'student-email'];

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

    // --- HÀM KHỞI TẠO FORM VÀ CÁC LISTENER SAU KHI DỮ LIỆU CÂU HỎI ĐÃ TẢI ---
    function initializeFormAndListeners() {
        document.getElementById('theory-q-count').textContent = theoryQuestionsData.length;
        document.getElementById('practical-q-count').textContent = practicalQuestionsData.length;
        document.getElementById('current-year').textContent = new Date().getFullYear();

        if (theoryContainer) { theoryQuestionsData.forEach(q => theoryContainer.innerHTML += createQuestionHTML(q)); }
        if (practicalContainer) { practicalQuestionsData.forEach(q => practicalContainer.innerHTML += createQuestionHTML(q)); }

        if (assessmentForm) { // Chỉ thêm event listener nếu form tồn tại
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
                
                // Sử dụng dữ liệu câu hỏi đã tải
                const allQuestions = [...theoryQuestionsData, ...practicalQuestionsData];
                allQuestions.forEach(q => { 
                    dataToSend.questions[q.name] = q.text; 
                    dataToSend.answers[q.name] = formData.get(q.name) || ""; 
                });
                console.log("Data to send (script.js):", JSON.stringify(dataToSend, null, 2));

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

                    if (result.status === "success" || result.status === "partial_success") { // Chấp nhận cả partial_success
                        displayFormStatus(result.message || 'Nộp bài thành công! Email chứa phản hồi tổng quan đã được gửi.', 'success');
                        assessmentForm.reset();
                        studentFieldIds.forEach(id => { const field = document.getElementById(id); if (field) field.style.borderColor = '#ddd'; });

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
                        if (result.aiOverallSummary && result.aiOverallSummary.startsWith("Error during AI")) { // Hiển thị lỗi chi tiết từ AI nếu có
                            clientMessage = result.aiOverallSummary;
                        }
                        displayFormStatus(clientMessage, 'error');
                        if (aiFeedbackContainer) aiFeedbackContainer.style.display = 'none';
                    }
                } catch (error) {
                    console.error('Fetch or response processing error (script.js):', error);
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
            initializeFormAndListeners(); // Gọi hàm khởi tạo sau khi dữ liệu đã tải
        })
        .catch(error => {
            console.error('Error loading questions data:', error);
            if (formStatusMessage) { // Hiển thị lỗi cho người dùng nếu không tải được câu hỏi
                displayFormStatus('Không thể tải dữ liệu câu hỏi. Vui lòng thử làm mới trang.', 'error');
            }
            // Có thể ẩn form hoặc các phần phụ thuộc vào câu hỏi ở đây nếu muốn
            if(assessmentForm) assessmentForm.style.display = 'none';
        });

    // --- CÁC HÀM HELPER (GIỮ NGUYÊN) ---
    function setSubmitState(state, text) {
        if (submitButton && submitButtonText && submitLoader) { // Kiểm tra sự tồn tại của element
            if (state === 'loading') {
                submitButton.disabled = true; submitButtonText.textContent = text; submitLoader.style.display = 'inline-block';
            } else {
                submitButton.disabled = false; submitButtonText.textContent = text; submitLoader.style.display = 'none';
            }
        }
    }
    function displayFormStatus(message, type) {
        if (formStatusMessage) { // Kiểm tra sự tồn tại
            formStatusMessage.textContent = message; formStatusMessage.className = `form-status ${type}`; formStatusMessage.style.display = 'block';
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
        if (animatedElements.length > 0 && typeof IntersectionObserver !== 'undefined') { // Kiểm tra IntersectionObserver có được hỗ trợ không
            const observer = new IntersectionObserver((entries, observerInstance) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) { entry.target.classList.add('visible'); observerInstance.unobserve(entry.target); }
                });
            }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
            animatedElements.forEach(el => observer.observe(el));
        } else if (animatedElements.length > 0) { // Fallback nếu IntersectionObserver không được hỗ trợ
            animatedElements.forEach(el => el.classList.add('visible'));
        }
    }
    // Không gọi initializeIntersectionObserver ở đây nữa, nó sẽ được gọi trong initializeFormAndListeners
});
// --- END OF FILE script.js ---