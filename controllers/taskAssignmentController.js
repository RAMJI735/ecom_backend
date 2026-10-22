const TaskAssignment = require("../model/technician/TaskAssignmentModal");
const Technician = require("../model/technician/TechnicianModal");
const Service = require("../model/Service/ServiceModal");

// Create a new Service Request / Task Assignment
exports.createTask = async (req, res) => {
    try {
        const {
            taskName,
            serviceId,
            serviceName,
            customer,
            technicianId,
            priority = "Normal",
            scheduledDate,
            estimatedCost,
            notes,
            assignedBy,
        } = req.body;

        if (!customer || !customer.name || !customer.phone) {
            return res.status(400).json({
                success: false,
                message: "Customer name and phone number are required",
            });
        }

        let resolvedServiceId = null;
        let resolvedServiceName = (serviceName || taskName || "").trim();

        if (serviceId) {
            const serviceDoc = await Service.findById(serviceId);
            if (serviceDoc) {
                resolvedServiceId = serviceDoc._id;
                resolvedServiceName = resolvedServiceName || serviceDoc.serviceName;
            }
        }

        if (!resolvedServiceName) {
            resolvedServiceName = "General Electrical Service";
        }

        let resolvedTechnician = null;
        let initialStatus = "Pending";
        let assignedAt = null;

        if (technicianId) {
            const tech = await Technician.findById(technicianId);
            if (tech) {
                resolvedTechnician = tech._id;
                initialStatus = "Assigned";
                assignedAt = new Date();
            }
        }

        const task = new TaskAssignment({
            service: resolvedServiceId,
            serviceName: resolvedServiceName,
            customer: {
                name: customer.name.trim(),
                phone: customer.phone.trim(),
                email: customer.email ? customer.email.trim() : "",
                address: customer.address ? customer.address.trim() : "",
                city: customer.city ? customer.city.trim() : "",
                pincode: customer.pincode ? customer.pincode.trim() : "",
                user: customer.user || null,
            },
            technician: resolvedTechnician,
            status: initialStatus,
            priority,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
            assignedAt,
            estimatedCost: estimatedCost !== undefined ? Number(estimatedCost) : 0,
            notes: notes || "",
            assignedBy: assignedBy || null,
        });

        const savedTask = await task.save();
        const populatedTask = await TaskAssignment.findById(savedTask._id)
            .populate("technician", "name phone email specialization status avatar")
            .populate("service", "serviceName price category brand");

        return res.status(201).json({
            success: true,
            message: "Service request created successfully",
            data: populatedTask,
        });
    } catch (error) {
        console.error("Error creating task:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create service request",
        });
    }
};

// Get all Tasks (with filtering, search, pagination, and sorting)
exports.getAllTasks = async (req, res) => {
    try {
        const {
            status,
            priority,
            technicianId,
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

        if (priority && priority !== "all") {
            query.priority = priority;
        }

        if (technicianId && technicianId !== "all") {
            query.technician = technicianId;
        }

        const searchTerm = (search || q || keyword || "").trim();
        if (searchTerm) {
            query.$or = [
                { ticketId: { $regex: searchTerm, $options: "i" } },
                { serviceName: { $regex: searchTerm, $options: "i" } },
                { "customer.name": { $regex: searchTerm, $options: "i" } },
                { "customer.phone": { $regex: searchTerm, $options: "i" } },
                { "customer.city": { $regex: searchTerm, $options: "i" } },
            ];
        }

        const sortDirection = sortOrder === "asc" || sortOrder === "1" ? 1 : -1;
        const sortOptions = { [sortBy]: sortDirection };

        const isAllRequested = all === "true" || limit === "all" || limit === "0" || limit === 0;

        if (isAllRequested) {
            const rawTasks = await TaskAssignment.find(query)
                .populate("technician", "name phone email specialization status avatar")
                .populate("service", "serviceName price category brand")
                .sort(sortOptions)
                .lean();

            const tasks = rawTasks.map((t) => {
                t.taskName = t.serviceName;
                t.customerName = t.customer?.name || "";
                t.customerPhone = t.customer?.phone || "";
                return t;
            });

            res.set("Cache-Control", "no-cache, no-store, must-revalidate");
            return res.status(200).json({
                success: true,
                count: tasks.length,
                total: tasks.length,
                page: 1,
                limit: tasks.length,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
                data: tasks,
            });
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
        const skip = (pageNum - 1) * limitNum;

        // Run count and paginated query in parallel
        const [total, rawTasks] = await Promise.all([
            TaskAssignment.countDocuments(query),
            TaskAssignment.find(query)
                .populate("technician", "name phone email specialization status avatar")
                .populate("service", "serviceName price category brand")
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        const tasks = rawTasks.map((t) => {
            t.taskName = t.serviceName;
            t.customerName = t.customer?.name || "";
            t.customerPhone = t.customer?.phone || "";
            return t;
        });

        const totalPages = Math.ceil(total / limitNum) || 1;

        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        return res.status(200).json({
            success: true,
            count: tasks.length,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
            data: tasks,
        });
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch tasks",
        });
    }
};

// Get single Task by ID
exports.getTaskById = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await TaskAssignment.findById(id)
            .populate("technician", "name phone email specialization status avatar")
            .populate("service", "serviceName price category brand model image")
            .lean();

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Service request / task not found",
            });
        }

        task.taskName = task.serviceName;
        task.customerName = task.customer?.name || "";
        task.customerPhone = task.customer?.phone || "";

        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        return res.status(200).json({
            success: true,
            data: task,
        });
    } catch (error) {
        console.error("Error fetching task details:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch task details",
        });
    }
};

