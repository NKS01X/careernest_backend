import multer from "multer";

const storage = multer.memoryStorage();//using ram


export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Only PDFs
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF resumes are allowed.") as any, false);
    }
  },
});