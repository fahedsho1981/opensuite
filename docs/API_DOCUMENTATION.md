# OpenSuite Document Editor - API Documentation

## Overview

The OpenSuite Document Editor API provides programmatic access to document creation, editing, collaboration, and storage features. This RESTful API allows you to integrate OpenSuite capabilities into your applications.

**Base URL:** `https://api.opensuite.com/v1`

**API Version:** 1.0

---

## Authentication

All API requests require authentication using OAuth 2.0 or API keys.

### OAuth 2.0

**Authorization Endpoint:** `https://auth.opensuite.com/oauth/authorize`  
**Token Endpoint:** `https://auth.opensuite.com/oauth/token`

#### Authorization Code Flow

1. **Redirect user to authorization URL:**
```
GET https://auth.opensuite.com/oauth/authorize?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  response_type=code&
  scope=documents:read documents:write collaboration:read collaboration:write&
  state=RANDOM_STATE
```

2. **Exchange authorization code for access token:**
```bash
curl -X POST https://auth.opensuite.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTHORIZATION_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=YOUR_REDIRECT_URI"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200...",
  "scope": "documents:read documents:write collaboration:read collaboration:write"
}
```

### API Key Authentication

For server-to-server communication, use API keys:

```bash
curl -X GET "https://api.opensuite.com/v1/documents" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Scopes

- `documents:read` - Read documents
- `documents:write` - Create and modify documents
- `collaboration:read` - Read collaboration data
- `collaboration:write` - Manage collaboration
- `storage:read` - Read files from storage
- `storage:write` - Write files to storage
- `admin` - Administrative access

---

## Documents API

### List Documents

Retrieve a list of documents accessible to the authenticated user.

**Endpoint:** `GET /documents`

**Query Parameters:**
- `limit` (integer, optional): Maximum number of documents to return (default: 20, max: 100)
- `offset` (integer, optional): Number of documents to skip (default: 0)
- `sort` (string, optional): Sort field (created_at, updated_at, name)
- `order` (string, optional): Sort order (asc, desc)
- `search` (string, optional): Search query
- `folder_id` (string, optional): Filter by folder

**Example Request:**
```bash
curl -X GET "https://api.opensuite.com/v1/documents?limit=10&sort=updated_at&order=desc" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "documents": [
    {
      "id": "doc_123abc456def",
      "name": "Project Proposal",
      "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "size": 45678,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:22:00Z",
      "owner": {
        "id": "user_789xyz",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "permissions": ["read", "write", "share"],
      "folder_id": "folder_abc123",
      "thumbnail_url": "https://cdn.opensuite.com/thumbnails/doc_123abc456def.jpg"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

### Get Document

Retrieve a specific document.

**Endpoint:** `GET /documents/{document_id}`

**Path Parameters:**
- `document_id` (string, required): Document ID

**Example Request:**
```bash
curl -X GET "https://api.opensuite.com/v1/documents/doc_123abc456def" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "id": "doc_123abc456def",
  "name": "Project Proposal",
  "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "size": 45678,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:22:00Z",
  "owner": {
    "id": "user_789xyz",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "permissions": ["read", "write", "share"],
  "folder_id": "folder_abc123",
  "metadata": {
    "author": "John Doe",
    "title": "Project Proposal",
    "subject": "Q1 2024 Project Proposal",
    "keywords": ["project", "proposal", "2024"],
    "page_count": 15,
    "word_count": 3500,
    "character_count": 21000
  },
  "content_url": "https://api.opensuite.com/v1/documents/doc_123abc456def/content",
  "thumbnail_url": "https://cdn.opensuite.com/thumbnails/doc_123abc456def.jpg"
}
```

### Create Document

Create a new document.

**Endpoint:** `POST /documents`

**Request Body:**
```json
{
  "name": "New Document",
  "folder_id": "folder_abc123",
  "content": "<html><body><p>Hello World</p></body></html>",
  "mime_type": "text/html"
}
```

**Example Request:**
```bash
curl -X POST "https://api.opensuite.com/v1/documents" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Meeting Notes",
    "folder_id": "folder_abc123",
    "content": "<html><body><h1>Meeting Notes</h1><p>Date: 2024-01-20</p></body></html>",
    "mime_type": "text/html"
  }'
```

**Response:**
```json
{
  "id": "doc_456def789ghi",
  "name": "Meeting Notes",
  "mime_type": "text/html",
  "size": 1024,
  "created_at": "2024-01-20T15:00:00Z",
  "updated_at": "2024-01-20T15:00:00Z",
  "owner": {
    "id": "user_789xyz",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "permissions": ["read", "write", "share", "admin"],
  "folder_id": "folder_abc123"
}
```

### Update Document

Update document metadata or content.

**Endpoint:** `PATCH /documents/{document_id}`

**Request Body:**
```json
{
  "name": "Updated Document Name",
  "content": "<html><body><p>Updated content</p></body></html>"
}
```

**Example Request:**
```bash
curl -X PATCH "https://api.opensuite.com/v1/documents/doc_123abc456def" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Project Proposal",
    "metadata": {
      "subject": "Updated Q1 2024 Project Proposal"
    }
  }'
```

### Delete Document

Delete a document.

**Endpoint:** `DELETE /documents/{document_id}`

**Example Request:**
```bash
curl -X DELETE "https://api.opensuite.com/v1/documents/doc_123abc456def" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### Download Document

Download document content.

**Endpoint:** `GET /documents/{document_id}/content`

**Query Parameters:**
- `format` (string, optional): Export format (docx, pdf, html, txt)

**Example Request:**
```bash
curl -X GET "https://api.opensuite.com/v1/documents/doc_123abc456def/content?format=pdf" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --output document.pdf
```

### Upload Document

Upload a document file.

**Endpoint:** `POST /documents/upload`

**Request:** Multipart form-data

**Example Request:**
```bash
curl -X POST "https://api.opensuite.com/v1/documents/upload" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@document.docx" \
  -F "folder_id=folder_abc123" \
  -F "name=Uploaded Document"
```

**Response:**
```json
{
  "id": "doc_789ghi012jkl",
  "name": "Uploaded Document",
  "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "size": 98765,
  "created_at": "2024-01-20T16:00:00Z",
  "updated_at": "2024-01-20T16:00:00Z"
}
```

---

## Collaboration API

### Get Collaborators

List all collaborators for a document.

**Endpoint:** `GET /documents/{document_id}/collaborators`

**Example Request:**
```bash
curl -X GET "https://api.opensuite.com/v1/documents/doc_123abc456def/collaborators" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "collaborators": [
    {
      "user_id": "user_789xyz",
      "email": "john@example.com",
      "name": "John Doe",
      "permission": "edit",
      "added_at": "2024-01-15T10:30:00Z",
      "is_owner": true
    },
    {
      "user_id": "user_456abc",
      "email": "jane@example.com",
      "name": "Jane Smith",
      "permission": "comment",
      "added_at": "2024-01-16T09:15:00Z",
      "is_owner": false
    }
  ]
}
```

### Add Collaborator

Add a collaborator to a document.

**Endpoint:** `POST /documents/{document_id}/collaborators`

**Request Body:**
```json
{
  "email": "collaborator@example.com",
  "permission": "edit",
  "send_notification": true,
  "message": "Please review this document"
}
```

**Example Request:**
```bash
curl -X POST "https://api.opensuite.com/v1/documents/doc_123abc456def/collaborators" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "collaborator@example.com",
    "permission": "edit",
    "send_notification": true,
    "message": "Please review this document"
  }'
```

**Permission Levels:**
- `view` - Can view the document
- `comment` - Can view and add comments
- `edit` - Can view, comment, and edit
- `admin` - Full control including sharing

### Update Collaborator Permission

Update a collaborator's permission level.

**Endpoint:** `PATCH /documents/{document_id}/collaborators/{user_id}`

**Request Body:**
```json
{
  "permission": "comment"
}
```

### Remove Collaborator

Remove a collaborator from a document.

**Endpoint:** `DELETE /documents/{document_id}/collaborators/{user_id}`

### Get Comments

Retrieve all comments for a document.

**Endpoint:** `GET /documents/{document_id}/comments`

**Example Request:**
```bash
curl -X GET "https://api.opensuite.com/v1/documents/doc_123abc456def/comments" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "comments": [
    {
      "id": "comment_abc123",
      "author": {
        "id": "user_789xyz",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "content": "This section needs more detail.",
      "anchor": {
        "type": "text",
        "text": "project timeline",
        "offset": 150
      },
      "created_at": "2024-01-18T11:30:00Z",
      "updated_at": "2024-01-18T11:30:00Z",
      "resolved": false,
      "replies": [
        {
          "id": "reply_def456",
          "author": {
            "id": "user_456abc",
            "name": "Jane Smith",
            "email": "jane@example.com"
          },
          "content": "I'll add more details about the timeline.",
          "created_at": "2024-01-18T14:20:00Z"
        }
      ]
    }
  ]
}
```

### Add Comment

Add a comment to a document.

**Endpoint:** `POST /documents/{document_id}/comments`

**Request Body:**
```json
{
  "content": "This needs clarification.",
  "anchor": {
    "type": "text",
    "text": "budget estimate",
    "offset": 250
  }
}
```

### Resolve Comment

Mark a comment as resolved.

**Endpoint:** `PATCH /documents/{document_id}/comments/{comment_id}`

**Request Body:**
```json
{
  "resolved": true
}
```

### Get Version History

Retrieve version history for a document.

**Endpoint:** `GET /documents/{document_id}/versions`

**Example Request:**
```bash
curl -X GET "https://api.opensuite.com/v1/documents/doc_123abc456def/versions" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "versions": [
    {
      "version_id": "ver_abc123",
      "created_at": "2024-01-20T14:22:00Z",
      "author": {
        "id": "user_789xyz",
        "name": "John Doe"
      },
      "size": 45678,
      "label": "Final draft",
      "changes": {
        "additions": 150,
        "deletions": 50
      }
    },
    {
      "version_id": "ver_def456",
      "created_at": "2024-01-19T16:45:00Z",
      "author": {
        "id": "user_789xyz",
        "name": "John Doe"
      },
      "size": 42000,
      "label": null,
      "changes": {
        "additions": 500,
        "deletions": 200
      }
    }
  ]
}
```

### Restore Version

Restore a document to a previous version.

**Endpoint:** `POST /documents/{document_id}/versions/{version_id}/restore`

---

## Real-time Collaboration API

### WebSocket Connection

Connect to real-time collaboration WebSocket.

**Endpoint:** `wss://ws.opensuite.com/v1/documents/{document_id}`

