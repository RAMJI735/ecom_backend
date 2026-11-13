const Settings = require("../model/Settings/SettingsModal");
const { CloudinaryDelete, extractPublicId } = require("../utils/cloudinary");

const DEFAULT_BANNERS = [
    {
        title: "Heavy Duty Cables & Modular Gear",
        subtitle: "Up to 35% discount on ISI certified wires and industrial breakers.",
        tag: "HIGH VOLTAGE DEALS",
        buttonText: "EXPLORE WIRE CATALOG  →",
        targetCategory: "wires",
        discountText: "35% OFF",
        image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
        active: true,
        order: 1,
    },
    {
        title: "Modular Switches & Concealed Panels",
        subtitle: "Premium silver-contact switches from Schneider, Legrand & Anchor.",
        tag: "CONTRACTOR FAVORITES",
        buttonText: "VIEW SWITCHES  →",
        targetCategory: "switches",
        discountText: "25% OFF",
        image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
        active: true,
        order: 2,
    },
    {
        title: "Industrial MCBs & Distribution Boards",
        subtitle: "High breaking capacity circuit protection with 5-year warranty.",
        tag: "SAFETY GUARANTEED",
        buttonText: "EXPLORE MCBs  →",
        targetCategory: "mcb",
        discountText: "20% OFF",
        image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
        active: true,
        order: 3,
    },
];

const DEFAULT_ASSURANCES = [
    {
        title: "100% Genuine ISI Mark",
        description: "Direct from authorized brand distributors",
        icon: "check-circle",
        enabled: true,
    },
    {
        title: "Site Delivery Available",
        description: "Bulk dispatch for commercial & residential",
        icon: "truck",
        enabled: true,
    },
    {
        title: "Contractor Wholesale Rates",
        description: "Verified trade pricing on bulk electrical orders",
        icon: "bolt",
        enabled: true,
    },
];

const DEFAULT_TERMS = `# Terms & Conditions

**Last Updated:** November 2026  
**Platform:** Voltline Electrical E-Commerce & On-Site Technician Network

Welcome to **Voltline**. These Terms and Conditions ("Terms") govern your use of the Voltline mobile application, website, and services. By browsing our catalog, booking an installation service, or placing an order, you agree to be bound by these Terms.

---

### 1. General & Account Eligibility
* You must be at least 18 years old or possess legal business authority (e.g. licensed electrical contractor, commercial builder, or registered trade firm) to place orders.
* You are responsible for maintaining the confidentiality of your account credentials, job site delivery addresses, and GSTIN identification.

---

### 2. Products, Certifications & Quality Assurance
* **100% Genuine ISI Mark:** All electrical goods, including wires, heavy-duty armored cables, circuit breakers (MCBs/MCCBs), switchgears, and conduits, are brand new, genuine, and sourced directly from certified manufacturers and authorized brand distributors.
* Product specifications, dimensions, amperages, and voltage ratings are provided based on manufacturer datasheets. Customers are advised to verify site load requirements before placing orders.

---

### 3. Pricing, GST & Billing
* **GST Pricing Transparency:** Prices may be configured as either **GST Inclusive** (tax included in unit price) or **GST Exclusive** (tax calculated and added separately at checkout) according to store financial policy.
* **Official Tax Invoice:** Every completed order generates a full GST-compliant Tax Invoice displaying our official GSTIN, product HSN/SAC codes, and itemized breakdown of CGST, SGST, or IGST.
* Contractors and B2B buyers must provide a valid GSTIN at checkout or in their profile to claim input tax credits.

---

### 4. Site Delivery & Logistics
* **On-Site Dispatch:** Voltline provides direct dispatch to residential premises, commercial job sites, and industrial construction yards.
* **Delivery Fees:** When enabled by store administration, delivery fees apply to orders below the free delivery minimum threshold. Free delivery applies automatically once the minimum order price is reached.
* **Customer Site Unloading:** The buyer or designated site supervisor must ensure safe vehicular access for delivery vehicles and inspect material packages for seal tampering before signing the delivery proof.

---

### 5. Electrical Installation & Technician Services
* **Certified Technicians:** Technician services are performed by vetted, trade-certified electrical professionals.
* **Safe Working Environment:** Customers must ensure mains power can be isolated at the distribution board during wiring or high-voltage work.
* **Scope of Work:** Any additional concealed conduit drilling, structural alterations, or extra cable meters discovered beyond original booking parameters will be quoted and billed as supplemental work.

---

### 6. Returns, Replacements & Cancellations
* **Return Period:** Eligible unopened electrical accessories and standard devices in original factory packaging may be returned within 7 days of delivery.
* **Non-Returnable Items:** Custom-cut cables/wires (measured by the meter), custom switchboard assemblies, chemical joint kits, and materials damaged by incorrect external voltage surges or third-party tampering are strictly non-returnable.
* **Cancellations:** Orders may be cancelled prior to dispatch without penalty. Once a dispatch vehicle is en route or technicians are mobilized, a standard logistics fee may be retained.

---

### 7. Warranty & Manufacturer Support
* Warranty claims on electrical appliances, inverters, and switchgears are backed by original equipment manufacturers (OEM).
* Keep your Voltline GST invoice as official proof of purchase for all warranty claims at authorized service centers.

---

### 8. Limitation of Liability & Safety Disclaimer
* Voltline is not liable for secondary damages, electrical fires, equipment burnouts, or power failures resulting from faulty existing premises wiring, improper contractor handling, lightning surges, or bypass of safety earthing standards.

---

### 9. Governing Law & Dispute Jurisdiction
* These Terms are governed by the laws of India. Any legal dispute or claim arising shall be subject to the exclusive jurisdiction of the competent courts in Kolkata, West Bengal.

---

### 10. Contact Us
For questions regarding these Terms or wholesale contractor agreements:
* **Support Email:** support@voltline.in
* **Hotline:** +91 98765 43210
* **Headquarters:** Sector V, Salt Lake, Kolkata, West Bengal - 700091`;

