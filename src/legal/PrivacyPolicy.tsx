import React from 'react';
import { LEGAL_VERSIONS } from './legalConfig';

// Simple placeholder Privacy page (中文注释：后续替换为正式隐私政策文本)
export default function PrivacyPolicy() {
  return (
    <div style={wrapper}>
      <h1>Privacy Policy (v{LEGAL_VERSIONS.privacy})</h1>
      <p>Last Updated: {LEGALS.lastUpdated}</p>
      <p>
        This placeholder Privacy Policy explains what data we collect (e.g., email address for authentication),
        how we use it (account creation, sign-in, password reset, verification), and your rights.
      </p>
      <ul>
        <li>Data Collected: Email address during registration.</li>
        <li>Purpose: Authentication, account management, security notifications.</li>
        <li>Third Parties: Firebase Authentication (Google).</li>
        <li>Retention: Kept while the account is active or as required by law.</li>
        <li>Deletion: Contact us to request deletion of your account and related data.</li>
      </ul>
      <p>
        If you do not agree with this Policy, please discontinue use of the Service.
      </p>
      <hr />
      <p style={{ fontSize: 12, color: '#666' }}>
        (Note: Replace with your real policy text and update version when changing.)
      </p>
    </div>
  );
}

const LEGALS = LEGAL_VERSIONS;

const wrapper: React.CSSProperties = {
  maxWidth: 820,
  margin: '40px auto',
  padding: '0 20px',
  lineHeight: 1.6,
  fontFamily: 'Inter, system-ui, sans-serif'
};
