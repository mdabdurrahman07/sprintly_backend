import rateLimit from "express-rate-limit";
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15
  max: 5, 
  message: {
    status: 429,
    error: "Too many requests from this IP, please try again after 15 minutes.",
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});
