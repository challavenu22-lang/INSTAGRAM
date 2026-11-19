import React from 'react';
import { Link } from 'react-router-dom';

export const TermsOfService = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 theme-text-primary">
      <Link to="/" className="text-blue-400 hover:underline">
        ← Back to Home
      </Link>

      <div className="glass-panel rounded-2xl p-6 sm:p-10 mt-6 space-y-5">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-sm theme-text-secondary">
          Last updated: November 19, 2026
        </p>

        <section>
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p className="mt-2">
            By using this website, you agree to follow these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Permitted Use</h2>
          <p className="mt-2">
            Use this service only for lawful purposes and only download
            content you own or have permission to use.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. User Responsibility</h2>
          <p className="mt-2">
            You are responsible for respecting copyright laws and the
            applicable platform rules when using downloaded content.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Disclaimer</h2>
          <p className="mt-2">
            This service is provided as available. It is an independent
            service and is not affiliated with or endorsed by Instagram or Meta.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Contact</h2>
          <p className="mt-2">
            Email: challavenu22@gmail.com
          </p>
        </section>
      </div>
    </div>
  );
};
