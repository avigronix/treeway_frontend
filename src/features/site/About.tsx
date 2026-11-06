import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { ButtonLink } from '@/components/ui';
import { SitePage } from './SitePage';
import { IconCard, JoinBand, SectionTitle, SiteHero, Tagline } from './SiteParts';
import { SiteIcon } from './siteIcons';
import { PromiseSection, VisionMissionSection } from './VisionMission';

// Public "About us": bhaiya's words (Vinay 6 Nov), in order: who we are, vision and mission, about our company,
// what guides us, our promise. No income promise.

const VALUES = ['Quality', 'Honesty', 'Transparency', 'Customer satisfaction'];

export default function About() {
  // /about#vision-mission (and the old /vision-mission link) opens at the vision and mission.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView?.();
  }, [hash]);
  return (
    <SitePage title="About us">
      <SiteHero
        eyebrow="About Treeway"
        title="About Treeway"
        lead="More than a brand: a new step towards a better lifestyle, positive thinking and self-reliance."
      >
        <ButtonLink to="/about#vision-mission" variant="light" className="tab:w-auto tab:px-6">
          Our vision and mission
        </ButtonLink>
        <ButtonLink to="/become-a-distributor" variant="outline-white" className="tab:w-auto tab:px-6">
          Become a distributor
        </ButtonLink>
      </SiteHero>

      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 tab:grid-cols-[1.1fr_1fr] tab:items-start tab:py-16">
        <div className="flex flex-col gap-4">
          <SectionTitle kicker="Who we are" title="More than just a brand" />
          <p className="m-0 text-[15.5px] leading-relaxed">
            Treeway is more than just a brand; it is a new initiative towards a better lifestyle, positive
            thinking, and self-reliance. Our aim is to bring positive changes to people's lives through
            nature-inspired products, traditional wisdom, and modern innovation.
          </p>
          <p className="m-0 text-[15.5px] leading-relaxed">
            Treeway's identity goes beyond its products. It represents our values, ethics, trust, and the way
            we conduct our business. We give priority to quality, honesty, transparency, and customer
            satisfaction.
          </p>
        </div>
        <div className="flex flex-col gap-4 rounded-3xl bg-gt p-6 text-[#D6E8D0] tab:p-8">
          <span className="text-sun">{SiteIcon.leaf}</span>
          <p className="m-0 text-[15.5px] leading-relaxed">
            We believe that a strong brand is one that builds lasting relationships based on trust,
            reliability, and a sense of belonging with its customers and business associates.
          </p>
          <p className="m-0 text-[15.5px] leading-relaxed">
            With this vision, Treeway aims to create a community where everyone gets an opportunity to grow,
            learn, develop their potential, and establish their own identity.
          </p>
          <ul aria-label="Our priorities" className="m-0 flex list-none flex-wrap gap-2 p-0 pt-1">
            {VALUES.map((v) => (
              <li
                key={v}
                className="rounded-full border border-sun/50 px-3 py-1 text-[13px] font-semibold text-sun"
              >
                {v}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <VisionMissionSection />

      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 tab:py-16">
          <SectionTitle
            kicker="About our company"
            title="Quality products, real opportunities"
            lead="Treeway is an emerging business organization committed to delivering high-quality products at reasonable prices and providing better business and self-employment opportunities through Direct Selling."
          />
          <div className="grid gap-5 text-[15px] leading-relaxed tab:grid-cols-2">
            <p className="m-0">
              Our business model is based on product quality, customer satisfaction, and the collective growth
              of our business partners. We believe that every individual associated with Treeway should have
              an opportunity to grow through dedication, hard work, and entrepreneurial skills.
            </p>
            <p className="m-0">
              The core objective of Treeway is to develop a structured and transparent business system where
              eligible associates involved in product marketing and distribution have opportunities to earn
              benefits according to the company's defined business plan.
            </p>
            <p className="m-0">
              We believe that the true success of any company is measured not only by its business growth but
              also by the progress, satisfaction, and trust of the people associated with it.
            </p>
            <p className="m-0">
              Treeway is committed to developing the business capabilities of its partners by providing
              appropriate training, guidance, and necessary support to help them achieve their business goals.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 tab:py-16">
        <SectionTitle
          kicker="Our foundation"
          title="What guides us"
          lead="Inspired by nature, guided by traditional values, driven by a modern business approach, and built on honesty and integrity, these principles form the foundation of Treeway."
        />
        <ul className="m-0 grid list-none gap-4 p-0 tab:grid-cols-2 desk:grid-cols-4">
          <IconCard icon={SiteIcon.leaf} title="Inspired by nature">
            Products that bring the goodness of nature into everyday life.
          </IconCard>
          <IconCard icon={SiteIcon.book} title="Traditional values" tone="gold">
            The wisdom of tradition, respected in everything we make and do.
          </IconCard>
          <IconCard icon={SiteIcon.growth} title="Modern approach">
            A modern, structured and transparent way of doing business.
          </IconCard>
          <IconCard icon={SiteIcon.shield} title="Honesty and integrity" tone="gold">
            Trust is earned: we keep our word with customers and partners.
          </IconCard>
        </ul>
        <p className="m-0 rounded-2xl border-l-4 border-gold bg-white p-5 text-[15.5px] leading-relaxed">
          Our vision is to build a strong, transparent, and extensive business network through which quality
          products reach more and more people while creating meaningful opportunities for individuals to
          become self-reliant.
        </p>
      </section>

      <PromiseSection />

      <JoinBand title="Grow with Treeway" text="Create your free account, or ask us anything first." />
      <Tagline>Treeway – The Power of Nature, The Power of Growth.</Tagline>
    </SitePage>
  );
}