// Assign or Reassign Technician to a Task
exports.assignTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { technicianId, notes } = req.body;

        if (!technicianId) {
            return res.status(400).json({
                success: false,
                message: "Technician ID is required for assignment",
            });
        }

        const task = await TaskAssignment.findById(id);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        const newTech = await Technician.findById(technicianId);
        if (!newTech) {
            return res.status(404).json({
                success: false,
                message: "Technician not found",
            });
        }

        task.technician = newTech._id;
        task.status = task.status === "Pending" ? "Assigned" : task.status;
        task.assignedAt = new Date();
        if (notes) {
            task.notes = notes;
        }

        await task.save();

        const populatedTask = await TaskAssignment.findById(task._id)
            .populate("technician", "name phone email specialization status avatar")
            .populate("service", "serviceName price category brand");

        return res.status(200).json({
            success: true,
            message: `Task assigned to ${newTech.name} successfully`,
            data: populatedTask,
        });
    } catch (error) {
        console.error("Error assigning technician:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to assign technician",
        });
    }
};

// Update Task Status (Pending -> Assigned -> In Progress -> Completed / Cancelled)
exports.updateTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, completionNotes, finalCost } = req.body;

        const validStatuses = ["Pending", "Assigned", "In Progress", "Completed", "Cancelled"];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${validStatuses.join(", ")}`,
            });
        }

        const task = await TaskAssignment.findById(id);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        const prevStatus = task.status;
        task.status = status;

        if (status === "In Progress" && !task.startedAt) {
            task.startedAt = new Date();
        }

        if (status === "Completed") {
            task.completedAt = new Date();
            if (completionNotes) task.completionNotes = completionNotes;
            if (finalCost !== undefined) task.finalCost = Number(finalCost);
        }

        await task.save();

        const populatedTask = await TaskAssignment.findById(task._id)
            .populate("technician", "name phone email specialization status avatar")
            .populate("service", "serviceName price category brand");

        return res.status(200).json({
            success: true,
            message: `Task status updated to '${status}' successfully`,
            data: populatedTask,
        });
    } catch (error) {
        console.error("Error updating task status:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update task status",
        });
    }
};

// Update Task general details
exports.updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            taskName,
            serviceName,
            customer,
            priority,
            scheduledDate,
            estimatedCost,
            finalCost,
            paymentStatus,
            notes,
        } = req.body;

        const updateData = {};
        if (serviceName || taskName) updateData.serviceName = (serviceName || taskName).trim();
        if (customer) updateData.customer = customer;
        if (priority) updateData.priority = priority;
        if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
        if (estimatedCost !== undefined) updateData.estimatedCost = Number(estimatedCost);
        if (finalCost !== undefined) updateData.finalCost = Number(finalCost);
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (notes !== undefined) updateData.notes = notes;

        const updatedTask = await TaskAssignment.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate("technician", "name phone email specialization status avatar")
            .populate("service", "serviceName price category brand");

        if (!updatedTask) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Task updated successfully",
            data: updatedTask,
        });
    } catch (error) {
        console.error("Error updating task:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update task",
        });
    }
};

// Delete Task
exports.deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await TaskAssignment.findByIdAndDelete(id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        // If active technician was assigned, decrement active count
        if (task.technician && ["Assigned", "In Progress"].includes(task.status)) {
            await Technician.findByIdAndUpdate(task.technician, {
                $inc: { currentTasksCount: -1 },
            });
        }

        return res.status(200).json({
            success: true,
            message: "Task deleted successfully",
            data: task,
        });
    } catch (error) {
        console.error("Error deleting task:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete task",
        });
    }
};
