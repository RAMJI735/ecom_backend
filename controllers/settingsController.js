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
                currency: "INR",
                currencySymbol: "₹",
            },
            deliveryCharges: false,
            minPrice: 100,
            delivery_cost: 50,
            notifications: {
                emailAlerts: true,
                smsAlerts: true,
            },
        });
        await settings.save();
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

            settings.commerce = {
                deliveryCharges: dc,
                minPrice: mp,
                delivery_cost: dCost,
                freeDeliveryThreshold: mp,
                standardDeliveryFee: dCost,
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

