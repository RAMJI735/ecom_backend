const Technician = require("../model/technician/TechnicianModal");
const TaskAssignment = require("../model/technician/TaskAssignmentModal");

// Create a new Technician
exports.createTechnician = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            specialization,
            status,
            avatar,
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Technician name is required",
            });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Technician email is required",
            });
        }

        if (!phone || !phone.trim()) {
            return res.status(400).json({
                success: false,
                message: "Technician phone number is required",
            });
        }

        const existingTech = await Technician.findOne({
            email: email.toLowerCase().trim(),
        });

        if (existingTech) {
            return res.status(400).json({
                success: false,
                message: "A technician with this email address already exists",
            });
        }

        const technician = new Technician({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            specialization: Array.isArray(specialization)
                ? specialization
                : specialization ? [specialization] : ["General Electrical"],
            status: status || "active",
            avatar: avatar || "",
        });

        const savedTechnician = await technician.save();

        return res.status(201).json({
            success: true,
            message: "Technician registered successfully",
            data: savedTechnician,
        });
    } catch (error) {
        console.error("Error creating technician:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create technician",
        });
    }
};

// Get all Technicians (with filtering, search, pagination, and sorting)
exports.getAllTechnicians = async (req, res) => {
    try {
        const {
            status,
            specialization,
            search,
            q,
            keyword,
            page,
            limit,
            all,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;

        const query = {};

        if (status && status !== "all") {
            query.status = status;
        }

        if (specialization && specialization !== "all") {
            query.specialization = { $regex: specialization, $options: "i" };
        }

        const searchTerm = (search || q || keyword || "").trim();
        if (searchTerm) {
            query.$or = [
                { name: { $regex: searchTerm, $options: "i" } },
                { email: { $regex: searchTerm, $options: "i" } },
                { phone: { $regex: searchTerm, $options: "i" } },
                { specialization: { $regex: searchTerm, $options: "i" } },
            ];
        }

        const sortDirection = sortOrder === "asc" || sortOrder === "1" ? 1 : -1;
        const sortOptions = { [sortBy]: sortDirection };

        const total = await Technician.countDocuments(query);
        const isAllRequested = all === "true" || limit === "all" || limit === "0" || limit === 0;

        if (isAllRequested) {
            const technicians = await Technician.find(query).sort(sortOptions);

            res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
            return res.status(200).json({
                success: true,
                count: technicians.length,
                total,
                page: 1,
                limit: technicians.length,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
                data: technicians,
            });
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
        const skip = (pageNum - 1) * limitNum;
        const totalPages = Math.ceil(total / limitNum) || 1;

        const technicians = await Technician.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum);

        res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
        return res.status(200).json({
            success: true,
            count: technicians.length,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
            data: technicians,
        });
    } catch (error) {
        console.error("Error fetching technicians:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch technicians",
        });
    }
};

// Get available (active) technicians for quick dispatch assignment
exports.getAvailableTechnicians = async (req, res) => {
    try {
        const { specialization } = req.query;
        const query = { status: "active" };

        if (specialization) {
            query.specialization = { $regex: specialization, $options: "i" };
        }

        const technicians = await Technician.find(query)
            .select("name phone email specialization status avatar")
            .sort({ name: 1 });

        return res.status(200).json({
            success: true,
            count: technicians.length,
            data: technicians,
        });
    } catch (error) {
        console.error("Error fetching available technicians:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch available technicians",
        });
    }
};

// Get single Technician by ID (with active assigned tasks)
exports.getTechnicianById = async (req, res) => {
    try {
        const { id } = req.params;
        const technician = await Technician.findById(id);

        if (!technician) {
            return res.status(404).json({
                success: false,
                message: "Technician not found",
            });
        }

        const activeTasks = await TaskAssignment.find({
            technician: id,
            status: { $in: ["Assigned", "In Progress"] },
        }).sort({ scheduledDate: 1 });

        res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
        return res.status(200).json({
            success: true,
            data: {
                ...technician.toObject(),
                activeTasks,
            },
        });
    } catch (error) {
        console.error("Error fetching technician:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch technician details",
        });
    }
};

// Update Technician by ID
exports.updateTechnician = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            email,
            phone,
            specialization,
            status,
            avatar,
        } = req.body;

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (phone) updateData.phone = phone.trim();
        if (specialization) {
            updateData.specialization = Array.isArray(specialization)
                ? specialization
                : [specialization];
        }
        if (status) updateData.status = status;
        if (avatar !== undefined) updateData.avatar = avatar;

        if (email) {
            const existing = await Technician.findOne({
                email: email.toLowerCase().trim(),
                _id: { $ne: id },
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: "Email is already taken by another technician",
                });
            }
            updateData.email = email.toLowerCase().trim();
        }

        const updatedTechnician = await Technician.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedTechnician) {
            return res.status(404).json({
                success: false,
                message: "Technician not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Technician updated successfully",
            data: updatedTechnician,
        });
    } catch (error) {
        console.error("Error updating technician:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update technician",
        });
    }
};

// Delete Technician by ID
exports.deleteTechnician = async (req, res) => {
    try {
        const { id } = req.params;
        const technician = await Technician.findByIdAndDelete(id);

        if (!technician) {
            return res.status(404).json({
                success: false,
                message: "Technician not found",
            });
        }

        // Unassign from any pending or assigned tasks
        await TaskAssignment.updateMany(
            { technician: id, status: { $in: ["Pending", "Assigned"] } },
            { $set: { technician: null, status: "Pending", assignedAt: null } }
        );

        return res.status(200).json({
            success: true,
            message: "Technician deleted successfully",
            data: technician,
        });
    } catch (error) {
        console.error("Error deleting technician:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete technician",
        });
    }
};