const DEFAULT_PRIVACY = `# Privacy Policy

**Last Updated:** November 2026  
**Platform:** Voltline Electrical E-Commerce & On-Site Technician Network

At **Voltline**, we respect your privacy and are committed to protecting your personal, contractor, and transaction details. This Privacy Policy outlines our data collection, usage, and protection practices.

---

### 1. Information We Collect
We collect only the information necessary to fulfill your orders, ensure job site deliveries, and dispatch certified electricians:
* **Identity & Contact Details:** Full name, phone number, email address, and contractor business/firm name.
* **Delivery & Job Site Information:** Street address, landmark, city, state, postal code, and optional GPS coordinates for accurate dispatch.
* **Tax Identification:** GSTIN (Goods and Services Tax Identification Number) for issuing tax invoices.
* **Service Notes:** Site access notes, specific delivery instructions, and installation photos uploaded for service scoping.
* **Device & Usage Data:** IP address, operating system, app logs, and session activity to ensure platform security and optimize checkout performance.

---

### 2. How We Use Your Information
* **Order Fulfillment & Logistics:** Delivering electrical supplies and wiring materials directly to your site or warehouse.
* **Technician Allocation:** Sharing relevant site address and task requirements with the assigned technician.
* **Tax Invoicing:** Generating government-compliant GST tax invoices with HSN/SAC breakdowns.
* **Real-time Communication:** Sending SMS, WhatsApp, and email alerts regarding dispatch tracking, invoice download links, and order status updates.
* **Customer Support:** Resolving material inquiries, warranty claims, and contractor trade rate requests.

---

### 3. Payment Processing & Financial Security
* **Zero Card Storage:** Voltline **never** stores your debit/credit card numbers, CVVs, net banking credentials, or UPI PINs on our servers.
* **PCI-DSS Compliance:** All digital transactions are routed through certified, bank-grade encrypted payment gateways utilizing end-to-end TLS 1.3 encryption.
* **Cash On Delivery (COD):** For COD orders, payment is collected directly by our logistics personnel at the job site.

---

### 4. Data Sharing & Third Parties
We do not sell, rent, or trade your personal information. Data is only shared with:
* **Logistics Partners:** Trusted freight and parcel carriers strictly for delivery execution.
* **Field Technicians:** Assigned service contractors to contact you and locate the job site.
* **Legal Compliance:** Statutory and law enforcement authorities when required under Indian legal regulations or tax audits.

---

### 5. Cookies & Local Storage
* Our web platform uses essential session cookies to keep you signed in and maintain your active cart.
* Our mobile app uses secure device storage (AsyncStorage) to cache authentication tokens and offline cart items. You can clear local app data at any time via device settings.

---

### 6. Data Security Measures
* We implement industry-standard administrative, technical, and physical safeguards including SSL/TLS encrypted traffic, bcrypt password hashing, and role-based database access controls.

---

### 7. Your Rights & Control
* **Access & Update:** You can review and edit your profile details, GSTIN, and saved site addresses directly in the app.
* **Account Deletion:** You may request complete deletion of your account and personal data by contacting our privacy team at support@voltline.in.

---

### 8. Policy Updates
* We may revise this Privacy Policy periodically. Significant changes will be announced via our platform banner or direct notification. Continued use of Voltline constitutes acceptance of the revised policy.

---

### 9. Privacy Grievance Officer
If you have any questions, concerns, or grievances regarding our privacy practices:
* **Grievance Officer:** Privacy & Compliance Team
* **Email:** privacy@voltline.in / support@voltline.in
* **Phone:** +91 98765 43210
* **Address:** Voltline Store, Sector V, Salt Lake, Kolkata, West Bengal - 700091, India`;

