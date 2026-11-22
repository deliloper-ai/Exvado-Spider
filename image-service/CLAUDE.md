# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Önemli Not
Tüm notificationları bana türkçe ver.

## Project Overview

This is an Express.js-based image upload service that handles product images. The service accepts base64-encoded images, stores them locally, and returns CDN URLs.

## Commands

### Development
```bash
# Install dependencies
npm install

# Run the server
node index.js
```

The server runs on port 3000.

## Architecture

### Single-file Application Structure
- `index.js`: Main server file containing all application logic
- `uploadedImages/`: Directory storing all uploaded product images (contains ~35,000+ images)
- No database - all data stored in filesystem

### API Endpoints

1. **POST /imageUpload**
   - Accepts: `{ productCode: string, image: string }` (image is base64-encoded)
   - Saves images as: `{productCode}_{index}.png`
   - Returns: `{ url: "https://cdn.bolbolbul.com/uploadedImages/{filename}" }`
   - Note: Response URL path incorrectly includes "uploadedImages/" twice

2. **GET /uploadedImages/:filename**
   - Serves uploaded images from local storage
   - Returns 404 if file not found

### Key Implementation Details

- Images are indexed per product code starting from index 1 (e.g., PRODUCT_1.png, PRODUCT_2.png)
- The server counts existing images by matching product code prefix to determine next index
- Base64 images are decoded and saved as PNG files
- CORS is enabled for all origins
- JSON body limit is set to 10MB
- File matching uses substring comparison: `file.substring(0, file.length-6) == productCode`
  - Assumes 6 characters for "_X.png" suffix
  - May fail for indices > 9 (e.g., "_10.png" is 7 characters)

### Known Issues

1. **Index calculation bug**: The substring logic in index.js:33 assumes exactly 6 characters for the suffix ("_X.png"), which breaks for double-digit indices
2. **Response path inconsistency**: The CDN URL returned includes "uploadedImages/" in the path variable, resulting in double path segments
3. **No error handling**: Missing error response when image save fails (line 41 returns but doesn't send response)