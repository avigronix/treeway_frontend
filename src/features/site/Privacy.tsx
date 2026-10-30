import { Link } from 'react-router';
import { useCompany } from '@/features/auth/usePublic';
import { Bullets, SiteArticle, SitePage } from './SitePage';

// Public "Privacy policy" (Vinay 29 Oct: starter text until bhaiya / a lawyer gives the final words). It lists only
// what the app really collects and does. Update the date when the text changes.
const PRIVACY_UPDATED = '30 October 2026';

export default function Privacy() {
  const company = useCompany().data;
  const name = company?.name || 'Treeway';

  return (
    <SitePage title="Privacy policy">
      <SiteArticle title="Privacy policy" lead={`How ${name} collects, uses and protects your information.`}>
        <p className="text-[13px] text-mut">Last updated: {PRIVACY_UPDATED}</p>
        <section>
          <h2>What we collect</h2>
          <Bullets>
            <li>Account: your name, mobile number, email, state and district, and your sponsor’s ID.</li>
            <li>
              For payments and withdrawals: UTR numbers and payment screenshots you upload, PAN, and bank or
              UPI details.
            </li>
            <li>For doctor advice: the problem you write, your age and any report files you upload.</li>
            <li>For complaints: your messages and files.</li>
            <li>Usage: the videos you watch, to run the daily video reward.</li>
          </Bullets>
        </section>
        <section>
          <h2>How we use it</h2>
          <Bullets>
            <li>To run your account, wallets, team and income as per the plan.</li>
            <li>To check payments, pay withdrawals to your own bank and keep tax records.</li>
            <li>To let a doctor answer your health question.</li>
            <li>To send you OTPs and important account messages by email.</li>
            <li>To stop fraud and keep accounts safe.</li>
          </Bullets>
        </section>
        <section>
          <h2>Who can see it</h2>
          <Bullets>
            <li>
              Your sponsor and upline see only your name, ID, join date and status, not your money or bank
              details.
            </li>
            <li>
              Your health files are seen only by the doctor who answers you and by our admin team when needed.
            </li>
            <li>
              Our admin team sees what it needs to check payments, pay withdrawals and solve complaints.
            </li>
            <li>
              We never sell your information. We share it with government bodies only when the law asks.
            </li>
          </Bullets>
        </section>
        <section>
          <h2>How we protect it</h2>
          <Bullets>
            <li>Passwords are stored in a scrambled (hashed) form; we never see them.</li>
            <li>An email OTP is needed for withdrawals, transfers and bank changes.</li>
            <li>Uploaded files are private and open only after login, for the right people.</li>
            <li>The website uses a secure (HTTPS) connection.</li>
          </Bullets>
        </section>
        <section>
          <h2>Your choices</h2>
          <Bullets>
            <li>You can see and update your profile and bank details in the app (with an OTP).</li>
            <li>To correct something you cannot change, or to close your account, contact us.</li>
            <li>Money records are kept as the law requires, even after an account is closed.</li>
          </Bullets>
        </section>
        <section>
          <h2>Contact</h2>
          <p>
            Questions about this policy?{' '}
            {company?.email ? (
              <>
                Email <a href={`mailto:${company.email}`}>{company.email}</a> or{' '}
              </>
            ) : null}
            <Link to="/contact">send us a message</Link>.
          </p>
        </section>
      </SiteArticle>
    </SitePage>
  );
}
