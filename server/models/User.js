const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  employeeId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plainPassword: { type: String },
  role: { type: String, enum: ['Employee', 'Admin'], default: 'Employee' },
  department: { type: String, default: 'General' },
  designation: { type: String },
  reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  joiningDate: { type: Date },
  shift: { 
    type: String, 
    enum: ['General', 'Morning', 'Evening', 'Night', 'Custom'], 
    default: 'General' 
  },
  photo: { type: String },
  isActive: { type: Boolean, default: true },
  isFieldWorker: { type: Boolean, default: false }, // If true, ignores geofencing
  salary: { type: Number, default: 0 },
  salaryType: { type: String, enum: ['Weekly', 'Monthly'], default: 'Monthly' },
  shiftStart: { type: String, default: "09:00" },
  shiftEnd: { type: String, default: "18:00" },
  brand: { type: String, enum: ['Bosch', 'Furniture', 'None'], default: 'None' },
  branch: { type: String, default: 'Main' }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
