import { Link } from 'react-router';
import { ButtonLink } from '@/components/ui';
import { Bullets, SiteArticle, SitePage } from './SitePage';

// Public "About us" (Vinay 29 Oct: starter text until bhaiya gives the final words). No income promise.

export default function About() {
  return (
    <SitePage title="About us">
      <SiteArticle title="About Treeway" lead="The power of nature, in a simple app for every family.">
        <section>
          <h2>Who we are</h2>
          <p>
            Treeway brings natural Ayurvedic wellness to people across India. In one easy app, our members
            shop health products, ask a doctor for free, watch short videos every day and build their own
            team.
          </p>
        </section>
        <section>
          <h2>What we believe</h2>
          <Bullets>
            <li>Health from nature: products and advice rooted in Ayurveda.</li>
            <li>Simple for everyone: easy English, works on any phone.</li>
            <li>Honest money: every rupee is in your wallet history, and you withdraw to your own bank.</li>
            <li>Your data is yours: we keep it safe and never sell it.</li>
          </Bullets>
        </section>
        <section>
          <h2>What members get</h2>
          <Bullets>
            <li>An Ayurvedic shop with home delivery.</li>
            <li>Free advice and a prescription from an Ayurvedic doctor.</li>
            <li>A small reward for watching the daily videos.</li>
            <li>Income from the team they build, as per the plan.</li>
            <li>Help from our team through the app.</li>
          </Bullets>
        </section>
        <section>
          <h2>Talk to us</h2>
          <p>
            Have a question? <Link to="/contact">Send us a message</Link> and our team will call you back.
          </p>
        </section>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/register">Create a free account</ButtonLink>
          <ButtonLink to="/login" variant="ghost">
            Log in
          </ButtonLink>
        </div>
      </SiteArticle>
    </SitePage>
  );
}
