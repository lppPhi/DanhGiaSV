import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import Dict, Any
from dotenv import load_dotenv
import json # Để parse JSON từ Gemini nếu cần thiết

# Tải biến môi trường từ file .env
load_dotenv()

app = FastAPI()

# Cấu hình Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("LỖI: GEMINI_API_KEY không được tìm thấy trong biến môi trường.")
    # Trong môi trường production, bạn có thể muốn ứng dụng không khởi động nếu thiếu key
else:
    genai.configure(api_key=GEMINI_API_KEY)

# Định nghĩa mô hình Pydantic cho dữ liệu đầu vào từ Apps Script
# Nó sẽ chứa các câu trả lời q1, q2, ... và có thể cả thông tin sinh viên nếu cần cho prompt
class StudentAnswers(BaseModel):
    # Mong đợi một dictionary với các key động (q1, q2, ..., fullName, etc.)
    answers: Dict[str, Any]


# Định nghĩa mô hình Pydantic cho dữ liệu trả về
class EvaluationResponse(BaseModel):
    evaluation: str
    score: str

# Tạo mô hình Gemini
# Chọn model phù hợp. 'gemini-pro' là một lựa chọn tốt cho text generation.
# Có thể có model mới hơn hoặc chuyên biệt hơn.
generation_config = {
  "temperature": 0.7, # Điều chỉnh độ "sáng tạo"
  "top_p": 1,
  "top_k": 1,
  "max_output_tokens": 512, # Giới hạn token đầu ra
}
safety_settings = [ # Cài đặt an toàn
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]
model = genai.GenerativeModel(model_name="gemini-1.0-pro", # Hoặc "gemini-pro"
                              generation_config=generation_config,
                              safety_settings=safety_settings)


@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_submission(payload: StudentAnswers = Body(...)):
    student_data = payload.answers # dataFromFrontend từ Apps Script sẽ nằm trong payload.answers
    print(f"Received data for evaluation: {student_data}")

    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured on the server.")

    # --- Xây dựng Prompt cho Gemini ---
    # Đây là phần bạn cần tùy chỉnh rất nhiều
    prompt_parts = [
        "You are an expert programming aptitude test evaluator.",
        "Please evaluate the following student's answers for a programming aptitude test. ",
        "The test includes theoretical multiple-choice questions and practical algorithm/coding questions.",
        "Provide a concise overall evaluation (around 2-4 sentences, suitable for showing to the student) and a numerical score out of 100.",
        "Focus on correctness, understanding of concepts, and problem-solving skills for practical questions.",
        "Here are the student's details and answers:"
    ]

    # Thêm thông tin sinh viên (nếu có và muốn dùng trong prompt)
    if student_data.get("fullName"):
        prompt_parts.append(f"\nStudent Name: {student_data.get('fullName')}")
    # Bạn có thể thêm các thông tin khác nếu cần

    prompt_parts.append("\n--- Answers ---")
    # Thêm các câu trả lời vào prompt
    # Giả sử student_data chứa các key như 'q1', 'q2', ..., 'q20'
    # Và cũng có thể có 'q9_answer', 'q10_answer' nếu bạn đặt tên khác cho câu tự luận
    # Code này giả định tất cả câu hỏi đều có key là qX
    question_details = [] # Để lưu trữ câu hỏi và câu trả lời
    for i in range(1, 21): # Từ Q1 đến Q20
        q_key = f"q{i}"
        answer = student_data.get(q_key)
        if answer and str(answer).strip() != "":
            # Để có prompt tốt hơn, bạn nên có nội dung câu hỏi ở đây
            # Ví dụ: question_text = get_question_text(q_key)
            # question_details.append(f"Question {i} ({question_text}):\nAnswer: {answer}")
            question_details.append(f"Question {i} Answer: {answer}")

    if not question_details:
        prompt_parts.append("No answers provided by the student.")
    else:
        prompt_parts.append("\n".join(question_details))
    
    prompt_parts.append(
        "\n\n--- Instructions for Your Response ---"
        "\nBased on the answers, provide your evaluation and score."
        "\nYour response MUST BE a valid JSON object with exactly two keys: \"evaluation\" (a string for the feedback) and \"score\" (a string representing the numerical score out of 100)."
        "\nExample: {\"evaluation\": \"The student demonstrates a good grasp of basic concepts but struggled with more complex algorithms. Further practice on recursion is recommended.\", \"score\": \"65\"}"
        "\nDo not include any text before or after this JSON object."
        "\nBe fair and constructive in your evaluation."
    )
    
    final_prompt = "\n".join(prompt_parts)
    print(f"\n--- Final Prompt for Gemini --- \n{final_prompt}\n-----------------------------\n")

    try:
        response = model.generate_content(final_prompt)
        
        if response.parts:
            gemini_output_text = response.text # Thư viện google-generativeai thường trả về text trực tiếp
            print(f"Raw text from Gemini: {gemini_output_text}")

            # Cố gắng parse output của Gemini thành JSON
            try:
                # Đôi khi Gemini có thể trả về markdown ```json ... ```, cần loại bỏ
                cleaned_text = gemini_output_text.strip()
                if cleaned_text.startswith("```json"):
                    cleaned_text = cleaned_text[7:] # Bỏ ```json
                if cleaned_text.endswith("```"):
                    cleaned_text = cleaned_text[:-3] # Bỏ ```
                
                parsed_gemini_json = json.loads(cleaned_text.strip())

                if "evaluation" in parsed_gemini_json and "score" in parsed_gemini_json:
                    return EvaluationResponse(
                        evaluation=str(parsed_gemini_json["evaluation"]),
                        score=str(parsed_gemini_json["score"])
                    )
                else:
                    print(f"Gemini output JSON missing 'evaluation' or 'score'. Output: {gemini_output_text}")
                    raise HTTPException(status_code=500, detail=f"AI evaluation format error (missing keys). Raw: {gemini_output_text[:200]}...")
            except json.JSONDecodeError as e:
                print(f"Error parsing Gemini's text output as JSON: {e}. Raw output: {gemini_output_text}")
                raise HTTPException(status_code=500, detail=f"AI evaluation format error (JSON parse failed). Raw: {gemini_output_text[:200]}...")
        else:
            print(f"Gemini response has no parts. Full response: {response}")
             # Kiểm tra prompt_feedback nếu có để xem lý do bị block
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                print(f"Prompt blocked. Reason: {response.prompt_feedback.block_reason}")
                print(f"Safety ratings: {response.prompt_feedback.safety_ratings}")
                raise HTTPException(status_code=400, detail=f"AI prompt was blocked. Reason: {response.prompt_feedback.block_reason}")
            raise HTTPException(status_code=500, detail="AI evaluation produced no usable content.")

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        # Log chi tiết lỗi nếu có thể
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            print(f"Gemini API Error Response: {e.response.text}")
        raise HTTPException(status_code=500, detail=f"Error communicating with AI evaluation service: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)