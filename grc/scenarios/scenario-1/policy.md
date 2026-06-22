# IT Access Control Policy

* **Document Number**: ISMS-POL-04
* **Version**: 1.2
* **Classification**: INTERNAL USE ONLY
* **Effective Date**: January 1, 2026
* **Last Review Date**: June 1, 2026

---

## 1. Executive Summary and Purpose
The purpose of this policy is to establish the rules for the granting, modification, and revocation of logical access to HaxNation IT systems, networks, and confidential data. Unauthorized access to information systems can lead to data breaches, operational downtime, and severe regulatory penalties. This policy dictates the mandatory access lifecycle to prevent such incidents.

## 2. Scope and Applicability
This policy applies to:
- All permanent employees, contractors, consultants, and temporary workers at HaxNation.
- All systems, applications, network devices, and data repositories owned, managed, or leased by HaxNation.
- Any third-party vendors requiring access to internal systems via VPN or federated authentication.

## 3. General Access Principles
Access to HaxNation systems is governed by the following core principles:

1. **Principle of Least Privilege (PoLP)**: Access shall be granted only to the specific resources necessary for an individual to perform their authorized job duties.
2. **Need-to-Know**: Data access must be restricted based on a legitimate business requirement.
3. **Segregation of Duties (SoD)**: Duties and areas of responsibility must be separated to reduce opportunities for unauthorized modification or misuse of information. No single individual should have end-to-end control over a critical process.
4. **Default Deny**: All systems and networks must be configured to deny access by default. Explicit authorization is required for any access grant.

## 4. User Access Management Lifecycle

### 4.1 Provisioning (Onboarding)
- New users will be granted access upon receipt of a formalized Access Request Form (ARF) submitted through the ITSM portal.
- The request must detail the exact systems, roles, and justification required.
- Approval from both the direct line manager and the system owner is required before IT Support can provision the account.

### 4.2 Access Modification
- When an employee changes roles or departments, their access must be immediately re-evaluated.
- Any access no longer required for the new role must be revoked within 24 hours of the role change.
- Additional access requires a new ARF to be submitted and approved.

### 4.3 Periodic Access Review
- Access rights to all highly critical systems (e.g., Financial databases, Customer PII repositories, Source Code control) must be reviewed on a quarterly basis.
- Standard systems must be reviewed at least annually.
- System owners must certify that the list of active users is accurate and necessary.

### 4.4 Revocation (Offboarding)
- Upon termination of employment (voluntary or involuntary), HR must notify IT Support immediately.
- Standard terminations require all logical access to be revoked within 7 calendar days.
- Terminations for cause require immediate suspension of all accounts concurrent with the termination meeting.

## 5. Roles and Responsibilities
The policy currently lacks explicit definitions of who is responsible for each step of the access lifecycle. A formal RACI matrix must be established and appended to this policy before the next audit cycle. Until then, ad-hoc approvals will continue to be processed by the IT Service Desk.

## 6. Exceptions
Any exceptions to this policy must be documented in writing, accompanied by a risk assessment, and formally approved by the Chief Information Security Officer (CISO). Exceptions are valid for a maximum of six (6) months.

## 7. Enforcement
Violations of this policy may result in disciplinary action up to and including termination of employment or legal action. The Information Security team reserves the right to suspend any account suspected of policy violation without prior notice.

---
*End of Policy Document*
