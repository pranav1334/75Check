import express from "express";
import { body, validationResult } from "express-validator";
import pool from "../config/db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

const calculateAttendance = (attended, total) => {
  if (total === 0) return 0;
  return Number(((attended / total) * 100).toFixed(2));
};

const calculateCanMiss = (attended, total, required) => {
  if (total === 0 || attended === 0) return 0;

  const maxTotalAllowed = Math.floor((attended * 100) / required);
  const canMiss = maxTotalAllowed - total;

  return canMiss > 0 ? canMiss : 0;
};

const calculateNeedToAttend = (attended, total, required) => {
  const currentPercentage = calculateAttendance(attended, total);

  if (currentPercentage >= required) return 0;

  if (required >= 100) {
    return attended === total ? 0 : 999;
  }

  const numerator = required * total - 100 * attended;
  const denominator = 100 - required;

  return Math.ceil(numerator / denominator);
};

const getStatus = (percentage, required) => {
  if (percentage < required) return "Danger";
  if (percentage >= required && percentage < 80) return "Warning";
  return "Safe";
};

// GET ALL SUBJECTS
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM subjects
       WHERE user_id = $1
       ORDER BY id DESC`,
      [req.user.id]
    );

    const subjects = result.rows.map((subject) => {
      const attended = Number(subject.attended_classes);
      const total = Number(subject.total_classes);
      const required = Number(subject.required_percentage);

      const percentage = calculateAttendance(attended, total);
      const canMiss = calculateCanMiss(attended, total, required);
      const needToAttend = calculateNeedToAttend(attended, total, required);

      return {
        ...subject,
        required_percentage: Number(subject.required_percentage),
        attendance_percentage: percentage,
        can_miss: canMiss,
        need_to_attend: needToAttend,
        status: getStatus(percentage, required)
      };
    });

    res.json({
      success: true,
      subjects
    });
  } catch (error) {
    console.error("Get subjects error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while fetching subjects"
    });
  }
});

// ADD SUBJECT
router.post(
  "/",
  [
    body("subject_name").trim().notEmpty().withMessage("Subject name is required"),
    body("total_classes").isInt({ min: 0 }).withMessage("Total classes must be 0 or more"),
    body("attended_classes").isInt({ min: 0 }).withMessage("Attended classes must be 0 or more"),
    body("required_percentage")
      .isFloat({ min: 1, max: 100 })
      .withMessage("Required percentage must be between 1 and 100")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        subject_name,
        total_classes,
        attended_classes,
        required_percentage
      } = req.body;

      if (Number(attended_classes) > Number(total_classes)) {
        return res.status(400).json({
          success: false,
          message: "Attended classes cannot be greater than total classes"
        });
      }

      const result = await pool.query(
        `INSERT INTO subjects
         (user_id, subject_name, total_classes, attended_classes, required_percentage)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          req.user.id,
          subject_name,
          total_classes,
          attended_classes,
          required_percentage
        ]
      );

      res.status(201).json({
        success: true,
        message: "Subject added successfully",
        subject: result.rows[0]
      });
    } catch (error) {
      console.error("Add subject error:", error.message);

      res.status(500).json({
        success: false,
        message: "Server error while adding subject"
      });
    }
  }
);

// UPDATE SUBJECT
router.put(
  "/:id",
  [
    body("subject_name").trim().notEmpty().withMessage("Subject name is required"),
    body("total_classes").isInt({ min: 0 }).withMessage("Total classes must be 0 or more"),
    body("attended_classes").isInt({ min: 0 }).withMessage("Attended classes must be 0 or more"),
    body("required_percentage")
      .isFloat({ min: 1, max: 100 })
      .withMessage("Required percentage must be between 1 and 100")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;

      const {
        subject_name,
        total_classes,
        attended_classes,
        required_percentage
      } = req.body;

      if (Number(attended_classes) > Number(total_classes)) {
        return res.status(400).json({
          success: false,
          message: "Attended classes cannot be greater than total classes"
        });
      }

      const result = await pool.query(
        `UPDATE subjects
         SET subject_name = $1,
             total_classes = $2,
             attended_classes = $3,
             required_percentage = $4
         WHERE id = $5 AND user_id = $6
         RETURNING *`,
        [
          subject_name,
          total_classes,
          attended_classes,
          required_percentage,
          id,
          req.user.id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Subject not found"
        });
      }

      res.json({
        success: true,
        message: "Subject updated successfully",
        subject: result.rows[0]
      });
    } catch (error) {
      console.error("Update subject error:", error.message);

      res.status(500).json({
        success: false,
        message: "Server error while updating subject"
      });
    }
  }
);

// DELETE SUBJECT
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM subjects
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    res.json({
      success: true,
      message: "Subject deleted successfully"
    });
  } catch (error) {
    console.error("Delete subject error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while deleting subject"
    });
  }
});

// CAN I BUNK TODAY
router.get("/:id/can-bunk", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM subjects
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    const subject = result.rows[0];

    const attended = Number(subject.attended_classes);
    const total = Number(subject.total_classes);
    const required = Number(subject.required_percentage);

    const currentPercentage = calculateAttendance(attended, total);
    const afterBunkPercentage = calculateAttendance(attended, total + 1);

    const canBunk = afterBunkPercentage >= required;

    res.json({
      success: true,
      subject_name: subject.subject_name,
      required_percentage: required,
      current_percentage: currentPercentage,
      after_bunk_percentage: afterBunkPercentage,
      can_bunk: canBunk,
      message: canBunk
        ? `Yes, you can bunk today. Your attendance will become ${afterBunkPercentage}%.`
        : `No, don't bunk today. Your attendance will fall to ${afterBunkPercentage}%.`
    });
  } catch (error) {
    console.error("Can bunk error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while checking bunk status"
    });
  }
});

export default router;