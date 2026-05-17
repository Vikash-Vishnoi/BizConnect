#!/bin/bash

# Cloudinary Setup Script
# Run this script to check if Cloudinary is properly configured

echo "🔍 Checking Cloudinary Configuration..."
echo ""

# Load environment variables
if [ -f backend/.env ]; then
    source backend/.env
else
    echo "❌ backend/.env file not found!"
    echo "   Please copy backend/.env.example to backend/.env and configure it."
    exit 1
fi

# Check Cloudinary credentials
if [ -z "$CLOUDINARY_CLOUD_NAME" ] || [ "$CLOUDINARY_CLOUD_NAME" = "your-cloud-name" ]; then
    echo "❌ CLOUDINARY_CLOUD_NAME not set in .env"
    MISSING=true
else
    echo "✅ CLOUDINARY_CLOUD_NAME: $CLOUDINARY_CLOUD_NAME"
fi

if [ -z "$CLOUDINARY_API_KEY" ] || [ "$CLOUDINARY_API_KEY" = "your-api-key" ]; then
    echo "❌ CLOUDINARY_API_KEY not set in .env"
    MISSING=true
else
    echo "✅ CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY:0:10}..."
fi

if [ -z "$CLOUDINARY_API_SECRET" ] || [ "$CLOUDINARY_API_SECRET" = "your-api-secret" ]; then
    echo "❌ CLOUDINARY_API_SECRET not set in .env"
    MISSING=true
else
    echo "✅ CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET:0:10}..."
fi

echo ""

if [ "$MISSING" = true ]; then
    echo "⚠️  Cloudinary is not configured!"
    echo ""
    echo "📝 Setup Instructions:"
    echo "1. Go to https://cloudinary.com/ and sign up"
    echo "2. Get your credentials from the dashboard"
    echo "3. Add them to backend/.env:"
    echo ""
    echo "   CLOUDINARY_CLOUD_NAME=your_cloud_name"
    echo "   CLOUDINARY_API_KEY=your_api_key"
    echo "   CLOUDINARY_API_SECRET=your_api_secret"
    echo ""
    echo "4. Restart your backend server"
    echo ""
    exit 1
else
    echo "✅ All Cloudinary credentials are configured!"
    echo ""
    echo "📦 Checking if cloudinary package is installed..."
    
    cd backend
    if npm list cloudinary > /dev/null 2>&1; then
        echo "✅ cloudinary package is installed"
    else
        echo "⚠️  cloudinary package not found"
        echo "   Installing now..."
        npm install cloudinary
        echo "✅ cloudinary package installed"
    fi
    
    echo ""
    echo "🎉 Cloudinary is ready to use!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Restart your backend: npm start"
    echo "2. Upload an image in the Inbox"
    echo "3. Check Cloudinary dashboard to see the file"
    echo ""
fi