// Helper to ensure settings document exists
const getOrCreateSettings = async () => {
    let settings = await Settings.findOne();
    if (!settings) {
        settings = new Settings({
            storeName: "VOLTLINE STORE",
            tagline: "Certified Electrical Supplies & Parts",
            supportEmail: "support@voltline.in",
            supportPhone: "+91 98765 43210",
            whatsappNumber: "+91 98765 43210",
            officeAddress: "Sector V, Salt Lake",
            city: "Kolkata",
            state: "West Bengal",
            pincode: "700091",
            gstin: "19AAACV1234F1Z5",
            announcement: {
                text: "⚡ NEXT-DAY DISPATCH • SITE DELIVERY AVAILABLE FOR ALL CONTRACTORS",
                enabled: true,
                type: "live",
            },
            heroBanners: DEFAULT_BANNERS,
            assurances: DEFAULT_ASSURANCES,
            commerce: {
                deliveryCharges: false,
                minPrice: 100,
                delivery_cost: 50,
                freeDeliveryThreshold: 100,
                standardDeliveryFee: 50,
                taxRate: 18,
                gstType: "exclusive",
                currency: "INR",
                currencySymbol: "₹",
            },
            deliveryCharges: false,
            minPrice: 100,
            delivery_cost: 50,
            gstType: "exclusive",
            notifications: {
                emailAlerts: true,
                smsAlerts: true,
            },
            termsAndConditions: {
                title: "Terms & Conditions",
                content: DEFAULT_TERMS,
                lastUpdated: new Date(),
            },
            privacyPolicy: {
                title: "Privacy Policy",
                content: DEFAULT_PRIVACY,
                lastUpdated: new Date(),
            },
        });
        await settings.save();
    } else {
        let needsSave = false;
        if (!settings.termsAndConditions || !settings.termsAndConditions.content) {
            settings.termsAndConditions = {
                title: "Terms & Conditions",
                content: DEFAULT_TERMS,
                lastUpdated: new Date(),
            };
            needsSave = true;
        }
        if (!settings.privacyPolicy || !settings.privacyPolicy.content) {
            settings.privacyPolicy = {
                title: "Privacy Policy",
                content: DEFAULT_PRIVACY,
                lastUpdated: new Date(),
            };
            needsSave = true;
        }
        if (needsSave) {
            await settings.save();
        }
    }
    return settings;
};

// GET /api/settings - Fetch current settings (public)
exports.getSettings = async (req, res) => {
    try {
        const settings = await getOrCreateSettings();
        return res.status(200).json({
            success: true,
            data: settings,
        });
    } catch (error) {
        console.error("Error retrieving settings:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve store settings",
        });
    }
};

