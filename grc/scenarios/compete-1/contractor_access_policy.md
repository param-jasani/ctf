# Contractor Access Management Policy

**Document Number**: ISMS-POL-07  
**Version**: 2.1  
**Classification**: INTERNAL USE ONLY  
**Effective Date**: January 15, 2026  
**Last Reviewed**: June 22, 2026  

---

## 1. Purpose

This policy establishes the requirements for managing access rights granted to external contractors, consultants, and temporary personnel who require access to HaxNation's information systems. It ensures that contractor access is granted on a need-to-know basis, monitored continuously, and revoked promptly upon contract termination.

## 2. Scope

This policy applies to all external contractors engaged by any HaxNation department, regardless of contract duration, clearance level, or system access tier.

## 3. Access Lifecycle Management

### 3.1 Access Provisioning

All contractors must be provisioned through the Central IAM system within 48 hours of their contract start date. Access must be scoped to the minimum permissions required for their role.

### 3.2 Access Revocation

Upon contract termination, all VPN and system access must be revoked within **7 business days** of the recorded termination date. The IT Security team is responsible for executing the revocation and logging the action in the access audit trail.

### 3.3 Geographic Restrictions

Contractor VPN access is restricted to connections originating from **approved countries only**, as defined in **Appendix A** of this document. Any connection attempt from a non-approved jurisdiction must be flagged as a security incident and reported to the CISO within 24 hours.

### 3.4 Session Monitoring

All contractor VPN sessions exceeding 120 minutes must be logged with enhanced detail, including full packet headers and system commands executed. Sessions under 120 minutes are subject to standard logging only.

## 4. Clearance Requirements

### 4.1 General Access

All contractors must hold a minimum of Level 1 security clearance to access any HaxNation system.

### 4.2 Financial System Access

Contractors accessing financial management systems (e.g., FIN-ERP, FIN-LEDGER, FIN-AP) must hold a minimum of **Level 2 security clearance**. Access requests for financial systems require additional approval from the Finance department head.

### 4.3 Security System Access

Contractors accessing security infrastructure (e.g., SEC-SIEM, SEC-IDS, SEC-VAULT) must hold a minimum of Level 3 security clearance and must have completed the Advanced Security Awareness Training program.

## 5. Financial Controls

### 5.1 Billing Authorization

All contractor invoices must be pre-approved by the contracting department head before payment processing. Invoices exceeding $10,000 per month require additional CFO sign-off.

### 5.2 Termination Billing

Upon contract termination, the final invoice may include **prorated charges for the calendar month in which termination occurred only**. No invoices may be submitted or processed for any billing period commencing after the recorded contract end date. Prorated amounts must be calculated based on the ratio of active days to total days in the termination month.

### 5.3 Audit Trail

All invoice submissions and payment approvals must be logged in the financial audit trail with timestamps and approver identity.

---

## Appendix A: Approved Countries for Remote VPN Access

The following jurisdictions are approved for contractor VPN connections. Any connection originating from a country not on this list constitutes a policy violation under Section 3.3.

| Region | Approved Countries |
| :--- | :--- |
| North America | United States, Canada |
| Europe | United Kingdom, Germany, France, Netherlands |
| Asia-Pacific | India, Japan, Australia |

---

## Amendment Log

| Date | Section | Change Description | Approved By |
| :--- | :--- | :--- | :--- |
| 2026-01-15 | All | Initial release of Policy v2.0 | M. Hasan (CISO) |
| 2026-03-22 | 3.4 | Added 120-minute enhanced logging threshold | M. Hasan (CISO) |
| 2026-05-28 | 3.2 | Access revocation SLA changed from "48 hours" to "7 business days" to accommodate cross-timezone coordination with offshore contractors | R. Gupta (VP Ops) |
| 2026-06-10 | 4.2 | Minimum clearance for financial system access raised from Level 2 to **Level 3**, effective immediately | S. Patel (CFO) |

---

*End of Document — ISMS-POL-07 v2.1*
