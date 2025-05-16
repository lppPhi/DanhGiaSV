pip install fastapi uvicorn google-generativeai python-dotenv
python -m pip install --upgrade pip
pip install grpcio
pip uninstall protobuf
pip install "protobuf>=3.20.3,<4.0.0"
uvicorn main:app --reload