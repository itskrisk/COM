import { AgreementDocument, AgreementType, UserRoleType } from '../types/agreements';

/**
 * Standard legal documents for Muncheez.
 * Structured for review by Kenyan legal counsel.
 *
 * Current Version: 1.0.0
 * Last Updated: 2026-01-01
 */

export const AGREEMENT_REGISTRY: Record<AgreementType, AgreementDocument> = {
    customer_tos: {
        id: 'customer_tos',
        role: 'customer',
        title: 'Customer Terms of Service',
        subtitle: 'Consumer Ordering, Payment & Delivery Contract',
        version: '1.0.0',
        lastUpdated: '01.01.2026',
        documentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        fullDocumentPath: '/terms?doc=customer',
        summaryPoints: [
            'Governs food, grocery, and pharmacy orders placed on Muncheez in Kenya.',
            'M-Pesa Express and wallet transactions are processed in Kenya Shillings (KES).',
            'Order cancellations are full-refund eligible only prior to merchant kitchen preparation.',
            'Requires zero-tolerance conduct towards delivery riders and merchant staff.'
        ],
        sections: [
            {
                id: 'scope',
                title: '1. Scope of Agreement & Platform Intermediary',
                body: 'These Terms of Service govern your access to and use of the Muncheez consumer platform operated by Muncheez Technologies Ltd. Muncheez provides high-technology logistics dispatch connecting consumers with independent third-party food, supermarket, and pharmacy vendors ("Merchants") and independent logistics providers ("Riders").'
            },
            {
                id: 'eligibility',
                title: '2. User Eligibility & Account Integrity',
                body: 'You must be at least 18 years old and legally competent to enter into binding agreements in the Republic of Kenya. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities conducted under your registered phone number.'
            },
            {
                id: 'pricing_payment',
                title: '3. Pricing, Taxes & M-Pesa Checkout',
                body: 'All prices are quoted in Kenya Shillings (KES) and reflect merchant list pricing plus applicable Value Added Tax (VAT). Delivery charges are calculated dynamically based on transit distance. Payments are completed via Safaricom M-Pesa STK Push or authorized in-app wallet balance.'
            },
            {
                id: 'fulfillment',
                title: '4. Order Dispatch & Perishable Deliveries',
                body: 'Estimated preparation and transit times are provided as operational estimates based on live traffic in Nairobi. The customer agrees to provide an accurate delivery address and be available to receive goods upon arrival. Perishable goods not collected within reasonable waiting windows may be charged in full.'
            },
            {
                id: 'cancellations_refunds',
                title: '5. Cancellation, Quality Disputes & Refunds',
                body: 'Orders may be cancelled with a full refund only before merchant acceptance. If an order arrives damaged, missing items, or substantially substandard, the user must file an issue via the order screen within 15 minutes of receipt for inspection and wallet compensation.'
            },
            {
                id: 'data_processing',
                title: '6. Personal Data & Operational Sharing',
                body: 'Your personal data is processed strictly in accordance with our Privacy Policy and the Kenya Data Protection Act, 2019. Operational dispatch necessitates sharing your first name, phone number, and drop-off coordinates with the designated merchant and rider for order fulfillment.'
            },
            {
                id: 'conduct',
                title: '7. Customer Conduct & Safety Standard',
                body: 'Muncheez enforces a strict zero-tolerance policy against harassment, abuse, or discrimination towards dispatch couriers or merchant personnel. Violations will result in immediate service suspension.'
            },
            {
                id: 'liability',
                title: '8. Limitation of Liability',
                body: 'To the maximum extent permissible under Kenyan law, Muncheez shall not be held liable for indirect, incidental, or consequential damages resulting from merchant food preparation or unforeseen logistics delays.'
            },
            {
                id: 'amendments',
                title: '9. Agreement Modifications',
                body: 'Muncheez may amend these Terms of Service. When material revisions occur, users will be presented with the updated terms version for review and acceptance prior to continuing platform usage.'
            },
            {
                id: 'governing_law',
                title: '10. Governing Law & Dispute Resolution',
                body: 'These Terms are governed by and construed in accordance with the laws of the Republic of Kenya. Disputes shall be resolved through good-faith mediation failing which jurisdiction resides with the competent courts of Nairobi, Kenya.'
            }
        ]
    },

    merchant_sla: {
        id: 'merchant_sla',
        role: 'merchant',
        title: 'Merchant Marketplace Agreement & Vendor SLA',
        subtitle: 'Commercial Vendor Terms, Service Level Standards & Payout Schedule',
        version: '1.0.0',
        lastUpdated: '01.01.2026',
        documentHash: 'fa485e94bbf3b4c92c2865d1d6e1b6f0e34c9c693a7c36a4f94a8bc3d6790a18',
        fullDocumentPath: '/terms?doc=merchant',
        summaryPoints: [
            'Governs commercial listing of food, grocery, and retail products on Muncheez.',
            'Standard 15% platform commission structure on completed orders.',
            'Mandates food safety, product freshness, and public health hygiene compliance.',
            'Strictly prohibits off-platform marketing or independent spamming of customer phone numbers.'
        ],
        sections: [
            {
                id: 'appointment',
                title: '1. Marketplace Listing & Vendor Scope',
                body: 'This Merchant Marketplace Agreement governs the terms under which the vendor ("Merchant") lists and sells menu items, supermarket goods, or retail products through the Muncheez digital marketplace in Kenya. Muncheez acts as an electronic commerce technology and dispatch facilitator.'
            },
            {
                id: 'commission',
                title: '2. Commission Rate & Fee Structure',
                body: 'Muncheez deducts an agreed platform commission of 15% (fifteen percent) on the gross subtotal of all successfully delivered items, excluding delivery logistics fees and applicable statutory taxes. Commission rates are subject to mutual commercial review upon 30 days notice.'
            },
            {
                id: 'payouts',
                title: '3. Payout Settlement & Reconciliation',
                body: 'Merchant net earnings (gross item sales less platform commission and refunds) are reconciled daily and disbursed to the merchant registered M-Pesa Buy Goods Till, Paybill, or designated Kenyan bank account according to the agreed payout cycle.'
            },
            {
                id: 'food_safety',
                title: '4. Food Safety, Quality & Hygiene Obligations',
                body: 'The Merchant represents and warrants that all food and consumable items listed are prepared under strict hygienic standards in full compliance with the Public Health Act (Cap 242) and Food, Drugs and Chemical Substances Act (Cap 254). The Merchant assumes full legal liability for food contamination or expired goods.'
            },
            {
                id: 'sla_prep',
                title: '5. Preparation Times & Order Acceptance SLA',
                body: 'Merchants commit to maintaining an order acceptance response time within 3 minutes and adhering to stated kitchen preparation windows. Habitual order rejections or extended preparation delays may impact search placement or store active status.'
            },
            {
                id: 'customer_data',
                title: '6. Customer Data Confidentiality & Non-Misuse',
                body: 'In accordance with the Kenya Data Protection Act 2019, any customer phone numbers or delivery details provided to the merchant are strictly confidential and shared solely for the purpose of executing the immediate order. Direct marketing, unconsented SMS campaigns, or storage of customer details outside Muncheez is strictly forbidden.'
            },
            {
                id: 'inventory_pricing',
                title: '7. Menu Accuracy & Price Parity',
                body: 'Merchants are responsible for maintaining accurate product listings, stock availability, and allergen notifications. Prices listed on the platform must not exceed standard in-store walk-in prices.'
            },
            {
                id: 'cancellations_chargebacks',
                title: '8. Order Errors & Merchant Chargebacks',
                body: 'Where a verified customer complaint reveals missing, expired, or incorrect products due to merchant preparation error, the cost of the refunded item shall be charged back to the merchant account.'
            },
            {
                id: 'suspension',
                title: '9. Account Suspension & Termination',
                body: 'Muncheez reserves the right to suspend or deactivate a merchant store for repeated hygiene complaints, fraudulent order manipulation, or non-compliance with these terms upon written notice.'
            },
            {
                id: 'disputes',
                title: '10. Governing Law & Arbitral Venue',
                body: 'This commercial agreement is governed by the laws of Kenya. Any unresolved dispute shall be referred to arbitration in Nairobi under the Nairobi Centre for International Arbitration (NCIA) Rules.'
            }
        ]
    },

    courier_agreement: {
        id: 'courier_agreement',
        role: 'courier',
        title: 'Independent Courier & Logistics Services Agreement',
        subtitle: 'Contract for Services, Transit Standards & Independent Contractor Terms',
        version: '1.0.0',
        lastUpdated: '01.01.2026',
        documentHash: '9a8d29b11ef5f3c9e6d0137a28e833b7b252dfac1e7b458896173a118e9508bc',
        fullDocumentPath: '/terms?doc=courier',
        summaryPoints: [
            'Contract for Services: Couriers are independent contractors, not employees of Muncheez.',
            'Freedom of schedule: Couriers determine their own active hours and order acceptances.',
            'Requires valid Kenyan driving license, NTSA-compliant motorcycle, and commercial insurance.',
            'Includes explicit consent for continuous background GPS tracking during active delivery shifts.'
        ],
        sections: [
            {
                id: 'status',
                title: '1. Independent Contractor Status (Contract for Services)',
                body: 'The Courier enters into this Agreement as an independent contractor providing logistics fulfillment services on an on-demand basis. Nothing in this Agreement creates an employment relationship, partnership, or joint venture between Muncheez and the Courier under the Employment Act, 2007 of Kenya.'
            },
            {
                id: 'autonomy',
                title: '2. Operational Autonomy & Schedule Flexibility',
                body: 'The Courier has complete discretion to choose when to go online, when to log off, and whether to accept or decline any offered delivery dispatch. The Courier is free to provide services on other platforms or engage in independent enterprise.'
            },
            {
                id: 'equipment',
                title: '3. Equipment, Licenses & Statutory Road Compliance',
                body: 'The Courier is solely responsible for providing and maintaining their own vehicle (motorcycle or bicycle), smartphone, and safety gear. Couriers operating motorized vehicles warrant possession of a valid National Transport and Safety Authority (NTSA) driving license, helmet, and active third-party insurance.'
            },
            {
                id: 'gps_consent',
                title: '4. Live GPS Geolocation Tracking Consent',
                body: 'In accordance with the Kenya Data Protection Act 2019, the Courier explicitly consents to continuous real-time GPS location tracking while logged into the Muncheez Courier App in an "Online" or "On Delivery" status. Geolocation data is used solely for order dispatch, customer tracking, and transit verification.'
            },
            {
                id: 'payouts',
                title: '5. Delivery Earnings & Instant Payouts',
                body: 'Delivery compensation is calculated based on base fare, distance traveled, and applicable surge factors. Earned delivery fees are credited to the Courier wallet and are redeemable via Safaricom M-Pesa according to standard payout protocols.'
            },
            {
                id: 'tax_statutory',
                title: '6. Individual Tax & Statutory Obligations',
                body: 'As an independent contractor, the Courier is solely responsible for declaring their income and fulfilling all applicable tax liabilities under the Kenya Revenue Authority (KRA iTax), as well as voluntary health and social security contributions (SHIF/NSSF).'
            },
            {
                id: 'goods_care',
                title: '7. Care of Goods in Transit',
                body: 'The Courier agrees to handle all meals, fresh produce, and packages with care, maintaining temperature integrity through proper delivery bag closure and securing packages against spillage, theft, or contamination.'
            },
            {
                id: 'safety_conduct',
                title: '8. Professional Conduct & Customer Protection',
                body: 'Couriers must maintain professional, respectful behavior with customers and merchant staff. Intoxication while on delivery, reckless driving, or unauthorized disclosure of customer contact details is grounds for immediate contract termination.'
            },
            {
                id: 'termination',
                title: '9. Deactivation & Term of Agreement',
                body: 'Either party may terminate this Agreement at any time by providing written notice or by ceasing platform use. Muncheez reserves the right to deactivate platform access for verified safety violations or vehicle inspection failures.'
            },
            {
                id: 'jurisdiction',
                title: '10. Governing Law',
                body: 'This Agreement is governed by the laws of the Republic of Kenya. Any contractual dispute shall be subject to amicable settlement discussions prior to formal legal redress in Nairobi, Kenya.'
            }
        ]
    }
};

/**
 * Helper to retrieve the applicable agreement for a user's role.
 */
export function getAgreementForRole(role: string): AgreementDocument {
    switch (role?.toLowerCase()) {
        case 'merchant':
            return AGREEMENT_REGISTRY.merchant_sla;
        case 'courier':
        case 'rider':
            return AGREEMENT_REGISTRY.courier_agreement;
        case 'customer':
        default:
            return AGREEMENT_REGISTRY.customer_tos;
    }
}
