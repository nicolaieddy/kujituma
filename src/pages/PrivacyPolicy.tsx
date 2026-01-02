import { LegalPageLayout } from "@/components/layout/LegalPageLayout";

const PrivacyPolicy = () => {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="January 2, 2026">
      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
        <p className="text-foreground/80 leading-relaxed">
          Welcome to Kujituma ("we," "our," or "us"). We are committed to protecting your personal 
          information and your right to privacy. This Privacy Policy explains how we collect, use, 
          disclose, and safeguard your information when you use our goal-tracking and accountability 
          platform.
        </p>
        <p className="text-foreground/80 leading-relaxed mt-4">
          Please read this privacy policy carefully. If you do not agree with the terms of this 
          privacy policy, please do not access the application.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
        
        <h3 className="text-xl font-medium text-foreground mb-3">2.1 Personal Information</h3>
        <p className="text-foreground/80 leading-relaxed mb-3">
          We collect personal information that you voluntarily provide when you:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-foreground/80">
          <li>Register for an account using Google OAuth</li>
          <li>Complete your profile (name, date of birth, location)</li>
          <li>Add social media links to your profile</li>
          <li>Upload a profile photo or cover image</li>
        </ul>

        <h3 className="text-xl font-medium text-foreground mb-3 mt-6">2.2 Usage Data</h3>
        <p className="text-foreground/80 leading-relaxed mb-3">
          We automatically collect certain information when you use our service:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-foreground/80">
          <li>Goals, habits, and objectives you create</li>
          <li>Daily check-ins and weekly planning sessions</li>
          <li>Posts, comments, and reactions in the community feed</li>
          <li>Accountability partnerships and friend connections</li>
          <li>Session analytics (time spent, engagement metrics)</li>
        </ul>

        <h3 className="text-xl font-medium text-foreground mb-3 mt-6">2.3 Authentication Data</h3>
        <p className="text-foreground/80 leading-relaxed">
          When you sign in using Google OAuth, we receive your Google account email address, 
          name, and profile picture. We do not have access to your Google password.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
        <p className="text-foreground/80 leading-relaxed mb-3">
          We use the information we collect to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-foreground/80">
          <li>Provide and maintain our goal-tracking service</li>
          <li>Enable accountability features with partners and friends</li>
          <li>Display your progress in the community feed (based on your privacy settings)</li>
          <li>Send notifications about activity related to your account</li>
          <li>Improve and personalize your experience</li>
          <li>Generate analytics and insights about your goal progress</li>
          <li>Respond to your inquiries and provide support</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">4. How We Share Your Information</h2>
        
        <h3 className="text-xl font-medium text-foreground mb-3">4.1 With Other Users</h3>
        <p className="text-foreground/80 leading-relaxed">
          Based on your privacy settings, certain information may be visible to other users:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-foreground/80 mt-3">
          <li>Your profile information (name, avatar, about me)</li>
          <li>Your weekly progress posts in the community feed</li>
          <li>Goals shared with accountability partners</li>
          <li>Comments and reactions you make on others' posts</li>
        </ul>

        <h3 className="text-xl font-medium text-foreground mb-3 mt-6">4.2 With Service Providers</h3>
        <p className="text-foreground/80 leading-relaxed">
          We use third-party services to operate our platform:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-foreground/80 mt-3">
          <li><strong>Supabase:</strong> Database hosting and authentication</li>
          <li><strong>Google:</strong> OAuth authentication provider</li>
        </ul>
        <p className="text-foreground/80 leading-relaxed mt-3">
          These providers have access to your data only to perform tasks on our behalf and are 
          obligated to protect your information.
        </p>

        <h3 className="text-xl font-medium text-foreground mb-3 mt-6">4.3 Legal Requirements</h3>
        <p className="text-foreground/80 leading-relaxed">
          We may disclose your information where required by law, governmental request, or when 
          we believe disclosure is necessary to protect our rights or the safety of others.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">5. Data Retention</h2>
        <p className="text-foreground/80 leading-relaxed">
          We retain your personal information for as long as your account is active or as needed 
          to provide you services. You can delete your account at any time through your profile 
          settings, which will permanently remove all your data from our systems.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">6. Your Privacy Rights</h2>
        <p className="text-foreground/80 leading-relaxed mb-3">
          Depending on your location, you may have the following rights regarding your personal data:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-foreground/80">
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Correction:</strong> Update or correct inaccurate information</li>
          <li><strong>Deletion:</strong> Delete your account and all associated data</li>
          <li><strong>Portability:</strong> Request your data in a portable format</li>
          <li><strong>Objection:</strong> Object to certain processing of your data</li>
        </ul>
        <p className="text-foreground/80 leading-relaxed mt-4">
          To exercise any of these rights, you can use the account management features in your 
          profile settings or contact us directly.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">7. GDPR Compliance (EU Users)</h2>
        <p className="text-foreground/80 leading-relaxed">
          If you are located in the European Economic Area (EEA), you have additional rights under 
          the General Data Protection Regulation (GDPR). We process your data based on your consent 
          (which you provide when creating an account) and our legitimate interest in providing the 
          service. You have the right to withdraw consent at any time by deleting your account.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">8. Data Security</h2>
        <p className="text-foreground/80 leading-relaxed">
          We implement appropriate technical and organizational security measures to protect your 
          personal information. This includes encryption of data in transit and at rest, secure 
          authentication protocols, and regular security assessments. However, no method of 
          transmission over the Internet is 100% secure.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">9. Children's Privacy</h2>
        <p className="text-foreground/80 leading-relaxed">
          Our service is not directed to individuals under the age of 13. We do not knowingly 
          collect personal information from children under 13. If you become aware that a child 
          has provided us with personal data, please contact us.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">10. Cookies and Tracking</h2>
        <p className="text-foreground/80 leading-relaxed">
          We use essential cookies and local storage to maintain your session and preferences. 
          We do not use third-party tracking cookies for advertising purposes. Session analytics 
          are used solely to improve the service.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">11. Changes to This Policy</h2>
        <p className="text-foreground/80 leading-relaxed">
          We may update this privacy policy from time to time. We will notify you of any changes 
          by posting the new policy on this page and updating the "Last updated" date. We encourage 
          you to review this policy periodically.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">12. Contact Us</h2>
        <p className="text-foreground/80 leading-relaxed">
          If you have questions or concerns about this privacy policy or our data practices, 
          please contact us at:
        </p>
        <p className="text-foreground/80 leading-relaxed mt-3">
          <strong>Email:</strong> privacy@kujituma.com
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
