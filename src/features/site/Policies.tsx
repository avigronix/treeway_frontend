import { Link } from 'react-router';
import { SitePage } from './SitePage';
import { Checks, PolicyCard, SiteHero, Tagline } from './SiteParts';
import { SiteIcon } from './siteIcons';

// Public "Shipping policy" and "Refund, return and replacement policy": bhaiya's words (Vinay 6 Nov). One line is
// added to the refund policy so it matches the app (Vinay 6 Nov): an order can be cancelled before it is packed.
const POLICY_UPDATED = '6 November 2026';

function Updated() {
  return <p className="m-0 text-[13px] text-mut">Last updated: {POLICY_UPDATED}</p>;
}

export function ShippingPolicy() {
  return (
    <SitePage title="Shipping policy">
      <SiteHero
        eyebrow="Shipping policy"
        title="Delivered safely, across India"
        lead="At Treeway, we are committed to delivering our products safely and efficiently to our customers and business partners across India."
      />
      <div className="mx-auto grid max-w-4xl gap-4 px-4 py-10 tab:py-14">
        <ul className="m-0 grid list-none gap-3 p-0 tab:grid-cols-3">
          {[
            [SiteIcon.truck, 'Across India', 'Where our courier partners deliver'],
            [SiteIcon.clock, '1–4 business days', 'To process and dispatch'],
            [SiteIcon.box, 'Tracking shared', 'By mobile, email or the app'],
          ].map(([i, t, d]) => (
            <li key={String(t)} className="flex items-center gap-3 rounded-2xl bg-gt p-4 text-[#D6E8D0]">
              <span className="grid size-11 flex-none place-items-center rounded-xl bg-white/10 text-sun">
                {i}
              </span>
              <span className="flex flex-col">
                <b className="text-white">{t}</b>
                <span className="text-[13px]">{d}</span>
              </span>
            </li>
          ))}
        </ul>
        <Updated />
        <PolicyCard n={1} title="Delivery locations">
          <p>
            Treeway aims to provide delivery services across India, subject to the availability and
            serviceability of locations covered by our logistics partners. Certain PIN codes may be
            non-serviceable depending on courier availability.
          </p>
        </PolicyCard>
        <PolicyCard n={2} title="Shipping and courier charges">
          <p>
            Courier and shipping charges will be applicable on every product order. These charges will be
            borne by the customer or business partner placing the order.
          </p>
          <p>
            The applicable courier charges will be calculated based on the delivery PIN code, shipment weight,
            package dimensions, and courier service availability.
          </p>
          <p>
            The final shipping charges will be displayed or communicated at the time of placing the order.
          </p>
        </PolicyCard>
        <PolicyCard n={3} title="Order processing and dispatch">
          <p>
            Orders are generally processed and dispatched within 1–4 business days, excluding Sundays and
            public holidays, subject to product availability and payment confirmation.
          </p>
          <p>
            In certain cases, dispatch may take additional time due to product availability or other
            operational reasons.
          </p>
        </PolicyCard>
        <PolicyCard n={4} title="Delivery time">
          <p>
            After dispatch, estimated delivery time may vary depending on the delivery location, PIN code,
            courier partner, and other logistical factors.
          </p>
          <p>Treeway will make every reasonable effort to ensure timely delivery of all orders.</p>
        </PolicyCard>
        <PolicyCard n={5} title="Order tracking">
          <p>
            Once an order is dispatched, tracking details will be shared with the customer or business partner
            through the registered contact number, email, or available order tracking facility.
          </p>
        </PolicyCard>
        <PolicyCard n={6} title="Delivery delays">
          <p>
            Although Treeway strives to deliver every order within the estimated time, delays may occur due to
            weather conditions, transportation issues, public holidays, operational challenges, or
            circumstances beyond our control.
          </p>
        </PolicyCard>
        <PolicyCard n={7} title="Incorrect address and non-serviceable PIN codes">
          <p>
            Customers are responsible for providing accurate delivery addresses, PIN codes, and contact
            details while placing an order. Treeway will not be responsible for delays or failed deliveries
            caused by incorrect or incomplete address information.
          </p>
          <p>
            If a PIN code is found to be non-serviceable, the customer may be contacted to arrange an
            alternative delivery option, wherever possible.
          </p>
        </PolicyCard>
        <p className="m-0 text-[14px] text-mut">
          Returns and refunds: see our{' '}
          <Link to="/refund-policy" className="font-semibold text-g">
            Refund, return and replacement policy
          </Link>
          .
        </p>
      </div>
      <Tagline>Treeway – The Power of Nature, The Promise of Trust.</Tagline>
    </SitePage>
  );
}