// PUT /api/settings - Update general & store settings (admin)
exports.updateSettings = async (req, res) => {
    try {
        let settings = await getOrCreateSettings();

        const {
            storeName,
            tagline,
            supportEmail,
            supportPhone,
            whatsappNumber,
            officeAddress,
            city,
            state,
            pincode,
            gstin,
            announcement,
            commerce,
            notifications,
            heroBanners,
            assurances,
            deliveryCharges,
            minPrice,
            delivery_cost,
            gstType,
            termsAndConditions,
            privacyPolicy,
        } = req.body;

        if (storeName !== undefined) settings.storeName = storeName.trim();
        if (tagline !== undefined) settings.tagline = tagline.trim();
        if (supportEmail !== undefined) settings.supportEmail = supportEmail.trim();
        if (supportPhone !== undefined) settings.supportPhone = supportPhone.trim();
        if (whatsappNumber !== undefined) settings.whatsappNumber = whatsappNumber.trim();
        if (officeAddress !== undefined) settings.officeAddress = officeAddress.trim();
        if (city !== undefined) settings.city = city.trim();
        if (state !== undefined) settings.state = state.trim();
        if (pincode !== undefined) settings.pincode = pincode.trim();
        if (gstin !== undefined) settings.gstin = gstin.trim();

        if (deliveryCharges !== undefined) {
            settings.deliveryCharges = Boolean(deliveryCharges);
            if (!settings.commerce) settings.commerce = {};
            settings.commerce.deliveryCharges = Boolean(deliveryCharges);
        }
        if (minPrice !== undefined) {
            settings.minPrice = Number(minPrice);
            if (!settings.commerce) settings.commerce = {};
            settings.commerce.minPrice = Number(minPrice);
            settings.commerce.freeDeliveryThreshold = Number(minPrice);
        }
        if (delivery_cost !== undefined) {
            settings.delivery_cost = Number(delivery_cost);
            if (!settings.commerce) settings.commerce = {};
            settings.commerce.delivery_cost = Number(delivery_cost);
            settings.commerce.standardDeliveryFee = Number(delivery_cost);
        }
        if (gstType !== undefined) {
            const validGstType = ["exclusive", "inclusive"].includes(gstType) ? gstType : "exclusive";
            settings.gstType = validGstType;
            if (!settings.commerce) settings.commerce = {};
            settings.commerce.gstType = validGstType;
        }

        if (announcement) {
            settings.announcement = {
                text: announcement.text !== undefined ? announcement.text : settings.announcement.text,
                enabled: announcement.enabled !== undefined ? announcement.enabled : settings.announcement.enabled,
                type: announcement.type || settings.announcement.type || "live",
            };
        }

        if (commerce) {
            const dc = commerce.deliveryCharges !== undefined
                ? Boolean(commerce.deliveryCharges)
                : settings.commerce.deliveryCharges;
            const mp = commerce.minPrice !== undefined
                ? Number(commerce.minPrice)
                : (commerce.freeDeliveryThreshold !== undefined ? Number(commerce.freeDeliveryThreshold) : settings.commerce.minPrice);
            const dCost = commerce.delivery_cost !== undefined
                ? Number(commerce.delivery_cost)
                : (commerce.standardDeliveryFee !== undefined ? Number(commerce.standardDeliveryFee) : settings.commerce.delivery_cost);
            const gType = commerce.gstType !== undefined && ["exclusive", "inclusive"].includes(commerce.gstType)
                ? commerce.gstType
                : (settings.commerce.gstType || settings.gstType || "exclusive");

            settings.commerce = {
                deliveryCharges: dc,
                minPrice: mp,
                delivery_cost: dCost,
                freeDeliveryThreshold: mp,
                standardDeliveryFee: dCost,
                gstType: gType,
                taxRate:
                    commerce.taxRate !== undefined
                        ? Number(commerce.taxRate)
                        : settings.commerce.taxRate,
                currency: commerce.currency || settings.commerce.currency,
                currencySymbol: commerce.currencySymbol || settings.commerce.currencySymbol,
            };
            settings.deliveryCharges = dc;
            settings.minPrice = mp;
            settings.delivery_cost = dCost;
            settings.gstType = gType;
        }

        if (notifications) {
            settings.notifications = {
                emailAlerts:
                    notifications.emailAlerts !== undefined
                        ? Boolean(notifications.emailAlerts)
                        : settings.notifications.emailAlerts,
                smsAlerts:
                    notifications.smsAlerts !== undefined
                        ? Boolean(notifications.smsAlerts)
                        : settings.notifications.smsAlerts,
            };
        }

        if (Array.isArray(heroBanners)) {
            settings.heroBanners = heroBanners;
        }

        if (Array.isArray(assurances)) {
            settings.assurances = assurances;
        }

        if (termsAndConditions !== undefined) {
            settings.termsAndConditions = {
                title: typeof termsAndConditions === "object" && termsAndConditions.title ? termsAndConditions.title : "Terms & Conditions",
                content: typeof termsAndConditions === "object" ? (termsAndConditions.content || "") : String(termsAndConditions),
                lastUpdated: new Date(),
            };
        }

        if (privacyPolicy !== undefined) {
            settings.privacyPolicy = {
                title: typeof privacyPolicy === "object" && privacyPolicy.title ? privacyPolicy.title : "Privacy Policy",
                content: typeof privacyPolicy === "object" ? (privacyPolicy.content || "") : String(privacyPolicy),
                lastUpdated: new Date(),
            };
        }

        const saved = await settings.save();

        return res.status(200).json({
            success: true,
            message: "Store settings updated successfully",
            data: saved,
        });
    } catch (error) {
        console.error("Error updating settings:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update store settings",
        });
    }
};

