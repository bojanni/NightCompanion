# Security Implementation Summary

## Overview

This document outlines the security improvements implemented to address API key storage and input validation concerns in the local PostgreSQL environment.

## 1. API Key Encryption

### Problem

Storing API keys in plain text is risky because:

- Keys could be exposed if database access is compromised
- Client-side accessible keys are vulnerable
- No encryption at rest

### Solution Implemented

#### Backend Encryption

- **Location**: `server/encryption.js`
- **Algorithm**: AES-256-GCM encryption
- **Key Storage**: Keys are encrypted before being stored in the `user_api_keys` table.
- **Display**: Only masked hints (last 4 characters) are sent to the frontend.

#### Encryption Flow

1. User submits API key through frontend
2. Express API receives key
3. Key is encrypted using a server-side secret
4. Only encrypted value stored in database
5. Frontend never sees decrypted keys again (only hints)

## 2. Secure API Proxy

### Problem

Making API calls directly from the frontend exposes API keys in client-side code and network logs.

### Solution Implemented

#### AI Route Proxy

- **Location**: `server/routes/ai.js`
- **Purpose**: Acts as secure proxy between frontend and AI providers
- **Supported Providers**: OpenAI, Anthropic, Google Gemini, OpenRouter, Together AI

#### Proxy Flow

1. Frontend sends request to local Express server
2. Server retrieves encrypted API key from database
3. Server decrypts key in memory
4. Server makes request to AI provider with decrypted key
5. Response returned to frontend

#### Benefits

- API keys never leave server environment
- Keys encrypted at rest in database
- Frontend only deals with local API endpoints

## 3. Input Validation

### Problem

No validation on user inputs before database operations could lead to:

- Data integrity issues
- Injection attacks
- Invalid data stored in database

### Solution Implemented

#### Validation Layer with Zod

- **Location**: `src/lib/validation-schemas.ts`
- **Library**: Zod for runtime type validation

#### Validated Data Models

1. **PromptSchema** - Validates prompt content, title, rating, tags
2. **CharacterSchema** - Validates character name and attributes
3. **ApiKeySchema** - Validates provider and key format
4. **LocalEndpointSchema** - Validates endpoint URLs and configuration
5. **StyleProfileSchema** - Validates image URLs and analysis data
6. **BatchTestSchema** - Validates test configurations
7. **ModelUsageSchema** - Validates model usage tracking

#### Benefits

- Prevents invalid data from reaching database
- Clear error messages for users
- Type safety at runtime

## 4. Enhanced Error Messages

### Solution Implemented

- **Location**: `src/pages/Settings.tsx`
- Analyzes error messages and provides probable causes
- Contextual suggestions based on error type and configuration

## Security Best Practices Applied

### 1. Minimal Exposure

- Frontend does not have access to full API keys.
- Database access is local-only by default (Postgres).

### 2. Defense in Depth

- Encryption at rest (database keys)
- Input validation (Zod schemas)
- Backend proxy for external calls

## Migration Notes

### Database Schema

- **Table**: `user_api_keys`
- **Column**: `encrypted_key` (text, NOT NULL)
- **Column**: `key_hint` (text) - stores masked version for display

## Usage Guidelines

### For Developers

#### Adding New Validated Forms

1. Define schema in `validation-schemas.ts`
2. Import and use schema in component
3. Use `schema.parse()` before submitting to backend
4. Handle validation errors appropriately

#### Using the Server Proxy

Calls are made via `src/lib/ai-service.ts` which routes to `http://localhost:3000/api/ai/...`

### For Users

#### API Key Security

- Keys are encrypted immediately upon saving
- Only last 4 characters visible in UI
- Keys never sent to frontend after initial save
- All AI requests proxied through secure server
