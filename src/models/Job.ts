import mongoose, { Schema, Document } from "mongoose";

export interface IJob extends Document {
  title: string;
  description: string;
  location: string;
  salaryOriginal?: string;   // "20-30 LPA"
  salaryMin?: number;        // 2000000
  salaryMax?: number | null; // 3000000 or null
  status: "active" | "inactive" | "closed";
  numberOfOpenings: number;
  postedBy: mongoose.Schema.Types.ObjectId;
  company: string;
  jobType: "Full-time" | "Part-time" | "Contract" | "Temporary" | "Internship";
  skills?: string[];
  companyLogo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location: { type: String, required: true, trim: true },

    // ✅ Salary fields
    salaryOriginal: { type: String },   // Store the dropdown string
    salaryMin: { type: Number },
    salaryMax: { type: Number },

    status: {
      type: String,
      enum: ["active", "inactive", "closed"],
      default: "active",
    },
    numberOfOpenings: { type: Number, required: true, min: 1 },
    postedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: String, required: true, trim: true },
    jobType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Temporary", "Internship"],
      required: true,
    },
    skills: [{ type: String, trim: true }],
    companyLogo: { type: String, trim: true },
  },
  { timestamps: true }
);

// ✅ Pre-save hook: convert salaryOriginal into salaryMin & salaryMax
JobSchema.pre<IJob>("save", function (next) {
  if (this.salaryOriginal) {
    const str = this.salaryOriginal.toLowerCase().replace(/₹|,/g, "").trim();

    // "20-30 lpa"
    const matchRange = str.match(/(\d+)\s*-\s*(\d+)\s*lpa/);
    if (matchRange) {
      this.salaryMin = parseInt(matchRange[1], 10) * 100000;
      this.salaryMax = parseInt(matchRange[2], 10) * 100000;
      return next();
    }

    // "15 lpa"
    const matchSingle = str.match(/(\d+)\s*lpa/);
    if (matchSingle) {
      this.salaryMin = parseInt(matchSingle[1], 10) * 100000;
      this.salaryMax = this.salaryMin;
      return next();
    }

    // "50+ lpa"
    const matchPlus = str.match(/(\d+)\+\s*lpa/);
    if (matchPlus) {
      this.salaryMin = parseInt(matchPlus[1], 10) * 100000;
      this.salaryMax = null;
      return next();
    }
  }

  next();
});

const Job =
  mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);

export default Job;
