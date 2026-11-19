import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Database, UserCheck, Trash2, Mail, ExternalLink, ArrowLeft } from 'lucide-react';

export const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 theme-text-primary">
      {/* Back to Home Button */}
      <Link
        to="/home"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium glass-panel border hover:bg-slate-800/60 transition-all duration-200 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="glass-panel p-6 sm:p-10 rounded-2xl border shadow-xl space-y-8">
        <div className="border-b border-slate-700/60 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Privacy Policy</h1>
          </div>
          <p className="text-sm theme-text-secondary">
            Last Updated & Effective Date: November 19, 2026
          </p>
        </div>

        {/* 1. Overview & Google User Data */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-blue-400">
            <UserCheck className="w-5 h-5" />
            1. Google Account Data Collection & Exact Purpose
          </h2>
          <p className="text-sm leading-relaxed theme-text-secondary">
            When you sign in using <strong className="text-white">Google Sign-In</strong>, we request basic OAuth 2.0 profile scopes (<code className="text-blue-300">openid</code>, <code className="text-blue-300">profile</code>, <code className="text-blue-300">email</code>). We receive and process:
          </p>
          <ul className="list-disc pl-6 text-sm space-y-1 theme-text-secondary">
            <li><strong className="text-white">Google Account ID (UID):</strong> Used to uniquely identify your session.</li>
            <li><strong className="text-white">Email Address:</strong> Used for account identification and communication regarding support or data requests.</li>
            <li><strong className="text-white">Full Name and Profile Picture URL:</strong> Displayed within the application header to personalize your session interface.</li>
          </ul>
          <p className="text-sm leading-relaxed theme-text-secondary">
            In <strong>Guest Mode</strong> (without signing in), we do not request, access, or store any Google account or personal data.
          </p>
        </section>

        {/* 2. Storage & Third-Party Service Providers */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-blue-400">
            <Database className="w-5 h-5" />
            2. Where Data Is Stored & Service Providers (Firebase)
          </h2>
          <p className="text-sm leading-relaxed theme-text-secondary">
            Your data is stored and processed exclusively using <strong className="text-white">Google Cloud & Google Firebase</strong>:
          </p>
          <ul className="list-disc pl-6 text-sm space-y-1 theme-text-secondary">
            <li><strong>Firebase Authentication:</strong> Securely manages login tokens and authentication states.</li>
            <li><strong>Firebase Cloud Firestore:</strong> If you use the download feature while authenticated, your download history records (post URL, media preview link, file type, and timestamp) are saved to your private Firestore collection.</li>
            <li><strong>Hosting:</strong> The web application front-end is hosted on Vercel Inc.</li>
          </ul>
          <p className="text-sm leading-relaxed theme-text-secondary">
            We do <strong>not</strong> sell, rent, or lease your Google user data or download records to any third party, broker, or advertising network. Data is only processed to provide the core services of this application.
          </p>
        </section>

        {/* 3. Security & Google API Services User Data Policy */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-blue-400">
            <Lock className="w-5 h-5" />
            3. Data Protection & Limited Use Compliance
          </h2>
          <p className="text-sm leading-relaxed theme-text-secondary">
            Our use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline inline-flex items-center gap-1">Google API Services User Data Policy <ExternalLink className="w-3.5 h-3.5" /></a>, including the Limited Use requirements.
          </p>
          <p className="text-sm leading-relaxed theme-text-secondary">
            All data transmitted between your browser and our services is encrypted in transit using industry-standard TLS 1.3 cryptographic protocols. Stored data is protected with AES-256 encryption at rest by Google Firebase.
          </p>
        </section>

        {/* 4. Retention & Account/Data Deletion */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-blue-400">
            <Trash2 className="w-5 h-5" />
            4. Data Retention & How to Request Deletion
          </h2>
          <p className="text-sm leading-relaxed theme-text-secondary">
            <strong>Retention Period:</strong> We retain your Google account profile information and download history only for as long as your account is active.
          </p>
          <p className="text-sm leading-relaxed theme-text-secondary">
            <strong>User Control & Deletion:</strong>
          </p>
          <ul className="list-disc pl-6 text-sm space-y-1 theme-text-secondary">
            <li><strong>In-App History Deletion:</strong> You can delete any download record or clear your entire download history at any time from the app's History page.</li>
            <li><strong>Account & Cloud Data Deletion:</strong> You can request permanent deletion of your account and all associated Firestore records by emailing us at <a href="mailto:challavenu22@gmail.com" className="text-blue-400 underline">challavenu22@gmail.com</a>. Requests are processed within 14 business days.</li>
            <li><strong>Revoke Google Access:</strong> You can revoke this application's access to your Google Account at any time through <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline inline-flex items-center gap-1">Google Security Permissions <ExternalLink className="w-3.5 h-3.5" /></a>.</li>
          </ul>
        </section>

        {/* 5. Contact Information */}
        <section className="space-y-3 border-t border-slate-700/60 pt-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-blue-400">
            <Mail className="w-5 h-5" />
            5. Contact Us
          </h2>
          <p className="text-sm leading-relaxed theme-text-secondary">
            If you have questions, privacy concerns, or data deletion requests regarding this policy, please contact:
          </p>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 text-sm space-y-1">
            <p><strong className="text-white">Developer / Data Controller:</strong> Video Downloader Team</p>
            <p><strong className="text-white">Email:</strong> <a href="mailto:challavenu22@gmail.com" className="text-blue-400 underline">challavenu22@gmail.com</a></p>
          </div>
        </section>
      </div>
    </div>
  );
};
