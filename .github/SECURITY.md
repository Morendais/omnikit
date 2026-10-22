# Security Policy

## Security Architecture & Philosophy
OmniKit is architected around **Zero-Knowledge Privacy** and **100% In-Browser Execution**:
- Files, tokens, audio, and documents processed by OmniKit tools **never** leave your machine.
- Zero server-side uploads, zero external telemetry leaks, and zero remote analytics trackers.
- All cryptography uses standard WebCrypto (`crypto.subtle`) APIs.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |

## Reporting a Vulnerability
We take the security and privacy of OmniKit extremely seriously.

If you believe you have discovered a security vulnerability (such as an XSS vulnerability, clipboard leakage, or untrusted input injection):
1. **Do not** disclose the vulnerability publicly in an open GitHub Issue.
2. Please report the issue privately through [GitHub Security Advisory](https://github.com/Morendais/omnikit/security/advisories/new) or by emailing:
   - **security@omnikit.tech**
3. Please include:
   - Tool name or file affected
   - Reproduction steps or proof-of-concept payload
   - Impact assessment
4. We will acknowledge receipt of your report within 24 hours and provide regular updates on remediation and patching.
