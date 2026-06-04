import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import pool from "../config/db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const createToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// REGISTER
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters")
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

      const { name, email, password } = req.body;

      const normalizedEmail = email.toLowerCase();

      const existingUser = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [normalizedEmail]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "User already exists"
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await pool.query(
        `INSERT INTO users (name, email, password)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, created_at`,
        [name, normalizedEmail, hashedPassword]
      );

      const token = createToken(newUser.rows[0].id);

      res.status(201).json({
        success: true,
        message: "Registration successful",
        token,
        user: newUser.rows[0]
      });
    } catch (error) {
      console.error("Register error:", error.message);

      res.status(500).json({
        success: false,
        message: "Server error during registration"
      });
    }
  }
);

// LOGIN
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required")
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

      const { email, password } = req.body;

      const normalizedEmail = email.toLowerCase();

      const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      const user = result.rows[0];

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      const token = createToken(user.id);

      res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Login error:", error.message);

      res.status(500).json({
        success: false,
        message: "Server error during login"
      });
    }
  }
);

// GET CURRENT USER
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Get user error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

export default router;