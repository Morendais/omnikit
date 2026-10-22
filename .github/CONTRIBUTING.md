# Contributing to OmniKit Tools

Thank you for your interest in contributing to **OmniKit Tools**! We welcome contributions from developers worldwide to build the fastest, most private suite of client-side web utilities.

---

## 🛡️ Core Architectural Principles

Before writing code, please keep our core non-negotiable architectural requirements in mind:

1. **100% Client-Side Processing (Zero-Knowledge Privacy):**
   - User data, images, PDFs, tokens, or text must **never** be transmitted to an external server or API.
   - All processing occurs locally in the user's browser sandbox using standard Web APIs, WebAssembly, or Web Workers.
2. **Zero External Dependencies / Zero CDN CDNs at Runtime:**
   - Tools must function fully offline without fetching external network resources.
3. **Vanilla JS & Maximum Portability:**
   - Modules are designed to run cleanly in both modern browser environments and Node.js (`test.js`).

---

## 🚀 Getting Started

1. **Fork and Clone the Repository:**
   ```bash
   git clone https://github.com/Morendais/omnikit.git
   cd omnikit
   ```

2. **Install Dependencies (Dev Only):**
   ```bash
   npm install
   ```

3. **Run the Test Suite:**
   ```bash
   npm test
   ```
   All tests should pass with 100% success.

---

## 🛠️ Adding or Enhancing a Tool

1. **Tool File Placement:**
   - Each tool resides inside `tools/<tool-name>.js`.
   - Tool objects follow the singleton or utility module pattern with standard exported functions.

2. **CommonJS & Browser Dual-Support:**
   - Ensure your tool file includes the dual-export guard at the bottom:
     ```javascript
     if (typeof module !== 'undefined' && module.exports) {
       module.exports = MyTool;
     }
     if (typeof window !== 'undefined') {
       window.MyTool = MyTool;
     }
     ```

3. **Export in `index.js`:**
   - Add your module export to `index.js`.

4. **Write Tests in `test.js`:**
   - Add automated verification assertions in `test.js` to ensure the tool initializes and executes predictably.

---

## 🧪 Testing Checklist

Before opening a pull request, ensure:
- [ ] `node -c tools/<file>.js` passes with zero syntax errors.
- [ ] `npm test` passes completely.
- [ ] No remote network calls (`fetch`, `XMLHttpRequest`, external `script` injection) are added.
- [ ] No secrets, API keys, or credentials are introduced.

---

## 🤝 Submitting a Pull Request (PR)

1. Create a feature branch:
   ```bash
   git checkout -b feat/my-new-tool
   ```
2. Commit your changes with a clear, conventional commit message:
   ```bash
   git commit -m "feat(tools): add new JSON schema validator"
   ```
3. Push to your fork:
   ```bash
   git push origin feat/my-new-tool
   ```
4. Open a Pull Request against `main`. Automated GitHub Actions (Node.js CI and CodeQL) will automatically validate your PR.

---

## 🔒 Reporting Security Vulnerabilities

Please do **not** report security vulnerabilities via public GitHub issues. See our [Security Policy](SECURITY.md) or report privately via GitHub Security Advisories.
