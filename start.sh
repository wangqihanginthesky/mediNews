#!/bin/bash

echo "=== 医薬品パイプライン検索システム ==="
echo ""

# 检查Python依赖
echo "1. Installing Python dependencies..."
pip install -r requirements.txt

# 检查前端依赖并构建
if [ ! -d "frontend/node_modules" ]; then
    echo "2. Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

if [ ! -d "frontend/build" ]; then
    echo "3. Building React app..."
    cd frontend
    npm run build
    cd ..
fi

echo ""
echo "4. Starting server..."
echo "   Frontend: http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"
echo ""

python app.py
