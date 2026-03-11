import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    dayName: { type: String, required: true },
    punchIn: { type: Date },
    punchOut: { type: Date },
    isLeave: { type: String, enum: ["None", "Leave"], default: "None" },
    isHoliday: { type: Boolean, default: false },
    workingMinutes: { type: Number, default: 0 },
    differenceMinutes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
