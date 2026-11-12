import React from 'react';

export function PasswordStrengthIndicator({ password = '', validity }) {
  const checks = validity || {
    minChar: password.length >= 8,
    number: /\d/.test(password),
    specialChar: /[^A-Za-z0-9]/.test(password),
  };

  return (
    <div className="password-meter text-left mb-4">
      <p className="text-dark">Password must contain:</p>
      <ul className="text-muted">
        <PasswordStrengthIndicatorItem isValid={checks.minChar} text="Have at least 8 characters" />
        <PasswordStrengthIndicatorItem isValid={checks.number} text="Have at least 1 number" />
        <PasswordStrengthIndicatorItem
          isValid={checks.specialChar}
          text="Have at least 1 special character"
        />
      </ul>
    </div>
  );
}

const PasswordStrengthIndicatorItem = ({ isValid, text }) => {
  const highlightClass = isValid ? 'text-green-600' : isValid !== null ? 'text-red-600' : '';
  return <li className={highlightClass}>{text}</li>;
};