// POST /api/settings/banners - Add a new hero banner
exports.addHeroBanner = async (req, res) => {
    try {
        const settings = await getOrCreateSettings();
        const {
            title,
            subtitle,
            tag,
            buttonText,
            targetCategory,
            image,
            public_id,
            imagePublicId,
            discountText,
            active,
            order,
        } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Banner title is required",
            });
        }

        const resolvedPublicId = public_id || imagePublicId || (image ? extractPublicId(image) : "");

        settings.heroBanners.push({
            title: title.trim(),
            subtitle: subtitle ? subtitle.trim() : "",
            tag: tag ? tag.trim() : "HIGH VOLTAGE DEALS",
            buttonText: buttonText ? buttonText.trim() : "SHOP NOW  →",
            targetCategory: targetCategory ? targetCategory.trim() : "all",
            image: image ? image.trim() : "",
            public_id: resolvedPublicId,
            imagePublicId: resolvedPublicId,
            discountText: discountText ? discountText.trim() : "",
            active: active !== undefined ? Boolean(active) : true,
            order: order !== undefined ? Number(order) : settings.heroBanners.length + 1,
        });

        await settings.save();

        return res.status(201).json({
            success: true,
            message: "Banner added successfully",
            data: settings.heroBanners,
        });
    } catch (error) {
        console.error("Error adding hero banner:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to add hero banner",
        });
    }
};

// PUT /api/settings/banners/:id - Update an existing hero banner
exports.updateHeroBanner = async (req, res) => {
    try {
        const settings = await getOrCreateSettings();
        const bannerId = req.params.id;

        const banner = settings.heroBanners.id(bannerId);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found",
            });
        }

        const {
            title,
            subtitle,
            tag,
            buttonText,
            targetCategory,
            image,
            discountText,
            active,
            order,
        } = req.body;

        if (title !== undefined) banner.title = title.trim();
        if (subtitle !== undefined) banner.subtitle = subtitle.trim();
        if (tag !== undefined) banner.tag = tag.trim();
        if (buttonText !== undefined) banner.buttonText = buttonText.trim();
        if (targetCategory !== undefined) banner.targetCategory = targetCategory.trim();
        if (image !== undefined) {
            banner.image = image.trim();
            const newPid = req.body.public_id || req.body.imagePublicId || extractPublicId(image);
            if (newPid) {
                banner.public_id = newPid;
                banner.imagePublicId = newPid;
            }
        }
        if (req.body.public_id !== undefined || req.body.imagePublicId !== undefined) {
            banner.public_id = req.body.public_id || req.body.imagePublicId;
            banner.imagePublicId = req.body.public_id || req.body.imagePublicId;
        }
        if (discountText !== undefined) banner.discountText = discountText.trim();
        if (active !== undefined) banner.active = Boolean(active);
        if (order !== undefined) banner.order = Number(order);

        await settings.save();

        return res.status(200).json({
            success: true,
            message: "Banner updated successfully",
            data: settings.heroBanners,
        });
    } catch (error) {
        console.error("Error updating hero banner:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update hero banner",
        });
    }
};

// DELETE /api/settings/banners/:id - Remove a hero banner
exports.deleteHeroBanner = async (req, res) => {
    try {
        const settings = await getOrCreateSettings();
        const bannerId = req.params.id;

        const banner = settings.heroBanners.id(bannerId);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found",
            });
        }

        // Delete associated image from Cloudinary
        const publicIdToDelete = banner.public_id || banner.imagePublicId || extractPublicId(banner.image);
        if (publicIdToDelete) {
            await CloudinaryDelete(publicIdToDelete);
        }

        banner.deleteOne();
        await settings.save();

        return res.status(200).json({
            success: true,
            message: "Banner and associated image deleted successfully",
            data: settings.heroBanners,
        });
    } catch (error) {
        console.error("Error deleting hero banner:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete hero banner",
        });
    }
};

const wrapAsync = require("../utils/wrapAsync");

exports.getSettings = wrapAsync(exports.getSettings);
exports.updateSettings = wrapAsync(exports.updateSettings);
exports.addHeroBanner = wrapAsync(exports.addHeroBanner);
exports.updateHeroBanner = wrapAsync(exports.updateHeroBanner);
exports.deleteHeroBanner = wrapAsync(exports.deleteHeroBanner);

