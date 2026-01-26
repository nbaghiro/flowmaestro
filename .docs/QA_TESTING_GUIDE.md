# FlowMaestro QA Testing Guide

A comprehensive manual testing guide for QA testers to systematically test all features of the FlowMaestro platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Test Environment Setup](#test-environment-setup)
3. [Authentication & User Management](#1-authentication--user-management)
4. [Dashboard & Navigation](#2-dashboard--navigation)
5. [Workflow Management](#3-workflow-management)
6. [Workflow Canvas & Nodes](#4-workflow-canvas--nodes)
7. [Chat Interfaces](#5-chat-interfaces)
8. [Form Interfaces](#6-form-interfaces)
9. [Agents](#7-agents)
10. [Knowledge Bases](#8-knowledge-bases)
11. [Personas](#9-personas)
12. [Connections & OAuth](#10-connections--oauth)
13. [Triggers & Webhooks](#11-triggers--webhooks)
14. [Templates](#12-templates)
15. [Workspace Management](#13-workspace-management)
16. [Analytics](#14-analytics)
17. [Settings](#15-settings)
18. [Public APIs](#16-public-apis-v1)
19. [Cross-Browser Testing](#17-cross-browser-testing)
20. [Mobile Responsiveness](#18-mobile-responsiveness)
21. [Performance Testing](#19-performance-testing)
22. [Bug Reporting Template](#bug-reporting-template)

---

## Getting Started

### Testing Philosophy

This guide assumes the platform has NOT been well tested. Your goal is to:

- **Break things** - Try unexpected inputs, rapid clicking, edge cases
- **Document everything** - Even minor visual glitches matter
- **Think like a user** - Test real-world scenarios, not just happy paths
- **Be thorough** - Test each feature completely before moving on

### Priority Levels

| Priority | Meaning                   | Testing Effort           |
| -------- | ------------------------- | ------------------------ |
| 🔴 P0    | Critical path - Must work | Test exhaustively        |
| 🟠 P1    | Important feature         | Test thoroughly          |
| 🟡 P2    | Nice to have              | Test basic functionality |
| ⚪ P3    | Low priority              | Smoke test only          |

### Test Data Suggestions

Keep these test values handy:

```
Email formats to test:
- valid@example.com
- test+tag@example.com
- user@subdomain.domain.co.uk
- UPPERCASE@EMAIL.COM
- invalid-no-at.com
- @missing-local.com
- spaces in@email.com

Password formats to test:
- Short: "abc"
- No special chars: "password123"
- Valid: "SecureP@ss123!"
- Very long: (200+ characters)
- Unicode: "Pässwörd123!"
- Spaces: "my password 123"

Text inputs to test:
- Empty string
- Single character: "a"
- Very long string (10,000+ chars)
- Unicode: "日本語テスト"
- Emojis: "Test 🚀 emoji 💻"
- HTML injection: "<script>alert('xss')</script>"
- SQL injection: "'; DROP TABLE users;--"
- Special chars: "Test & < > \" ' / \\"
```

---

## Test Environment Setup

### Prerequisites

1. **Browser**: Latest Chrome, Firefox, Safari, and Edge
2. **Network**: Stable internet connection
3. **Test Accounts**:
    - Fresh account for registration testing
    - Existing account with data for feature testing
    - Admin account for workspace testing
4. **Test Files**:
    - PDF files (small, large, corrupted)
    - Images (PNG, JPG, GIF, SVG)
    - Text files (TXT, CSV, JSON)
    - Invalid files (renamed extensions)

### Environment URLs

| Environment | URL              | Purpose            |
| ----------- | ---------------- | ------------------ |
| Development | localhost:3000   | Local testing      |
| Staging     | (staging URL)    | Pre-production     |
| Production  | (production URL) | Final verification |

---

## 1. Authentication & User Management

### 1.1 User Registration 🔴 P0

**Route**: `/register`

#### Test Cases

| ID     | Test Case                           | Steps                                                                     | Expected Result                          |
| ------ | ----------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| REG-01 | Register with valid data            | 1. Go to /register<br>2. Enter valid email, password<br>3. Click Register | Account created, verification email sent |
| REG-02 | Register with existing email        | 1. Use email that's already registered                                    | Error: "Email already in use"            |
| REG-03 | Register with weak password         | 1. Use password "123"                                                     | Error: Password requirements not met     |
| REG-04 | Register with invalid email         | 1. Use "not-an-email"                                                     | Validation error shown                   |
| REG-05 | Register with empty fields          | 1. Leave all fields empty<br>2. Click Register                            | Validation errors for required fields    |
| REG-06 | Register with XSS in name           | 1. Enter `<script>alert(1)</script>` as name                              | Script not executed, sanitized display   |
| REG-07 | Double-click register button        | 1. Fill valid data<br>2. Double-click Register                            | Only one account created                 |
| REG-08 | Registration during network failure | 1. Fill data<br>2. Disconnect network<br>3. Submit                        | Appropriate error message                |

#### Edge Cases to Test

- [ ] Paste password from clipboard
- [ ] Browser autofill behavior
- [ ] "Show password" toggle functionality
- [ ] Tab navigation through form fields
- [ ] Enter key submits form

---

### 1.2 User Login 🔴 P0

**Route**: `/login`

#### Test Cases

| ID       | Test Case                     | Steps                                                               | Expected Result                             |
| -------- | ----------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| LOGIN-01 | Login with valid credentials  | 1. Enter valid email/password<br>2. Click Login                     | Redirected to dashboard                     |
| LOGIN-02 | Login with wrong password     | 1. Enter valid email<br>2. Enter wrong password                     | Error: "Invalid credentials"                |
| LOGIN-03 | Login with non-existent email | 1. Enter unregistered email                                         | Error: "Invalid credentials" (same message) |
| LOGIN-04 | Login with empty fields       | 1. Click Login with empty form                                      | Validation errors                           |
| LOGIN-05 | Login case sensitivity        | 1. Try email in UPPERCASE                                           | Should work (email case-insensitive)        |
| LOGIN-06 | Brute force protection        | 1. Try 10+ wrong passwords                                          | Account locked or rate limited              |
| LOGIN-07 | Remember me functionality     | 1. Check "Remember me"<br>2. Login<br>3. Close browser<br>4. Reopen | Should stay logged in                       |
| LOGIN-08 | Session timeout               | 1. Login<br>2. Wait for session expiry                              | Graceful redirect to login                  |

#### Edge Cases to Test

- [ ] Login with spaces around email
- [ ] Copy/paste password with trailing spaces
- [ ] Multiple browser tabs logging in simultaneously
- [ ] Login from different IP addresses

---

### 1.3 Email Verification 🔴 P0

**Route**: `/verify-email`

#### Test Cases

| ID     | Test Case                     | Steps                                            | Expected Result             |
| ------ | ----------------------------- | ------------------------------------------------ | --------------------------- |
| VER-01 | Verify with valid token       | 1. Click link from email                         | Email verified, redirected  |
| VER-02 | Verify with expired token     | 1. Wait for token expiry<br>2. Click link        | Error with option to resend |
| VER-03 | Verify with invalid token     | 1. Modify token in URL                           | Error: Invalid token        |
| VER-04 | Verify already verified email | 1. Click verification link twice                 | Appropriate message         |
| VER-05 | Resend verification email     | 1. Request new verification<br>2. Check old link | Old link should be invalid  |

---

### 1.4 Password Reset 🔴 P0

**Routes**: `/forgot-password`, `/reset-password`

#### Test Cases

| ID     | Test Case                           | Steps                                        | Expected Result                        |
| ------ | ----------------------------------- | -------------------------------------------- | -------------------------------------- |
| PWD-01 | Request reset for valid email       | 1. Enter registered email<br>2. Submit       | "Reset email sent" (even if not found) |
| PWD-02 | Request reset for invalid email     | 1. Enter unregistered email                  | Same message (no enumeration)          |
| PWD-03 | Reset with valid token              | 1. Click reset link<br>2. Enter new password | Password changed                       |
| PWD-04 | Reset with expired token            | 1. Wait for expiry<br>2. Click link          | Error: Token expired                   |
| PWD-05 | Reset with weak password            | 1. Enter weak new password                   | Validation error                       |
| PWD-06 | Use reset link twice                | 1. Reset password<br>2. Click link again     | Error: Token already used              |
| PWD-07 | Login with old password after reset | 1. Reset password<br>2. Try old password     | Login fails                            |

---

### 1.5 Two-Factor Authentication 🟠 P1

**Route**: Account settings

#### Test Cases

| ID     | Test Case                 | Steps                                                                          | Expected Result                 |
| ------ | ------------------------- | ------------------------------------------------------------------------------ | ------------------------------- |
| 2FA-01 | Enable 2FA                | 1. Go to account settings<br>2. Enable 2FA<br>3. Scan QR code<br>4. Enter code | 2FA enabled, backup codes shown |
| 2FA-02 | Login with 2FA enabled    | 1. Login with password<br>2. Enter 2FA code                                    | Login successful                |
| 2FA-03 | Login with wrong 2FA code | 1. Enter incorrect code                                                        | Error, retry allowed            |
| 2FA-04 | Use backup code           | 1. Click "Use backup code"<br>2. Enter valid backup code                       | Login successful, code consumed |
| 2FA-05 | Disable 2FA               | 1. Go to settings<br>2. Disable 2FA<br>3. Confirm with code                    | 2FA disabled                    |
| 2FA-06 | Backup code already used  | 1. Try using same backup code twice                                            | Error on second use             |

---

### 1.6 OAuth Login 🟠 P1

**Providers**: Google, Microsoft

#### Test Cases

| ID       | Test Case                      | Steps                                                   | Expected Result                  |
| -------- | ------------------------------ | ------------------------------------------------------- | -------------------------------- |
| OAUTH-01 | Login with Google              | 1. Click "Login with Google"<br>2. Complete Google auth | Account created/linked           |
| OAUTH-02 | Login with Microsoft           | 1. Click "Login with Microsoft"<br>2. Complete MS auth  | Account created/linked           |
| OAUTH-03 | Link OAuth to existing account | 1. Login normally<br>2. Link Google account             | Accounts connected               |
| OAUTH-04 | Cancel OAuth flow              | 1. Click OAuth login<br>2. Cancel on provider           | Returned to login page           |
| OAUTH-05 | OAuth with already used email  | 1. OAuth with email that exists                         | Proper handling (merge or error) |

---

## 2. Dashboard & Navigation

### 2.1 Home Page 🔴 P0

**Route**: `/`

#### Test Cases

| ID      | Test Case            | Steps                        | Expected Result               |
| ------- | -------------------- | ---------------------------- | ----------------------------- |
| HOME-01 | Load home page       | 1. Login<br>2. Navigate to / | Dashboard loads with sections |
| HOME-02 | Recent items display | 1. View recent items section | Shows recently accessed items |
| HOME-03 | Quick action cards   | 1. Click each quick action   | Navigate to correct page      |
| HOME-04 | Empty state          | 1. New account with no items | Appropriate empty state UI    |
| HOME-05 | Featured templates   | 1. View templates section    | Templates display correctly   |

---

### 2.2 Navigation Sidebar 🔴 P0

#### Test Cases

| ID     | Test Case                 | Steps                                              | Expected Result            |
| ------ | ------------------------- | -------------------------------------------------- | -------------------------- |
| NAV-01 | All menu items accessible | 1. Click each menu item                            | Navigate to correct page   |
| NAV-02 | Active state highlight    | 1. Navigate to page                                | Current page highlighted   |
| NAV-03 | Collapse/expand sidebar   | 1. Toggle sidebar                                  | Collapses and expands      |
| NAV-04 | Workspace switcher        | 1. Click workspace dropdown<br>2. Switch workspace | Context switches correctly |
| NAV-05 | Mobile menu               | 1. Resize to mobile<br>2. Open hamburger menu      | Menu works on mobile       |

#### Menu Items to Test

- [ ] Workflows
- [ ] Agents
- [ ] Form Interfaces
- [ ] Chat Interfaces
- [ ] Connections
- [ ] Knowledge Bases
- [ ] Templates
- [ ] Personas
- [ ] Analytics
- [ ] Settings

---

## 3. Workflow Management

### 3.1 List Workflows 🔴 P0

**Route**: `/workflows`

#### Test Cases

| ID         | Test Case          | Steps                                        | Expected Result                  |
| ---------- | ------------------ | -------------------------------------------- | -------------------------------- |
| WF-LIST-01 | View workflow list | 1. Navigate to /workflows                    | List displays workflows          |
| WF-LIST-02 | Empty state        | 1. Account with no workflows                 | "Create your first workflow" CTA |
| WF-LIST-03 | Pagination         | 1. Create 20+ workflows<br>2. Navigate pages | Pagination works                 |
| WF-LIST-04 | Search workflows   | 1. Enter search term                         | Filters results correctly        |
| WF-LIST-05 | Sort workflows     | 1. Click sort options                        | Sorts by name/date/etc           |
| WF-LIST-06 | Filter by status   | 1. Apply status filter                       | Shows only matching              |

---

### 3.2 Create Workflow 🔴 P0

#### Test Cases

| ID           | Test Case                  | Steps                                               | Expected Result                    |
| ------------ | -------------------------- | --------------------------------------------------- | ---------------------------------- |
| WF-CREATE-01 | Create with valid name     | 1. Click "New Workflow"<br>2. Enter name<br>3. Save | Workflow created                   |
| WF-CREATE-02 | Create with empty name     | 1. Leave name empty                                 | Validation error                   |
| WF-CREATE-03 | Create with very long name | 1. Enter 500+ char name                             | Truncated or error                 |
| WF-CREATE-04 | Create with special chars  | 1. Enter `<script>` in name                         | Sanitized, workflow created        |
| WF-CREATE-05 | Duplicate name             | 1. Create workflow with existing name               | Allowed (or unique name generated) |
| WF-CREATE-06 | Cancel creation            | 1. Start creating<br>2. Click Cancel                | No workflow created                |

---

### 3.3 Edit Workflow 🔴 P0

**Route**: `/builder/:workflowId`

#### Test Cases

| ID         | Test Case                    | Steps                               | Expected Result          |
| ---------- | ---------------------------- | ----------------------------------- | ------------------------ |
| WF-EDIT-01 | Open workflow editor         | 1. Click workflow card              | Editor loads with canvas |
| WF-EDIT-02 | Update workflow name         | 1. Change name<br>2. Save           | Name updated             |
| WF-EDIT-03 | Auto-save                    | 1. Make changes<br>2. Wait          | Changes auto-saved       |
| WF-EDIT-04 | Unsaved changes warning      | 1. Make changes<br>2. Navigate away | Warning dialog appears   |
| WF-EDIT-05 | Edit non-existent workflow   | 1. Go to /builder/invalid-id        | 404 or error page        |
| WF-EDIT-06 | Edit another user's workflow | 1. Access workflow you don't own    | Permission denied        |

---

### 3.4 Delete Workflow 🟠 P1

#### Test Cases

| ID        | Test Case               | Steps                               | Expected Result            |
| --------- | ----------------------- | ----------------------------------- | -------------------------- |
| WF-DEL-01 | Delete workflow         | 1. Click delete<br>2. Confirm       | Workflow removed from list |
| WF-DEL-02 | Cancel deletion         | 1. Click delete<br>2. Cancel        | Workflow not deleted       |
| WF-DEL-03 | Delete running workflow | 1. Start execution<br>2. Try delete | Appropriate error/warning  |

---

### 3.5 Execute Workflow 🔴 P0

#### Test Cases

| ID         | Test Case                   | Steps                                                     | Expected Result                |
| ---------- | --------------------------- | --------------------------------------------------------- | ------------------------------ |
| WF-EXEC-01 | Execute simple workflow     | 1. Open workflow<br>2. Click Execute<br>3. Provide inputs | Execution starts, status shown |
| WF-EXEC-02 | Execute with missing inputs | 1. Execute without required input                         | Error: Input required          |
| WF-EXEC-03 | View execution progress     | 1. Execute<br>2. Watch progress                           | Real-time status updates       |
| WF-EXEC-04 | Cancel execution            | 1. Start execution<br>2. Click Cancel                     | Execution cancelled            |
| WF-EXEC-05 | Execute invalid workflow    | 1. Create workflow with errors<br>2. Execute              | Validation errors shown        |
| WF-EXEC-06 | Concurrent executions       | 1. Execute same workflow multiple times                   | All executions tracked         |

---

### 3.6 Workflow Checkpoints 🟡 P2

#### Test Cases

| ID       | Test Case            | Steps                                          | Expected Result    |
| -------- | -------------------- | ---------------------------------------------- | ------------------ |
| WF-CP-01 | Create checkpoint    | 1. Make changes<br>2. Create checkpoint        | Checkpoint saved   |
| WF-CP-02 | Revert to checkpoint | 1. Make changes<br>2. Revert to old checkpoint | State restored     |
| WF-CP-03 | Delete checkpoint    | 1. Delete a checkpoint                         | Checkpoint removed |
| WF-CP-04 | Rename checkpoint    | 1. Rename checkpoint                           | Name updated       |

---

### 3.7 AI Workflow Generation 🟠 P1

#### Test Cases

| ID        | Test Case                  | Steps                                             | Expected Result              |
| --------- | -------------------------- | ------------------------------------------------- | ---------------------------- |
| WF-GEN-01 | Generate from description  | 1. Enter "Send daily email report"<br>2. Generate | Workflow generated           |
| WF-GEN-02 | Generate empty description | 1. Submit empty prompt                            | Error or guidance            |
| WF-GEN-03 | Generate complex workflow  | 1. Enter complex multi-step description           | Reasonable attempt generated |
| WF-GEN-04 | Streaming response         | 1. Generate workflow                              | See real-time generation     |
| WF-GEN-05 | Cancel generation          | 1. Start generating<br>2. Cancel                  | Generation stops             |

---

## 4. Workflow Canvas & Nodes

### 4.1 Canvas Basics 🔴 P0

#### Test Cases

| ID        | Test Case   | Steps                                    | Expected Result         |
| --------- | ----------- | ---------------------------------------- | ----------------------- |
| CANVAS-01 | Pan canvas  | 1. Click and drag canvas                 | Canvas moves            |
| CANVAS-02 | Zoom in/out | 1. Use scroll wheel or zoom buttons      | Zoom works              |
| CANVAS-03 | Fit to view | 1. Click fit to view                     | All nodes visible       |
| CANVAS-04 | Mini map    | 1. View mini map                         | Shows workflow overview |
| CANVAS-05 | Undo/Redo   | 1. Make change<br>2. Ctrl+Z<br>3. Ctrl+Y | Actions undone/redone   |

---

### 4.2 Node Operations 🔴 P0

#### Test Cases

| ID      | Test Case             | Steps                                    | Expected Result             |
| ------- | --------------------- | ---------------------------------------- | --------------------------- |
| NODE-01 | Add node from library | 1. Drag node from library to canvas      | Node added                  |
| NODE-02 | Select node           | 1. Click node                            | Node selected, config shown |
| NODE-03 | Move node             | 1. Drag node                             | Node repositions            |
| NODE-04 | Delete node           | 1. Select node<br>2. Press Delete        | Node removed                |
| NODE-05 | Duplicate node        | 1. Select node<br>2. Ctrl+D              | Node duplicated             |
| NODE-06 | Multi-select nodes    | 1. Hold Shift<br>2. Click multiple nodes | Multiple selected           |
| NODE-07 | Delete multiple nodes | 1. Multi-select<br>2. Delete             | All selected removed        |

---

### 4.3 Node Connections 🔴 P0

#### Test Cases

| ID      | Test Case           | Steps                                    | Expected Result                |
| ------- | ------------------- | ---------------------------------------- | ------------------------------ |
| CONN-01 | Connect two nodes   | 1. Drag from output to input             | Connection created             |
| CONN-02 | Delete connection   | 1. Click connection<br>2. Delete         | Connection removed             |
| CONN-03 | Invalid connection  | 1. Connect incompatible nodes            | Connection rejected or warning |
| CONN-04 | Reconnect edge      | 1. Drag edge end to different node       | Edge reconnects                |
| CONN-05 | Multiple outputs    | 1. Connect one output to multiple inputs | Multiple connections allowed   |
| CONN-06 | Circular connection | 1. Try to create loop                    | Prevented or warning           |

---

### 4.4 Node Types (Test Each) 🔴 P0

For EACH node type, test:

1. **Add node** - Can add from library
2. **Configure** - All settings accessible
3. **Validate** - Invalid config shows errors
4. **Execute** - Node runs correctly in workflow
5. **View output** - Output visible after execution

#### Input Nodes

- [ ] Input Node - Basic user input
- [ ] File Download Node
- [ ] File Read Node
- [ ] PDF Extract Node
- [ ] URL Node
- [ ] Web Search Node
- [ ] Web Browse Node
- [ ] Audio Input Node

#### AI Nodes

- [ ] LLM Node - Test with different providers (OpenAI, Anthropic)
- [ ] Vision Node
- [ ] Image Generation Node
- [ ] Video Generation Node
- [ ] Audio Transcription Node
- [ ] Text-to-Speech Node
- [ ] Embeddings Node
- [ ] OCR Node
- [ ] Knowledge Base Query Node

#### Logic Nodes

- [ ] Code Node - Test JavaScript execution
- [ ] Conditional Node - Test if/else branching
- [ ] Switch Node - Test multiple branches
- [ ] Loop Node - Test iteration
- [ ] Wait Node - Test delays
- [ ] Transform Node - Test data transformation
- [ ] Human Review Node
- [ ] Shared Memory Node
- [ ] Router Node

#### Output Nodes

- [ ] Output Node
- [ ] File Write Node
- [ ] PDF Generation Node
- [ ] Spreadsheet Generation Node
- [ ] Screenshot Capture Node
- [ ] Chart Generation Node

#### Integration Nodes

- [ ] HTTP Node - Test GET, POST, PUT, DELETE
- [ ] Database Node
- [ ] Integration Node (various providers)

---

### 4.5 LLM Node Deep Dive 🔴 P0

**Most critical node - test thoroughly**

#### Test Cases

| ID     | Test Case             | Steps                                                   | Expected Result                |
| ------ | --------------------- | ------------------------------------------------------- | ------------------------------ |
| LLM-01 | Basic prompt          | 1. Add LLM node<br>2. Enter simple prompt<br>3. Execute | Response generated             |
| LLM-02 | Prompt with variables | 1. Use {{input}} syntax<br>2. Provide variable          | Variable substituted           |
| LLM-03 | System prompt         | 1. Set system prompt<br>2. Execute                      | System prompt affects output   |
| LLM-04 | Temperature setting   | 1. Set temperature 0 vs 1<br>2. Compare outputs         | Difference in creativity       |
| LLM-05 | Max tokens            | 1. Set low max tokens                                   | Output truncated appropriately |
| LLM-06 | Provider selection    | 1. Select different providers                           | Each provider works            |
| LLM-07 | Model selection       | 1. Select different models                              | Each model works               |
| LLM-08 | Streaming output      | 1. Execute LLM node                                     | See streaming response         |
| LLM-09 | Error handling        | 1. Invalid API key scenario                             | Appropriate error message      |

---

### 4.6 HTTP Node Deep Dive 🔴 P0

#### Test Cases

| ID      | Test Case       | Steps                                        | Expected Result          |
| ------- | --------------- | -------------------------------------------- | ------------------------ |
| HTTP-01 | GET request     | 1. Configure GET to public API<br>2. Execute | Response received        |
| HTTP-02 | POST with JSON  | 1. Configure POST with body<br>2. Execute    | Request sent correctly   |
| HTTP-03 | Headers         | 1. Add custom headers                        | Headers sent             |
| HTTP-04 | Authentication  | 1. Configure auth (Bearer, Basic)            | Auth works               |
| HTTP-05 | Timeout         | 1. Request slow endpoint                     | Timeout handled          |
| HTTP-06 | Error response  | 1. Request endpoint that returns 500         | Error handled gracefully |
| HTTP-07 | Variable in URL | 1. Use {{variable}} in URL                   | Variable substituted     |

---

### 4.7 Code Node Deep Dive 🔴 P0

#### Test Cases

| ID      | Test Case              | Steps                                     | Expected Result             |
| ------- | ---------------------- | ----------------------------------------- | --------------------------- |
| CODE-01 | Simple code            | 1. Write `return input * 2`<br>2. Execute | Correct result              |
| CODE-02 | Access input variables | 1. Reference `context.variables.x`        | Variable accessible         |
| CODE-03 | Syntax error           | 1. Write invalid JavaScript               | Error message shown         |
| CODE-04 | Infinite loop          | 1. Write `while(true){}`<br>2. Execute    | Timeout/cancelled           |
| CODE-05 | Return object          | 1. Return `{a: 1, b: 2}`                  | Object available downstream |
| CODE-06 | Async code             | 1. Write async/await code                 | Async handled               |
| CODE-07 | Console output         | 1. Use console.log                        | Logs visible in execution   |

---

## 5. Chat Interfaces

### 5.1 List Chat Interfaces 🔴 P0

**Route**: `/chat-interfaces`

#### Test Cases

| ID           | Test Case   | Steps                           | Expected Result      |
| ------------ | ----------- | ------------------------------- | -------------------- |
| CHAT-LIST-01 | View list   | 1. Navigate to /chat-interfaces | List displays        |
| CHAT-LIST-02 | Empty state | 1. No chat interfaces           | Empty state with CTA |
| CHAT-LIST-03 | Search      | 1. Search by name               | Filters correctly    |

---

### 5.2 Create Chat Interface 🔴 P0

#### Test Cases

| ID             | Test Case       | Steps                                                     | Expected Result   |
| -------------- | --------------- | --------------------------------------------------------- | ----------------- |
| CHAT-CREATE-01 | Create basic    | 1. Click New<br>2. Enter name<br>3. Select agent/workflow | Interface created |
| CHAT-CREATE-02 | Without backend | 1. Don't select agent/workflow                            | Error or default  |

---

### 5.3 Chat Interface Editor 🔴 P0

**Route**: `/chat-interfaces/:id/edit`

#### Test Cases

| ID           | Test Case                    | Steps                         | Expected Result           |
| ------------ | ---------------------------- | ----------------------------- | ------------------------- |
| CHAT-EDIT-01 | Edit title                   | 1. Change title<br>2. Save    | Title updated             |
| CHAT-EDIT-02 | Edit welcome message         | 1. Change welcome message     | Message updated           |
| CHAT-EDIT-03 | Edit theme colors            | 1. Change primary color       | Preview updates           |
| CHAT-EDIT-04 | Upload logo                  | 1. Upload image<br>2. Preview | Logo displayed            |
| CHAT-EDIT-05 | Configure suggested messages | 1. Add starter prompts        | Prompts appear in preview |

---

### 5.4 Publish Chat Interface 🔴 P0

#### Test Cases

| ID          | Test Case         | Steps                                          | Expected Result        |
| ----------- | ----------------- | ---------------------------------------------- | ---------------------- |
| CHAT-PUB-01 | Publish interface | 1. Click Publish                               | Public URL generated   |
| CHAT-PUB-02 | Access public URL | 1. Open public URL logged out                  | Chat accessible        |
| CHAT-PUB-03 | Unpublish         | 1. Unpublish interface<br>2. Access public URL | Access denied          |
| CHAT-PUB-04 | Custom slug       | 1. Set custom slug<br>2. Access via slug       | Works with custom slug |

---

### 5.5 Public Chat 🔴 P0

**Route**: `/c/:slug`

#### Test Cases

| ID          | Test Case          | Steps                         | Expected Result         |
| ----------- | ------------------ | ----------------------------- | ----------------------- |
| PUB-CHAT-01 | Load public chat   | 1. Go to public URL           | Chat loads              |
| PUB-CHAT-02 | Send message       | 1. Type message<br>2. Send    | Response received       |
| PUB-CHAT-03 | Streaming response | 1. Send message               | See streaming text      |
| PUB-CHAT-04 | Multiple messages  | 1. Have conversation          | Context maintained      |
| PUB-CHAT-05 | Rate limiting      | 1. Send many messages rapidly | Rate limit message      |
| PUB-CHAT-06 | Long message       | 1. Send 10,000 char message   | Handled appropriately   |
| PUB-CHAT-07 | Empty message      | 1. Try to send empty          | Prevented               |
| PUB-CHAT-08 | XSS in message     | 1. Send `<script>`            | Sanitized, no execution |

---

### 5.6 Embedded Chat 🟠 P1

**Route**: `/embed/:slug`

#### Test Cases

| ID       | Test Case       | Steps                               | Expected Result      |
| -------- | --------------- | ----------------------------------- | -------------------- |
| EMBED-01 | Widget bubble   | 1. Embed in page<br>2. Click bubble | Chat opens           |
| EMBED-02 | Full page embed | 1. Use fullscreen mode              | Full page chat       |
| EMBED-03 | Iframe embed    | 1. Embed via iframe                 | Chat works in iframe |
| EMBED-04 | Cross-origin    | 1. Embed on different domain        | CORS handled         |

---

### 5.7 Chat Sessions 🟡 P2

**Route**: `/chat-interfaces/:id/sessions`

#### Test Cases

| ID      | Test Case           | Steps                   | Expected Result          |
| ------- | ------------------- | ----------------------- | ------------------------ |
| SESS-01 | View sessions       | 1. Navigate to sessions | List of conversations    |
| SESS-02 | View session detail | 1. Click session        | See conversation history |
| SESS-03 | Delete session      | 1. Delete session       | Session removed          |

---

## 6. Form Interfaces

### 6.1 List Form Interfaces 🔴 P0

**Route**: `/form-interfaces`

#### Test Cases

| ID           | Test Case   | Steps                           | Expected Result      |
| ------------ | ----------- | ------------------------------- | -------------------- |
| FORM-LIST-01 | View list   | 1. Navigate to /form-interfaces | List displays        |
| FORM-LIST-02 | Empty state | 1. No forms                     | Empty state with CTA |

---

### 6.2 Form Interface Editor 🔴 P0

**Route**: `/form-interfaces/:id/edit`

#### Test Cases

| ID           | Test Case        | Steps                                 | Expected Result     |
| ------------ | ---------------- | ------------------------------------- | ------------------- |
| FORM-EDIT-01 | Add text field   | 1. Add text input field               | Field added         |
| FORM-EDIT-02 | Add dropdown     | 1. Add select field<br>2. Add options | Dropdown works      |
| FORM-EDIT-03 | Add file upload  | 1. Add file upload field              | Upload field works  |
| FORM-EDIT-04 | Required field   | 1. Mark field as required             | Validation enforced |
| FORM-EDIT-05 | Reorder fields   | 1. Drag to reorder                    | Order changes       |
| FORM-EDIT-06 | Delete field     | 1. Delete a field                     | Field removed       |
| FORM-EDIT-07 | Field validation | 1. Add regex validation               | Validation works    |

---

### 6.3 Public Form 🔴 P0

**Route**: `/i/:slug`

#### Test Cases

| ID          | Test Case         | Steps                               | Expected Result     |
| ----------- | ----------------- | ----------------------------------- | ------------------- |
| PUB-FORM-01 | Load public form  | 1. Go to public URL                 | Form loads          |
| PUB-FORM-02 | Submit form       | 1. Fill all fields<br>2. Submit     | Submission recorded |
| PUB-FORM-03 | Validation errors | 1. Skip required field<br>2. Submit | Error shown         |
| PUB-FORM-04 | File upload       | 1. Upload file via form             | File attached       |
| PUB-FORM-05 | Success message   | 1. Submit successfully              | Thank you message   |

---

### 6.4 Form Submissions 🟡 P2

**Route**: `/form-interfaces/:id/submissions`

#### Test Cases

| ID     | Test Case              | Steps                      | Expected Result      |
| ------ | ---------------------- | -------------------------- | -------------------- |
| SUB-01 | View submissions       | 1. Navigate to submissions | List of submissions  |
| SUB-02 | View submission detail | 1. Click submission        | See all field values |
| SUB-03 | Download submissions   | 1. Export to CSV           | CSV downloads        |

---

## 7. Agents

### 7.1 List Agents 🔴 P0

**Route**: `/agents`

#### Test Cases

| ID            | Test Case   | Steps                  | Expected Result |
| ------------- | ----------- | ---------------------- | --------------- |
| AGENT-LIST-01 | View list   | 1. Navigate to /agents | List displays   |
| AGENT-LIST-02 | Empty state | 1. No agents           | Empty state     |

---

### 7.2 Create Agent 🔴 P0

#### Test Cases

| ID              | Test Case            | Steps                                      | Expected Result             |
| --------------- | -------------------- | ------------------------------------------ | --------------------------- |
| AGENT-CREATE-01 | Create basic agent   | 1. Click New<br>2. Enter name, description | Agent created               |
| AGENT-CREATE-02 | Create from template | 1. Select template                         | Agent created from template |

---

### 7.3 Agent Builder 🔴 P0

**Route**: `/agents/:id/build`

#### Test Cases

| ID             | Test Case         | Steps                               | Expected Result     |
| -------------- | ----------------- | ----------------------------------- | ------------------- |
| AGENT-BUILD-01 | Set system prompt | 1. Enter system prompt              | Prompt saved        |
| AGENT-BUILD-02 | Add tool          | 1. Click Add Tool<br>2. Select tool | Tool added          |
| AGENT-BUILD-03 | Remove tool       | 1. Click remove on tool             | Tool removed        |
| AGENT-BUILD-04 | Configure tool    | 1. Open tool settings               | Settings accessible |
| AGENT-BUILD-05 | Select model      | 1. Choose LLM model                 | Model selected      |
| AGENT-BUILD-06 | Set temperature   | 1. Adjust temperature               | Setting saved       |

---

### 7.4 Agent Chat 🔴 P0

#### Test Cases

| ID            | Test Case               | Steps                          | Expected Result           |
| ------------- | ----------------------- | ------------------------------ | ------------------------- |
| AGENT-CHAT-01 | Send message            | 1. Type message<br>2. Send     | Agent responds            |
| AGENT-CHAT-02 | Tool usage              | 1. Ask agent to use tool       | Tool called, result shown |
| AGENT-CHAT-03 | Streaming               | 1. Send message                | Streaming response        |
| AGENT-CHAT-04 | Multi-turn conversation | 1. Have back-and-forth         | Context maintained        |
| AGENT-CHAT-05 | Stop generation         | 1. Click stop while generating | Generation stops          |
| AGENT-CHAT-06 | Long response           | 1. Ask for detailed response   | Full response shown       |

---

### 7.5 Agent Threads 🟡 P2

**Route**: `/agents/:id/threads`

#### Test Cases

| ID        | Test Case       | Steps                                       | Expected Result       |
| --------- | --------------- | ------------------------------------------- | --------------------- |
| THREAD-01 | View threads    | 1. Navigate to threads                      | List of conversations |
| THREAD-02 | Continue thread | 1. Click thread<br>2. Continue conversation | Context preserved     |
| THREAD-03 | New thread      | 1. Start new thread                         | Fresh conversation    |

---

## 8. Knowledge Bases

### 8.1 List Knowledge Bases 🔴 P0

**Route**: `/knowledge-bases`

#### Test Cases

| ID         | Test Case   | Steps                           | Expected Result |
| ---------- | ----------- | ------------------------------- | --------------- |
| KB-LIST-01 | View list   | 1. Navigate to /knowledge-bases | List displays   |
| KB-LIST-02 | Empty state | 1. No KBs                       | Empty state     |

---

### 8.2 Create Knowledge Base 🔴 P0

#### Test Cases

| ID           | Test Case | Steps                         | Expected Result |
| ------------ | --------- | ----------------------------- | --------------- |
| KB-CREATE-01 | Create KB | 1. Click New<br>2. Enter name | KB created      |

---

### 8.3 Upload Documents 🔴 P0

#### Test Cases

| ID           | Test Case            | Steps                        | Expected Result            |
| ------------ | -------------------- | ---------------------------- | -------------------------- |
| KB-UPLOAD-01 | Upload PDF           | 1. Upload PDF file           | Document processed         |
| KB-UPLOAD-02 | Upload TXT           | 1. Upload TXT file           | Document processed         |
| KB-UPLOAD-03 | Upload large file    | 1. Upload 50MB file          | Handled (error or success) |
| KB-UPLOAD-04 | Upload invalid file  | 1. Upload .exe file          | Rejected                   |
| KB-UPLOAD-05 | Upload corrupted PDF | 1. Upload corrupted file     | Error message              |
| KB-UPLOAD-06 | Multiple files       | 1. Upload 5 files at once    | All processed              |
| KB-UPLOAD-07 | Processing status    | 1. Upload<br>2. Watch status | Shows processing progress  |

---

### 8.4 Add URL 🟠 P1

#### Test Cases

| ID        | Test Case       | Steps                  | Expected Result |
| --------- | --------------- | ---------------------- | --------------- |
| KB-URL-01 | Add valid URL   | 1. Enter webpage URL   | Content fetched |
| KB-URL-02 | Add invalid URL | 1. Enter "not-a-url"   | Error           |
| KB-URL-03 | Add 404 URL     | 1. Enter URL that 404s | Error handled   |

---

### 8.5 Query Knowledge Base 🔴 P0

#### Test Cases

| ID          | Test Case        | Steps                          | Expected Result       |
| ----------- | ---------------- | ------------------------------ | --------------------- |
| KB-QUERY-01 | Basic query      | 1. Enter question<br>2. Submit | Relevant results      |
| KB-QUERY-02 | No results query | 1. Query unrelated topic       | Empty or "no results" |
| KB-QUERY-03 | Query empty KB   | 1. Query KB with no docs       | Appropriate message   |

---

## 9. Personas

### 9.1 List Personas 🟠 P1

**Route**: `/personas`

#### Test Cases

| ID              | Test Case          | Steps                    | Expected Result   |
| --------------- | ------------------ | ------------------------ | ----------------- |
| PERSONA-LIST-01 | View list          | 1. Navigate to /personas | List displays     |
| PERSONA-LIST-02 | Filter by category | 1. Select category       | Filters correctly |

---

### 9.2 Persona Operations 🟠 P1

#### Test Cases

| ID         | Test Case       | Steps                           | Expected Result        |
| ---------- | --------------- | ------------------------------- | ---------------------- |
| PERSONA-01 | Create persona  | 1. Click New<br>2. Fill details | Persona created        |
| PERSONA-02 | Edit persona    | 1. Open persona<br>2. Update    | Changes saved          |
| PERSONA-03 | Delete persona  | 1. Delete persona               | Persona removed        |
| PERSONA-04 | Create instance | 1. Create persona instance      | Instance created       |
| PERSONA-05 | View instance   | 1. Open instance view           | Instance details shown |

---

## 10. Connections & OAuth

### 10.1 List Connections 🔴 P0

**Route**: `/connections`

#### Test Cases

| ID           | Test Case        | Steps                       | Expected Result          |
| ------------ | ---------------- | --------------------------- | ------------------------ |
| CONN-LIST-01 | View connections | 1. Navigate to /connections | List of providers        |
| CONN-LIST-02 | View connected   | 1. See connected accounts   | Connected accounts shown |

---

### 10.2 Connect OAuth Provider 🔴 P0

**Test each major provider:**

| Provider  | Test Steps                 | Expected               |
| --------- | -------------------------- | ---------------------- |
| Slack     | Connect, authorize, verify | Connection established |
| Google    | Connect, authorize, verify | Connection established |
| Microsoft | Connect, authorize, verify | Connection established |
| GitHub    | Connect, authorize, verify | Connection established |
| Discord   | Connect, authorize, verify | Connection established |

#### Common Test Cases

| ID            | Test Case        | Steps                                  | Expected Result       |
| ------------- | ---------------- | -------------------------------------- | --------------------- |
| OAUTH-CONN-01 | Connect provider | 1. Click Connect<br>2. Complete OAuth  | Connection saved      |
| OAUTH-CONN-02 | Cancel OAuth     | 1. Click Connect<br>2. Cancel          | Return to connections |
| OAUTH-CONN-03 | Test connection  | 1. Click Test                          | Connection verified   |
| OAUTH-CONN-04 | Disconnect       | 1. Click Disconnect<br>2. Confirm      | Connection removed    |
| OAUTH-CONN-05 | Reconnect        | 1. Disconnect<br>2. Reconnect          | Works properly        |
| OAUTH-CONN-06 | Token refresh    | 1. Connect<br>2. Wait for token expiry | Auto-refreshed        |

---

## 11. Triggers & Webhooks

### 11.1 List Trigger Providers 🟠 P1

#### Test Cases

| ID           | Test Case      | Steps                                | Expected Result   |
| ------------ | -------------- | ------------------------------------ | ----------------- |
| TRIG-LIST-01 | View providers | 1. Open trigger drawer               | List of providers |
| TRIG-LIST-02 | View events    | 1. Select provider<br>2. View events | Events listed     |

---

### 11.2 Configure Triggers 🟠 P1

#### Test Cases

| ID             | Test Case               | Steps                               | Expected Result    |
| -------------- | ----------------------- | ----------------------------------- | ------------------ |
| TRIG-CONFIG-01 | Add trigger to workflow | 1. Add trigger node<br>2. Configure | Trigger configured |
| TRIG-CONFIG-02 | Webhook URL             | 1. View webhook URL                 | URL displayed      |
| TRIG-CONFIG-03 | Test webhook            | 1. Send test payload                | Workflow triggered |

---

## 12. Templates

### 12.1 List Templates 🟠 P1

**Route**: `/templates`

#### Test Cases

| ID          | Test Case          | Steps                     | Expected Result     |
| ----------- | ------------------ | ------------------------- | ------------------- |
| TPL-LIST-01 | View templates     | 1. Navigate to /templates | Templates displayed |
| TPL-LIST-02 | Filter by category | 1. Select category        | Filters correctly   |
| TPL-LIST-03 | Search templates   | 1. Search by name         | Results shown       |

---

### 12.2 Use Template 🔴 P0

#### Test Cases

| ID         | Test Case            | Steps                             | Expected Result        |
| ---------- | -------------------- | --------------------------------- | ---------------------- |
| TPL-USE-01 | Create from template | 1. Click template<br>2. Click Use | Workflow created       |
| TPL-USE-02 | Preview template     | 1. Click preview                  | Template details shown |

---

## 13. Workspace Management

### 13.1 Workspace Settings 🟠 P1

**Route**: `/workspace/settings`

#### Test Cases

| ID        | Test Case   | Steps                    | Expected Result |
| --------- | ----------- | ------------------------ | --------------- |
| WS-SET-01 | Update name | 1. Change workspace name | Name updated    |
| WS-SET-02 | Upload logo | 1. Upload logo image     | Logo displayed  |

---

### 13.2 Member Management 🔴 P0

#### Test Cases

| ID        | Test Case         | Steps                                       | Expected Result      |
| --------- | ----------------- | ------------------------------------------- | -------------------- |
| WS-MEM-01 | Invite member     | 1. Enter email<br>2. Select role<br>3. Send | Invitation sent      |
| WS-MEM-02 | Change role       | 1. Change member role                       | Role updated         |
| WS-MEM-03 | Remove member     | 1. Remove member                            | Member removed       |
| WS-MEM-04 | Accept invitation | 1. Click invitation link                    | Member added         |
| WS-MEM-05 | Revoke invitation | 1. Revoke pending invite                    | Invitation cancelled |

---

### 13.3 Workspace Credits 🟡 P2

#### Test Cases

| ID         | Test Case      | Steps                               | Expected Result |
| ---------- | -------------- | ----------------------------------- | --------------- |
| WS-CRED-01 | View balance   | 1. View credits page                | Balance shown   |
| WS-CRED-02 | View usage     | 1. View usage history               | Usage displayed |
| WS-CRED-03 | Credit warning | 1. Use credits to low<br>2. Observe | Warning shown   |

---

## 14. Analytics

### 14.1 Analytics Dashboard 🟡 P2

**Route**: `/analytics`

#### Test Cases

| ID      | Test Case        | Steps                    | Expected Result     |
| ------- | ---------------- | ------------------------ | ------------------- |
| ANAL-01 | View overview    | 1. Navigate to analytics | Dashboard loads     |
| ANAL-02 | Total executions | 1. View metric           | Correct count       |
| ANAL-03 | Success rate     | 1. View metric           | Accurate percentage |
| ANAL-04 | Date range       | 1. Change date range     | Data updates        |
| ANAL-05 | Daily chart      | 1. View daily trends     | Chart renders       |
| ANAL-06 | Model usage      | 1. View model stats      | Stats shown         |

---

## 15. Settings

### 15.1 Account Settings 🔴 P0

**Route**: `/account`

#### Test Cases

| ID         | Test Case       | Steps                             | Expected Result  |
| ---------- | --------------- | --------------------------------- | ---------------- |
| SET-ACC-01 | Update profile  | 1. Change name<br>2. Save         | Profile updated  |
| SET-ACC-02 | Change email    | 1. Enter new email<br>2. Verify   | Email changed    |
| SET-ACC-03 | Change password | 1. Enter current + new<br>2. Save | Password changed |
| SET-ACC-04 | Delete account  | 1. Request deletion<br>2. Confirm | Account deleted  |

---

### 15.2 Theme Settings 🟡 P2

#### Test Cases

| ID           | Test Case           | Steps                      | Expected Result |
| ------------ | ------------------- | -------------------------- | --------------- |
| SET-THEME-01 | Switch to dark mode | 1. Toggle dark mode        | Theme changes   |
| SET-THEME-02 | Theme persistence   | 1. Set theme<br>2. Refresh | Theme persists  |

---

### 15.3 API Keys 🟠 P1

#### Test Cases

| ID         | Test Case     | Steps                          | Expected Result       |
| ---------- | ------------- | ------------------------------ | --------------------- |
| API-KEY-01 | Create key    | 1. Click Create<br>2. Name key | Key generated         |
| API-KEY-02 | View key once | 1. Create key                  | Key shown once        |
| API-KEY-03 | Revoke key    | 1. Revoke key                  | Key invalidated       |
| API-KEY-04 | Use key       | 1. Make API call with key      | Request authenticated |
| API-KEY-05 | Invalid key   | 1. Use revoked key             | Request rejected      |

---

## 16. Public APIs (v1)

### 16.1 Authentication 🔴 P0

#### Test Cases

| ID         | Test Case       | Steps                     | Expected Result |
| ---------- | --------------- | ------------------------- | --------------- |
| V1-AUTH-01 | Valid API key   | 1. Request with valid key | 200 response    |
| V1-AUTH-02 | Invalid API key | 1. Request with bad key   | 401 response    |
| V1-AUTH-03 | No API key      | 1. Request without key    | 401 response    |
| V1-AUTH-04 | Revoked API key | 1. Use revoked key        | 401 response    |

---

### 16.2 Workflows API 🔴 P0

#### Test Cases

| ID       | Test Case        | Steps                                | Expected Result    |
| -------- | ---------------- | ------------------------------------ | ------------------ |
| V1-WF-01 | List workflows   | `GET /api/v1/workflows`              | Workflows returned |
| V1-WF-02 | Get workflow     | `GET /api/v1/workflows/:id`          | Workflow returned  |
| V1-WF-03 | Create workflow  | `POST /api/v1/workflows`             | Workflow created   |
| V1-WF-04 | Execute workflow | `POST /api/v1/workflows/:id/execute` | Execution started  |
| V1-WF-05 | Delete workflow  | `DELETE /api/v1/workflows/:id`       | Workflow deleted   |

---

### 16.3 Agents API 🔴 P0

#### Test Cases

| ID       | Test Case     | Steps                              | Expected Result   |
| -------- | ------------- | ---------------------------------- | ----------------- |
| V1-AG-01 | List agents   | `GET /api/v1/agents`               | Agents returned   |
| V1-AG-02 | Send message  | `POST /api/v1/agents/:id/messages` | Response received |
| V1-AG-03 | Create thread | `POST /api/v1/threads`             | Thread created    |

---

## 17. Cross-Browser Testing

### Browsers to Test

| Browser | Versions         | Priority |
| ------- | ---------------- | -------- |
| Chrome  | Latest, Latest-1 | 🔴 P0    |
| Firefox | Latest, Latest-1 | 🔴 P0    |
| Safari  | Latest (Mac)     | 🟠 P1    |
| Edge    | Latest           | 🟠 P1    |

### Test Each Browser For

- [ ] Login/logout flow
- [ ] Workflow canvas operations
- [ ] Drag and drop functionality
- [ ] File uploads
- [ ] Real-time updates (WebSocket/SSE)
- [ ] Keyboard shortcuts
- [ ] Copy/paste functionality
- [ ] Local storage persistence
- [ ] CSS rendering

---

## 18. Mobile Responsiveness

### Devices to Test

| Device Type | Screen Size | Priority |
| ----------- | ----------- | -------- |
| Desktop     | 1920x1080   | 🔴 P0    |
| Laptop      | 1366x768    | 🔴 P0    |
| Tablet      | 768x1024    | 🟠 P1    |
| Mobile      | 375x812     | 🟡 P2    |

### Mobile-Specific Tests

- [ ] Sidebar collapses to hamburger menu
- [ ] Touch interactions work
- [ ] Forms are usable on small screens
- [ ] Text is readable without zooming
- [ ] Buttons are tappable size (44x44px min)
- [ ] No horizontal scrolling on mobile

---

## 19. Performance Testing

### Page Load Times

Test load time for:

| Page            | Target | Method           |
| --------------- | ------ | ---------------- |
| Login           | < 2s   | DevTools Network |
| Dashboard       | < 3s   | DevTools Network |
| Workflow list   | < 3s   | DevTools Network |
| Workflow editor | < 4s   | DevTools Network |

### Stress Tests

| Test            | Steps                    | Expected          |
| --------------- | ------------------------ | ----------------- |
| Large workflow  | Create 50+ node workflow | Canvas responsive |
| Many executions | View 100+ executions     | List loads        |
| Rapid clicks    | Click button rapidly     | No crashes        |
| Long session    | Use app for 1+ hour      | No memory leaks   |

---

## Bug Reporting Template

### Bug Report Format

```markdown
## Bug Title

[Clear, concise title describing the issue]

## Environment

- Browser: [Chrome 120.0.6099.109]
- OS: [macOS 14.2]
- Environment: [Production/Staging/Dev]
- Screen size: [1920x1080]

## Steps to Reproduce

1. [First step]
2. [Second step]
3. [Third step]

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Screenshots/Video

[Attach visual evidence]

## Console Errors

[Any errors from browser console]

## Network Errors

[Any failed API calls]

## Severity

- [ ] 🔴 Critical - App crashes/data loss
- [ ] 🟠 High - Feature broken, no workaround
- [ ] 🟡 Medium - Feature broken, has workaround
- [ ] ⚪ Low - Cosmetic issue

## Additional Context

[Any other relevant information]
```

### Example Bug Report

```markdown
## Bug Title

Workflow canvas freezes when adding 20+ nodes

## Environment

- Browser: Chrome 120.0.6099.109
- OS: macOS 14.2
- Environment: Production
- Screen size: 1920x1080

## Steps to Reproduce

1. Create new workflow
2. Rapidly add 20+ LLM nodes from the node library
3. Try to pan or zoom the canvas

## Expected Behavior

Canvas should remain responsive regardless of node count

## Actual Behavior

Canvas becomes unresponsive after ~20 nodes. Cannot pan, zoom, or select nodes. Browser shows "Page Unresponsive" warning.

## Screenshots/Video

[video_canvas_freeze.mp4]

## Console Errors

Warning: Maximum update depth exceeded in ReactFlow

## Network Errors

None

## Severity

- [x] 🔴 Critical - App crashes/data loss

## Additional Context

Workaround: Refresh page. Nodes are saved but positions may be lost.
```

---

## Testing Checklist Summary

### Before Each Testing Session

- [ ] Clear browser cache and cookies
- [ ] Use incognito/private window for fresh state
- [ ] Check you're on the correct environment
- [ ] Have test data ready
- [ ] Open browser DevTools console

### After Finding a Bug

- [ ] Document exact steps to reproduce
- [ ] Take screenshot or video
- [ ] Check console for errors
- [ ] Check network tab for failed requests
- [ ] Verify on multiple browsers if possible
- [ ] File bug report using template

### End of Testing Session

- [ ] Review all bugs filed
- [ ] Verify bugs are reproducible
- [ ] Prioritize critical bugs
- [ ] Update test coverage notes

---

## Quick Reference - Test IDs

| Feature            | Test ID Range                |
| ------------------ | ---------------------------- |
| Registration       | REG-01 to REG-08             |
| Login              | LOGIN-01 to LOGIN-08         |
| Email Verification | VER-01 to VER-05             |
| Password Reset     | PWD-01 to PWD-07             |
| Two-Factor Auth    | 2FA-01 to 2FA-06             |
| OAuth              | OAUTH-01 to OAUTH-05         |
| Dashboard          | HOME-01 to HOME-05           |
| Navigation         | NAV-01 to NAV-05             |
| Workflow List      | WF-LIST-01 to WF-LIST-06     |
| Workflow Create    | WF-CREATE-01 to WF-CREATE-06 |
| Workflow Edit      | WF-EDIT-01 to WF-EDIT-06     |
| Workflow Delete    | WF-DEL-01 to WF-DEL-03       |
| Workflow Execute   | WF-EXEC-01 to WF-EXEC-06     |
| Canvas             | CANVAS-01 to CANVAS-05       |
| Node Operations    | NODE-01 to NODE-07           |
| Connections        | CONN-01 to CONN-06           |
| LLM Node           | LLM-01 to LLM-09             |
| HTTP Node          | HTTP-01 to HTTP-07           |
| Code Node          | CODE-01 to CODE-07           |
| Chat Interfaces    | CHAT-\*                      |
| Form Interfaces    | FORM-\*                      |
| Agents             | AGENT-\*                     |
| Knowledge Bases    | KB-\*                        |
| Personas           | PERSONA-\*                   |
| OAuth Connections  | OAUTH-CONN-\*                |
| Triggers           | TRIG-\*                      |
| Templates          | TPL-\*                       |
| Workspace          | WS-\*                        |
| Analytics          | ANAL-\*                      |
| Settings           | SET-\*                       |
| API v1             | V1-\*                        |

---

## Contact

For questions about this testing guide or to report issues with the guide itself, contact the QA lead or file an issue in the project repository.
