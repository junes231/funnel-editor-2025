import React from 'react';
import { LEGAL_VERSIONS } from './legalConfig';

// Simple placeholder Terms page (中文注释：后续把正式英文条款正文粘贴到此处)
export default function TermsOfService() {
  return (
    <div style={wrapper}>
      <h1>Terms of Service (v{LEGAL_VERSIONS.tos})</h1>
      <p>Last Updated: {LEGALS.lastUpdated}</p>
      <p>
        This is a placeholder Terms of Service. Replace this text with your actual legal
        content describing permitted use, restrictions, disclaimers, limitation of liability,
        governing law, termination, and contact information.
      </p>
      <p>
        By using the Service you acknowledge that you have read, understood, and agree to be bound by these Terms.
      </p>
      <hr />
      <p style={{ fontSize: 12, color: '#666' }}>
        (Note: When you update these Terms, bump the version in legalConfig.ts and keep an archived copy.)
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
