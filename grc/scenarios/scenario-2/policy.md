# Employee Offboarding Policy

* **Document Number**: ISMS-POL-08
* **Version**: 2.1
* **Classification**: INTERNAL USE ONLY
* **Effective Date**: January 1, 2026

---

## 1. Executive Summary
When an employee, contractor, or vendor concludes their engagement with HaxNation, it is critical to ensure that all logical and physical access to company resources is terminated promptly. Failure to revoke access exposes the organization to severe insider threats, data exfiltration, and non-compliance with industry regulations (e.g., ISO 27001, SOC 2).

## 2. Scope
This policy applies globally to all HaxNation departments, subsidiaries, and third-party affiliates who have been granted logical access to the corporate network, cloud infrastructure, SaaS applications, or physical facilities.

## 3. Offboarding Process

### 3.1 HR Notification
The Human Resources (HR) department is responsible for formally logging all employee departures (both voluntary and involuntary) into the central HRIS system. This log triggers an automated ticket to the IT Security and Administration teams.

### 3.2 Asset Recovery
Line managers are responsible for ensuring that all physical assets (laptops, mobile devices, security keys, access badges) are returned to the IT department on or before the employee's last day of employment.

## 4. Access Revocation Service Level Agreements (SLA)
Strict timelines must be adhered to for revoking logical access:

- **Standard Termination (Voluntary Resignation)**: All logical access (email, VPN, Active Directory, internal applications, and cloud consoles) must be fully revoked no later than **7 calendar days** from the employee's official last day of employment.
- **Immediate Termination (For Cause)**: Access must be revoked immediately, concurrent with or prior to the termination meeting.

*Note: Access to highly privileged systems (e.g., Domain Admin, Production AWS root accounts) must be revoked on the exact last day, regardless of the 7-day grace period for standard accounts.*

## 5. Auditing and Compliance Monitoring
To ensure SLAs are met and no "ghost accounts" remain on the network:

1. The IT Security department will conduct monthly audits.
2. Audits will cross-reference the HR departure logs with active directory and SSO system accounts.
3. Any accounts found active beyond the 7-day threshold will be immediately suspended and flagged as a high-severity security incident.

## 6. Policy Exceptions
No exceptions are permitted for the termination of access for departing personnel. 

## 7. Enforcement
Failure of IT personnel or automated scripts to revoke access within the specified SLAs will result in a formal incident review and potential disciplinary action against the responsible system administrators.
