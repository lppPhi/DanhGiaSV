// FILE: script.js

// --- Dữ liệu câu hỏi và các phần đầu file giữ nguyên ---
document.addEventListener('DOMContentLoaded', function() {
    // !!! QUAN TRỌNG: THAY THẾ URL DƯỚI ĐÂY BẰNG URL WEB APP THỰC TẾ CỦA BẠN SAU KHI TRIỂN KHAI LẠI Code.gs !!!
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyVO6YIl57Y_ENeYiwVykSYD5FG3uXM1FvQPNETqwJiG4DLxb4wG_MqW2n-C1e62m6_nw/exec'; // <<--- THAY URL CỦA BẠN

    const theoryQuestionsData = [ /* ... dữ liệu câu hỏi lý thuyết ... */ 
        { id: 1, category: "Độ phức tạp thuật toán", text: "Độ phức tạp thời gian của thuật toán tìm kiếm nhị phân (Binary Search) là:", type: "mcq", name: "q1", options: [ { value: "A", label: "O(1)" }, { value: "B", label: "O(n)" }, { value: "C", label: "O(log n)" }, { value: "D", label: "O(n log n)" } ] }, { id: 2, category: "Cấu trúc dữ liệu", text: "Cấu trúc dữ liệu nào nên được sử dụng khi cần thực hiện các hoạt động \"Last-In-First-Out\" (LIFO)?", type: "mcq", name: "q2", options: [ { value: "A", label: "Queue" }, { value: "B", label: "Stack" }, { value: "C", label: "Linked List" }, { value: "D", label: "Binary Tree" } ] }, { id: 3, category: "Nguyên tắc lập trình", text: "Nguyên tắc DRY trong lập trình có nghĩa là:", type: "mcq", name: "q3", options: [ { value: "A", label: "Don't Repeat Yourself" }, { value: "B", label: "Data Redundancy Yield" }, { value: "C", label: "Debug Rigorously Yourself" }, { value: "D", label: "Define Resources Yearly" } ] }, { id: 4, category: "Lập trình hướng đối tượng", text: "Đâu KHÔNG phải là một trong bốn nguyên tắc cơ bản của lập trình hướng đối tượng?", type: "mcq", name: "q4", options: [ { value: "A", label: "Tính kế thừa (Inheritance)" }, { value: "B", label: "Tính bao đóng (Encapsulation)" }, { value: "C", label: "Tính đa hình (Polymorphism)" }, { value: "D", label: "Tính tuần tự (Sequentiality)" } ] }, { id: 5, category: "Xử lý lỗi", text: "Đúng hay Sai: Exception handling (xử lý ngoại lệ) là một phương pháp để xử lý lỗi syntax trong quá trình biên dịch", type: "mcq", name: "q5", options: [ { value: "True", label: "Đúng" }, { value: "False", label: "Sai" } ] }, { id: 6, category: "Thuật toán", text: "Thuật toán sắp xếp nào sau đây có độ phức tạp thời gian trường hợp tệ nhất là O(n²)?", type: "mcq", name: "q6", options: [ { value: "A", label: "Merge Sort" }, { value: "B", label: "Bubble Sort" }, { value: "C", label: "Heap Sort" }, { value: "D", label: "Quick Sort (trường hợp xấu nhất)" } ] }, { id: 7, category: "Kiểu dữ liệu và cấu trúc dữ liệu", text: "Hash table sử dụng cơ chế nào để lưu trữ và truy xuất dữ liệu?", type: "mcq", name: "q7", options: [ { value: "A", label: "Indexing" }, { value: "B", label: "Hashing function" }, { value: "C", label: "Sequential searching" }, { value: "D", label: "Binary search" } ] }, { id: 8, category: "Nguyên tắc thiết kế phần mềm", text: "Nguyên tắc \"SOLID\" trong thiết kế phần mềm hướng đối tượng bao gồm những nguyên tắc nào? Chọn đáp án đúng.", type: "mcq", name: "q8", options: [ { value: "A", label: "Single responsibility, Open-closed, Liskov substitution, Interface segregation, Dependency inversion" }, { value: "B", label: "Structured programming, Object-oriented design, Logical flow, Iterative development, Data abstraction" }, { value: "C", label: "Syntax checking, Optimization, Logic verification, Integrated testing, Documentation" }, { value: "D", label: "Security, Optimization, Logical design, Inheritance, Debugging" } ] }
    ];
    const practicalQuestionsData = [ /* ... dữ liệu câu hỏi thực hành ... */ 
        { id: 9, category: "Xử lý mảng/danh sách", text: "Viết một thuật toán để tìm phần tử lớn thứ hai trong một mảng số nguyên không sắp xếp. Không được sắp xếp mảng.", type: "textarea", name: "q9", placeholder: "Viết thuật toán của bạn vào đây...", rows: 8 }, { id: 10, category: "Xử lý chuỗi", text: "Viết thuật toán để kiểm tra một chuỗi có phải là palindrome hay không (đọc xuôi ngược đều giống nhau), không phân biệt hoa thường và bỏ qua các ký tự không phải chữ cái.", type: "textarea", name: "q10", placeholder: "Viết thuật toán của bạn vào đây...", rows: 8 }, { id: 11, category: "Đệ quy", text: "Viết hàm đệ quy để tính số Fibonacci thứ n. Sau đó, thảo luận về nhược điểm của giải pháp đệ quy này và đề xuất một phương pháp cải tiến.", type: "textarea", name: "q11", placeholder: "Viết hàm, thảo luận và đề xuất cải tiến...", rows: 10 }, { id: 12, category: "Thuật toán tìm kiếm", text: "Phân tích và viết thuật toán tìm kiếm nhị phân (Binary Search). Nêu rõ điều kiện tiên quyết và độ phức tạp của thuật toán.", type: "textarea", name: "q12", placeholder: "Phân tích và viết thuật toán...", rows: 10 }, { id: 13, category: "Sửa lỗi", text: "Đoạn code sau đây có lỗi logic. Hãy tìm và sửa lỗi: <br><code>function isPrime(n):<br>  if n <= 1: return false<br>  if n <= 3: return true<br>  if n % 2 == 0: return false<br>  i = 3<br>  while i < n:<br>    if n % i == 0: return false<br>    i = i + 2<br>  return true</code>", type: "textarea", name: "q13", placeholder: "Nêu lỗi và viết code đã sửa...", rows: 10 }, { id: 14, category: "Lập trình hướng đối tượng", text: "Thiết kế một hệ thống quản lý thư viện đơn giản sử dụng các nguyên tắc OOP. Hãy xác định các lớp, mối quan hệ giữa chúng và các phương thức chính.", type: "textarea", name: "q14", placeholder: "Mô tả thiết kế OOP của bạn...", rows: 12 }, { id: 15, category: "Xử lý ngoại lệ", text: "Viết pseudocode để xử lý các ngoại lệ trong một hàm chia hai số, bao gồm xử lý trường hợp chia cho 0 và kiểm tra đầu vào không phải số.", type: "textarea", name: "q15", placeholder: "Viết pseudocode xử lý ngoại lệ...", rows: 8 }, { id: 16, category: "Tối ưu hóa code", text: "Đoạn code sau đây tính tổng các số chẵn trong một mảng. Hãy tối ưu hóa nó và giải thích sự cải tiến.<br><code>function sumEvenNumbers(array):<br>  sum = 0<br>  for i from 0 to length(array)-1:<br>    current = array[i]<br>    if current % 2 == 0:<br>      isEven = true<br>    else:<br>      isEven = false<br>    if isEven == true:<br>      sum = sum + current<br>  return sum</code>", type: "textarea", name: "q16", placeholder: "Viết code tối ưu và giải thích...", rows: 10 }, { id: 17, category: "Stack và Queue", text: "Viết một thuật toán để kiểm tra dấu ngoặc trong một biểu thức có cân bằng hay không. Ví dụ: \"{[()]}\" là cân bằng, \"{[(]}\" không cân bằng.", type: "textarea", name: "q17", placeholder: "Viết thuật toán của bạn...", rows: 10 }, { id: 18, category: "Xử lý file", text: "Mô tả thuật toán để đọc một file text, đếm số lần xuất hiện của mỗi từ và xuất kết quả ra file mới, sắp xếp theo tần suất giảm dần.", type: "textarea", name: "q18", placeholder: "Mô tả thuật toán xử lý file...", rows: 10 }, { id: 19, category: "Phân tích thuật toán", text: "Phân tích độ phức tạp về thời gian và không gian của thuật toán sau:<br><code>function mystery(arr, n):<br>  if n <= 0: return 0<br>  result = 0<br>  for i from 0 to n-1:<br>    for j from i to n-1:<br>      result += arr[i] * arr[j]<br>  return result</code>", type: "textarea", name: "q19", placeholder: "Phân tích độ phức tạp...", rows: 8 }, { id: 20, category: "Bài tập tổng hợp", text: "Viết thuật toán để tìm đường đi ngắn nhất trong một ma trận từ góc trên bên trái đến góc dưới bên phải. Chỉ được di chuyển xuống hoặc sang phải. Mỗi ô chứa một giá trị chi phí khi đi qua ô đó.", type: "textarea", name: "q20", placeholder: "Viết thuật toán của bạn...", rows: 10 }
    ];

    // --- Các hàm và DOM element references giữ nguyên ---
    document.getElementById('theory-q-count').textContent = theoryQuestionsData.length;
    document.getElementById('practical-q-count').textContent = practicalQuestionsData.length;
    document.getElementById('current-year').textContent = new Date().getFullYear();
    function createQuestionHTML(question) { /* ... giữ nguyên ... */ 
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
    const theoryContainer = document.getElementById('theory-questions-container');
    const practicalContainer = document.getElementById('practical-questions-container');
    if (theoryContainer) { theoryQuestionsData.forEach(q => theoryContainer.innerHTML += createQuestionHTML(q)); }
    if (practicalContainer) { practicalQuestionsData.forEach(q => practicalContainer.innerHTML += createQuestionHTML(q)); }
    const assessmentForm = document.getElementById('assessment-form');
    const submitButton = document.getElementById('submit-button');
    const submitButtonText = document.getElementById('submit-button-text');
    const submitLoader = document.getElementById('submit-loader');
    const formStatusMessage = document.getElementById('form-status-message');
    const aiFeedbackContainer = document.getElementById('ai-feedback-container');
    const studentFieldIds = ['student-name', 'student-id', 'student-school', 'student-major', 'student-email'];

    assessmentForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        setSubmitState('loading', 'Đang xử lý và gửi bài...');
        formStatusMessage.style.display = 'none';
        if (aiFeedbackContainer) aiFeedbackContainer.style.display = 'none'; // Ẩn feedback cũ

        // --- Validation giữ nguyên ---
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

        // --- Chuẩn bị dataToSend giữ nguyên ---
        const formData = new FormData(assessmentForm);
        const dataToSend = { studentInfo: {}, questions: {}, answers: {} };
        studentFieldIds.forEach(fieldId => { const key = document.getElementById(fieldId).name; dataToSend.studentInfo[key] = formData.get(key) || ''; });
        const allQuestions = [...theoryQuestionsData, ...practicalQuestionsData];
        allQuestions.forEach(q => { dataToSend.questions[q.name] = q.text; dataToSend.answers[q.name] = formData.get(q.name) || ""; });
        console.log("Data to send (script.js):", JSON.stringify(dataToSend, null, 2));

        // --- Kiểm tra GOOGLE_SCRIPT_URL giữ nguyên ---
        if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_ACTUAL_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE/exec' || GOOGLE_SCRIPT_URL.includes("docs.google.com/spreadsheets") || GOOGLE_SCRIPT_URL.includes("/home/projects/") || !GOOGLE_SCRIPT_URL.endsWith("/exec")) {
            displayFormStatus('Lỗi cấu hình: URL Google Apps Script không hợp lệ.', 'error');
            setSubmitState('idle', 'Nộp Bài'); return;
        }

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST', cache: 'no-cache', redirect: 'follow', body: JSON.stringify(dataToSend)
            });
            if (!response.ok) { /* ... error handling giữ nguyên ... */ 
                const errorBodyText = await response.text(); let detailedErrorMsg = `Lỗi HTTP: ${response.status} ${response.statusText}`;
                try { const errorData = JSON.parse(errorBodyText); detailedErrorMsg += ` - Server: ${errorData.message || errorBodyText}`; } catch (parseError) { detailedErrorMsg += ` - Server: ${errorBodyText}`; }
                throw new Error(detailedErrorMsg);
            }

            const result = await response.json(); // Mong đợi {status, message, aiOverallSummary}

            if (result.status === "success") {
                displayFormStatus('Nộp bài thành công! Email chứa phản hồi tổng quan đã được gửi.', 'success');
                assessmentForm.reset();
                studentFieldIds.forEach(id => { const field = document.getElementById(id); if (field) field.style.borderColor = '#ddd'; });

                // >>> ĐIỂM THAY ĐỔI QUAN TRỌNG <<<
                // Hiển thị CHỈ nhận xét tổng quan
                if (aiFeedbackContainer && result.aiOverallSummary) { // Kiểm tra key mới: result.aiOverallSummary
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

            } else { // result.status !== "success"
                console.error('Logic error from Apps Script (script.js):', result.message);
                displayFormStatus(`Lỗi từ server: ${result.message || 'Phản hồi không thành công.'}. Vui lòng thử lại.`, 'error');
                if (aiFeedbackContainer) aiFeedbackContainer.style.display = 'none';
            }
        } catch (error) { // Lỗi fetch hoặc parse JSON
            console.error('Fetch or response processing error (script.js):', error);
            displayFormStatus(`${error.message || 'Lỗi kết nối hoặc xử lý.'}. Kiểm tra mạng và thử lại.`, 'error');
            if (aiFeedbackContainer) aiFeedbackContainer.style.display = 'none';
        }
        finally {
            setSubmitState('idle', 'Nộp Bài Lần Nữa');
        }
    });

    // --- Các hàm helper còn lại (setSubmitState, displayFormStatus, validateEmail, etc.) giữ nguyên ---
    function setSubmitState(state, text) { /* ... */ if (state === 'loading') { submitButton.disabled = true; submitButtonText.textContent = text; submitLoader.style.display = 'inline-block'; } else { submitButton.disabled = false; submitButtonText.textContent = text; submitLoader.style.display = 'none'; } }
    function displayFormStatus(message, type) { /* ... */ formStatusMessage.textContent = message; formStatusMessage.className = `form-status ${type}`; formStatusMessage.style.display = 'block'; }
    function validateEmail(email) { /* ... */ const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; return re.test(String(email).toLowerCase()); }
    document.querySelectorAll('a[href^="#"]').forEach(anchor => { /* ... */ anchor.addEventListener('click', function (e) { e.preventDefault(); document.querySelector(this.getAttribute('href')).scrollIntoView({ behavior: 'smooth' }); }); });
    function initializeInputFocusListeners() { /* ... */ const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea'); inputs.forEach(input => { input.removeEventListener('focus', handleInputFocus); input.removeEventListener('blur', handleInputBlur); input.addEventListener('focus', handleInputFocus); input.addEventListener('blur', handleInputBlur); }); }
    function handleInputFocus() { /* ... */ this.parentNode.classList.add('focused'); }
    function handleInputBlur() { /* ... */ this.parentNode.classList.remove('focused'); }
    initializeInputFocusListeners();
    function initializeIntersectionObserver() { /* ... */ const animatedElements = document.querySelectorAll('.question-block, .card:not(.question-block)'); const observer = new IntersectionObserver((entries, observerInstance) => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observerInstance.unobserve(entry.target); } }); }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }); animatedElements.forEach(el => observer.observe(el)); }
    if (theoryContainer || practicalContainer) { setTimeout(initializeIntersectionObserver, 150); } else { initializeIntersectionObserver(); }
});
// --- END OF FILE script.js ---