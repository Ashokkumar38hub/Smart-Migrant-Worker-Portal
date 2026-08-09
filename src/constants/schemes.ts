export interface Scheme {
    id: string;
    name: string;
    category: string;
    description: string;
    benefits: string[];
    eligibility: string;
    link: string;
    howToApply: string[];
    videoUrl?: string;
}

export const WORKER_SCHEMES: Scheme[] = [
    {
        id: "eshram",
        name: "eShram Portal",
        category: "Registration & Identity",
        description: "A national database of unorganized workers to facilitate social security benefits.",
        benefits: [
            "Accidental insurance cover (PMSBY) of ₹2 Lakh",
            "One-stop solution for all social security benefits",
            "Portability of benefits across the country"
        ],
        eligibility: "Any unorganized worker aged between 16-59 years.",
        link: "https://eshram.gov.in/",
        howToApply: [
            "Visit the official eShram portal.",
            "Click on 'Register on eShram' button.",
            "Enter your Aadhaar-linked mobile number and captcha.",
            "Complete the form with personal, address, and bank details.",
            "Download your UAN card once submitted."
        ],
        videoUrl: "https://www.youtube.com/watch?v=DXCvghL_SmA"
    },
    {
        id: "onorc",
        name: "One Nation One Ration Card (ONORC)",
        category: "Food Security",
        description: "Allows migrant workers to access subsidized food grains from any Fair Price Shop across India.",
        benefits: [
            "Access to subsidized rations anywhere in India",
            "Portability of PDS benefits",
            "Family remains able to claim their share at home"
        ],
        eligibility: "NFSA / State Ration Card holders.",
        link: "https://impds.nic.in/portal",
        howToApply: [
            "Ensure you have an active NFSA or State Ration Card.",
            "Visit any Fair Price Shop (FPS) at your current location.",
            "Provide your Aadhaar number or Ration Card for biometric authentication.",
            "Receive your entitlement as per official rates.",
            "Use the 'Mera Ration' app to find nearby shops."
        ],
        videoUrl: "https://www.youtube.com/watch?v=ujkScOWFTgk"
    },
    {
        id: "abpmjay",
        name: "Ayushman Bharat (PM-JAY)",
        category: "Healthcare",
        description: "The world's largest health insurance/assurance scheme fully financed by the government.",
        benefits: [
            "Health cover of ₹5 Lakh per family per year",
            "Cashless access to health care services",
            "Covers up to 3 days of pre-hospitalization and 15 days post-hospitalization"
        ],
        eligibility: "Based on SECC database found in rural and urban areas.",
        link: "https://pmjay.gov.in/",
        howToApply: [
            "Check eligibility on the PM-JAY website or 'Am I Eligible' portal.",
            "Identify the nearest empanelled hospital (public or private).",
            "Carry your Aadhaar card or Ration card to the hospital.",
            "Contact the 'Pradhan Mantri Arogya Mitra' at the help desk.",
            "Receive cashless treatment for covered procedures."
        ],
        videoUrl: "https://www.youtube.com/watch?v=U3u7QHvsDf0"
    },
    {
        id: "pmsym",
        name: "PM Shram Yogi Maan-dhan (PM-SYM)",
        category: "Pension",
        description: "A voluntary and contributory pension scheme for unorganized workers.",
        benefits: [
            "Assured monthly pension of ₹3,000 after age 60",
            "Matching contribution by Central Government",
            "Family pension in case of death"
        ],
        eligibility: "Unorganized workers aged 18-40 with monthly income <= ₹15,000.",
        link: "https://maandhan.in/",
        howToApply: [
            "Visit the nearest Common Service Centre (CSC).",
            "Carry your Aadhaar card and Savings Bank account details.",
            "Pay the first contribution in cash at the CSC.",
            "The CSC will issue a Shram Yogi Card for reference.",
            "Monthly contributions will be auto-debited thereafter."
        ],
        videoUrl: "https://www.youtube.com/watch?v=Yf6yZomB__w"
    },
    {
        id: "arhc",
        name: "Affordable Rental Housing Complexes (ARHCs)",
        category: "Housing",
        description: "Provides dignified living to urban migrants/poor near their workplaces.",
        benefits: [
            "Affordable rental housing in urban areas",
            "Dignified living environment",
            "Proximity to workplace reducing commute time"
        ],
        eligibility: "Urban migrants / Poor people working in the city.",
        link: "https://arhc.mohua.gov.in/",
        howToApply: [
            "Check for ARHC projects on the MoHUA portal or local government sites.",
            "Contact the local Urban Local Body (ULB) or developer.",
            "Submit proof of identity and employment in the city.",
            "Complete the rental agreement as per local guidelines.",
            "Pay the subsidized rent as agreed."
        ],
        videoUrl: "https://www.youtube.com/watch?v=izvLnNl96eU"
    }
];