**Connection Parameters:**
- `access_token`: OAuth access token
- `session_id`: Unique session identifier

**Example Connection:**
```javascript
const ws = new WebSocket(
  `wss://ws.opensuite.com/v1/documents/doc_123abc456def?access_token=${token}&session_id=${sessionId}`
);

ws.onopen = () => {
  console.log('Connected to collaboration session');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleCollaborationEvent(data);
};
```

### Event Types

**Cursor Movement:**
```json
{
  "type": "cursor",
  "user_id": "user_789xyz",
  "position": {
    "paragraph": 5,
    "offset": 120
  },
  "selection": {
    "start": { "paragraph": 5, "offset": 120 },
    "end": { "paragraph": 5, "offset": 150 }
  }
}
```

**Text Change:**
```json
{
  "type": "change",
  "user_id": "user_789xyz",
  "timestamp": "2024-01-20T15:30:00Z",
  "operations": [
    {
      "type": "insert",
      "position": { "paragraph": 5, "offset": 120 },
      "text": "new text"
    },
    {
      "type": "delete",
      "position": { "paragraph": 5, "offset": 100 },
      "length": 10
    }
  ]
}
```

**User Presence:**
```json
{
  "type": "presence",
  "users": [
    {
      "user_id": "user_789xyz",
      "name": "John Doe",
      "color": "#FF5733",
      "active": true
    },
    {
      "user_id": "user_456abc",
      "name": "Jane Smith",
      "color": "#33FF57",
      "active": true
    }
  ]
}
```

---

## Storage API

### List Folders

List folders in storage.

**Endpoint:** `GET /storage/folders`

**Query Parameters:**
- `parent_id` (string, optional): Parent folder ID (root if not specified)
- `limit` (integer, optional): Maximum number of folders to return
- `offset` (integer, optional): Number of folders to skip

### Create Folder

Create a new folder.

**Endpoint:** `POST /storage/folders`

**Request Body:**
```json
{
  "name": "New Folder",
  "parent_id": "folder_abc123"
}
```

### Move Document

Move a document to a different folder.

**Endpoint:** `POST /documents/{document_id}/move`

**Request Body:**
```json
{
  "destination_folder_id": "folder_def456"
}
```

### Copy Document

Copy a document.

**Endpoint:** `POST /documents/{document_id}/copy`

**Request Body:**
```json
{
  "name": "Copy of Document",
  "destination_folder_id": "folder_def456"
}
```

---

## Webhooks

Webhooks allow you to receive real-time notifications when events occur in OpenSuite.

### Create Webhook

**Endpoint:** `POST /webhooks`

**Request Body:**
```json
{
  "url": "https://yourapp.com/webhooks/opensuite",
  "events": [
    "document.created",
    "document.updated",
    "document.deleted",
    "comment.added",
    "collaborator.added"
  ],
  "secret": "your_webhook_secret"
}
```

**Response:**
```json
{
  "id": "webhook_abc123",
  "url": "https://yourapp.com/webhooks/opensuite",
  "events": ["document.created", "document.updated"],
  "active": true,
  "created_at": "2024-01-20T15:00:00Z"
}
```

### Webhook Events

**Document Created:**
```json
{
  "event": "document.created",
  "timestamp": "2024-01-20T15:00:00Z",
  "data": {
    "document_id": "doc_123abc456def",
    "name": "New Document",
    "owner": {
      "id": "user_789xyz",
      "name": "John Doe"
    }
  }
}
```

**Document Updated:**
```json
{
  "event": "document.updated",
  "timestamp": "2024-01-20T15:30:00Z",
  "data": {
    "document_id": "doc_123abc456def",
    "updated_by": {
      "id": "user_789xyz",
      "name": "John Doe"
    },
    "changes": {
      "name": true,
      "content": true
    }
  }
}
```

### Verify Webhook Signature

All webhook payloads include a signature header for verification:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

---

## Error Handling

All API errors return a consistent error response format:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "The requested document does not exist",
    "details": {
      "document_id": "doc_123abc456def"
    },
    "request_id": "req_abc123def456"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | The request was invalid |
| `UNAUTHORIZED` | 401 | Authentication failed |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `DOCUMENT_NOT_FOUND` | 404 | Document not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Rate Limiting

API requests are rate limited to ensure fair usage:

- **Standard Tier:** 1000 requests per hour
- **Professional Tier:** 5000 requests per hour
- **Enterprise Tier:** 10000 requests per hour

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642684800
```