export function RefundPolicy() {
  return (
    <SitePage title="Refund policy">
      <SiteHero
        eyebrow="Refund, return and replacement policy"
        title="Fair and transparent, every time"
        lead="Treeway is committed to providing quality products and a satisfactory shopping experience to all its customers and business partners. We follow a transparent product return and replacement policy to ensure fairness and customer trust."
      />
      <div className="mx-auto grid max-w-4xl gap-4 px-4 py-10 tab:py-14">
        <Updated />
        <PolicyCard n={1} title="Refund policy">
          <p>
            Treeway follows a No Refund Policy for general purchases. Once an order has been successfully
            processed and the product has been purchased, cancellation or refund requests due to a change of
            mind, personal preference, or incorrect product selection will not be accepted.
          </p>
          <p className="rounded-xl bg-okbg p-3 text-ok">
            You can cancel an order yourself in the app before it is packed: the amount goes back to your
            wallet at once. After the order is packed, it cannot be cancelled.
          </p>
          <p>
            However, this policy shall not affect any refund rights available to customers under applicable
            laws.
          </p>
        </PolicyCard>
        <PolicyCard n={2} title="Return policy">
          <p>
            Products once sold will generally not be eligible for return or exchange due to a change of mind
            or personal preference.
          </p>
          <p>
            Returns may be considered in cases involving defective, damaged, expired, incorrect, or materially
            different products, in accordance with applicable laws and company procedures.
          </p>
        </PolicyCard>
        <PolicyCard n={3} title="Damaged or defective products">
          <p>
            If a customer receives a damaged, defective, expired, or incorrect product, they should notify
            Treeway Customer Support <b>within 48 hours of delivery</b>.
          </p>
          <p>The customer should provide:</p>
          <Checks
            items={[
              'Original purchase invoice.',
              'Order details.',
              'Clear photographs or video evidence of the issue.',
              'Product packaging, wherever available.',
            ]}
          />
          <p>
            After verification, Treeway will arrange an appropriate resolution, which may include replacement,
            refund, or another remedy as required by applicable law.
          </p>
        </PolicyCard>
        <PolicyCard n={4} title="Product eligibility">
          <p>
            Where a return or replacement is approved, the product should preferably be accompanied by its
            original packaging, invoice, batch details, and other relevant information.
          </p>
          <p>
            Products showing damage due to misuse, improper storage, or unauthorized handling may not qualify
            for a voluntary replacement, subject to applicable consumer rights.
          </p>
        </PolicyCard>
        <PolicyCard n={5} title="Shipping and courier charges">
          <p>Shipping and courier charges paid at the time of ordering are generally non-refundable.</p>
          <p>
            However, where a return, replacement, or refund is required due to Treeway's error or applicable
            consumer protection requirements, the company will handle the matter in accordance with applicable
            laws.
          </p>
        </PolicyCard>
        <PolicyCard n={6} title="Refund processing">
          <p>
            Where a refund is approved, it will be processed through the original payment method or another
            mutually accepted method, subject to applicable rules.
          </p>
          <p>The processing time will generally be 7–10 business days after approval.</p>
        </PolicyCard>
        <PolicyCard n={7} title="Business partner policy">
          <p>
            All registered business partners must follow Treeway's product return, replacement, and refund
            procedures.
          </p>
          <p>
            Any applicable adjustment to a business partner's account, incentives, or product-related benefits
            will be handled according to the company's approved business policies and applicable laws.
          </p>
        </PolicyCard>
        <PolicyCard n={8} title="Policy amendments">
          <p>
            Treeway reserves the right to update or modify this policy whenever necessary. Any changes will be
            published on the official website and will be applicable as per the effective date and applicable
            legal requirements.
          </p>
        </PolicyCard>
        <PolicyCard n={9} title="Customer support">
          <p>
            For any questions or assistance regarding refunds, returns, or replacements, customers may contact
            Treeway through the official customer support channels mentioned on the company website, or{' '}
            <Link to="/contact" className="font-semibold text-g">
              send us a message
            </Link>
            .
          </p>
        </PolicyCard>
      </div>
      <Tagline>TREEWAY – The Power of Nature, The Promise of Trust.</Tagline>
    </SitePage>
  );
}
