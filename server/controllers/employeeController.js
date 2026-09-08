const User = require('../models/User');

// @desc    Register a new employee
// @route   POST /api/employees
// @access  Private/Admin
const createEmployee = async (req, res) => {
  const { name, employeeId, password, role, department, shift, isFieldWorker, salary, shiftStart, shiftEnd, salaryType, brand, branch } = req.body;

  const userExists = await User.findOne({ employeeId });
  if (userExists) {
    return res.status(400).json({ message: 'Employee already exists' });
  }

  const user = await User.create({
    name,
    employeeId,
    password,
    plainPassword: password,
    role,
    department,
    shift,
    isFieldWorker,
    salary: salary || 0,
    salaryType: salaryType || 'Monthly',
    shiftStart: shiftStart || '09:00',
    shiftEnd: shiftEnd || '18:00',
    brand: brand || 'None',
    branch: branch || 'Main'
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      employeeId: user.employeeId,
      role: user.role,
      salary: user.salary,
      salaryType: user.salaryType,
      shiftStart: user.shiftStart,
      shiftEnd: user.shiftEnd,
      brand: user.brand,
      branch: user.branch,
    });
  } else {
    res.status(400).json({ message: 'Invalid employee data' });
  }
};

// @desc    Update employee profile
// @route   PUT /api/employees/:id
// @access  Private/Admin
const updateEmployee = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.department = req.body.department || user.department;
    user.shift = req.body.shift || user.shift;
    user.role = req.body.role || user.role;
    user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;
    user.isFieldWorker = req.body.isFieldWorker !== undefined ? req.body.isFieldWorker : user.isFieldWorker;
    if (req.body.salary !== undefined) user.salary = req.body.salary;
    if (req.body.salaryType !== undefined) user.salaryType = req.body.salaryType;
    if (req.body.shiftStart !== undefined) user.shiftStart = req.body.shiftStart;
    if (req.body.shiftEnd !== undefined) user.shiftEnd = req.body.shiftEnd;
    if (req.body.brand !== undefined) user.brand = req.body.brand;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      employeeId: updatedUser.employeeId,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      salary: updatedUser.salary,
      salaryType: updatedUser.salaryType,
      shiftStart: updatedUser.shiftStart,
      shiftEnd: updatedUser.shiftEnd,
      brand: updatedUser.brand
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private/Admin
const deleteEmployee = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    await user.deleteOne();
    res.json({ message: 'Employee removed' });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

module.exports = { createEmployee, updateEmployee, deleteEmployee };
