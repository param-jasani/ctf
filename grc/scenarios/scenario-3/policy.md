# Data Classification Policy

**Document Number**: ISMS-POL-12
**Version**: 1.0
**Classification**: INTERNAL USE ONLY
**Effective Date**: March 1, 2026

---

## 1. Executive Summary
Information is one of HaxNation's most valuable assets. To ensure appropriate security controls are applied, all corporate data must be classified based on its sensitivity, criticality, and the potential impact if it were compromised.

## 2. Classification Levels

HaxNation uses a four-tier data classification model. All datasets, databases, and document repositories must be assigned one of the following labels:

### 2.1 Public
- **Definition**: Information intended for public distribution or information that would have no adverse impact on HaxNation if freely distributed.
- **Examples**: Marketing materials, press releases, public website content.
- **Security Requirements**: No encryption required. Standard network access controls.

### 2.2 Internal
- **Definition**: Default classification for all corporate data. Information intended for use by HaxNation employees and authorized contractors. Unauthorized disclosure could cause minor operational disruption.
- **Examples**: Internal directories, organizational charts, generic operational metrics.
- **Security Requirements**: Accessible only via authenticated corporate accounts.

### 2.3 Confidential
- **Definition**: Sensitive business information that requires strict access controls. Unauthorized disclosure could cause significant financial loss, legal liability, or damage to corporate reputation.
- **Examples**: Financial records, intellectual property, unreleased product plans, vendor contracts.
- **Security Requirements**: Must be encrypted at rest and in transit. Access granted on a strict need-to-know basis.

### 2.4 Restricted (PII / PCI)
- **Definition**: Highly sensitive data protected by statutory regulations (e.g., GDPR, CCPA, PCI-DSS). This includes Personally Identifiable Information (PII) and Protected Health Information (PHI).
- **Examples**: Customer names, home addresses, Social Security Numbers, credit card data, passwords/hashes.
- **Security Requirements**: Must be encrypted with strong ciphers (AES-256). Multi-factor authentication (MFA) required for access. Strict segregation of duties.

## 3. Handling and Labeling
- Database administrators must tag all production tables with the appropriate classification level.
- Any dataset containing mixed classifications must be labeled at the **highest** level of sensitivity present in the dataset. (e.g., A database containing both Public product data and Restricted customer emails must be classified as Restricted).

## 4. Enforcement
Improper classification of data can lead to inadequate security controls and regulatory fines. Any misclassified datasets discovered during audits must be reported to the Data Protection Officer (DPO) immediately.