---

## SDKs

### JavaScript/TypeScript SDK

```bash
npm install @opensuite/sdk
```

```javascript
import { OpenSuite } from '@opensuite/sdk';

const client = new OpenSuite({
  accessToken: 'YOUR_ACCESS_TOKEN'
});

// List documents
const documents = await client.documents.list({
  limit: 10,
  sort: 'updated_at'
});

// Create document
const doc = await client.documents.create({
  name: 'New Document',
  content: '<p>Hello World</p>'
});

// Real-time collaboration
const session = await client.collaboration.connect(doc.id);
session.on('change', (change) => {
  console.log('Document changed:', change);
});
```

### Python SDK

```bash
pip install opensuite-sdk
```

```python
from opensuite import OpenSuite

client = OpenSuite(access_token='YOUR_ACCESS_TOKEN')

# List documents
documents = client.documents.list(limit=10)

# Create document
doc = client.documents.create(
    name='New Document',
    content='<p>Hello World</p>'
)
```

---

## Best Practices

### Authentication
- Use OAuth 2.0 for user-facing applications
- Use API keys for server-to-server communication
- Store tokens securely
- Implement token refresh logic

### Error Handling
- Always check HTTP status codes
- Implement retry logic for transient errors
- Log error details for debugging
- Provide user-friendly error messages

### Rate Limiting
- Monitor rate limit headers
- Implement exponential backoff
- Cache responses when possible
- Batch operations when available

### Security
- Use HTTPS for all API calls
- Validate webhook signatures
- Implement proper access controls
- Regularly rotate API keys

### Performance
- Use pagination for large result sets
- Request only needed fields
- Use webhooks instead of polling
- Cache frequently accessed data

---

## Support

- **Documentation:** https://docs.opensuite.com
- **API Status:** https://status.opensuite.com
- **Support Email:** api-support@opensuite.com
- **Developer Forum:** https://community.opensuite.com

---

**API Version:** 1.0  
**Last Updated:** 2024-01-20  
**© OpenSuite 2024**
