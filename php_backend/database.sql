CREATE TABLE `users` (
  `id` VARCHAR(24) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `employeeId` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `plainPassword` VARCHAR(255),
  `role` ENUM('Employee', 'Admin') DEFAULT 'Employee',
  `department` VARCHAR(100) DEFAULT 'General',
  `designation` VARCHAR(100),
  `reportingManager` VARCHAR(24),
  `joiningDate` DATE,
  `shift` ENUM('General', 'Morning', 'Evening', 'Night', 'Custom') DEFAULT 'General',
  `photo` VARCHAR(255),
  `isActive` BOOLEAN DEFAULT TRUE,
  `isFieldWorker` BOOLEAN DEFAULT FALSE,
  `salary` DECIMAL(10,2) DEFAULT 0,
  `salaryType` ENUM('Weekly', 'Monthly') DEFAULT 'Monthly',
  `shiftStart` VARCHAR(10) DEFAULT '09:00',
  `shiftEnd` VARCHAR(10) DEFAULT '18:00',
  `brand` ENUM('Bosch', 'Furniture', 'None') DEFAULT 'None',
  `branch` VARCHAR(100) DEFAULT 'Main',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `attendances` (
  `id` VARCHAR(24) PRIMARY KEY,
  `employeeId` VARCHAR(24) NOT NULL,
  `employeeName` VARCHAR(255),
  `department` VARCHAR(100),
  `date` DATE NOT NULL,
  
  `punchIn_time` DATETIME,
  `punchIn_photo` VARCHAR(255),
  `punchIn_originalSelfie` VARCHAR(255),
  `punchIn_attendanceImage` VARCHAR(255),
  `punchIn_latitude` DECIMAL(10,8),
  `punchIn_longitude` DECIMAL(11,8),
  `punchIn_accuracy` DECIMAL(10,2),
  `punchIn_mapUrl` TEXT,
  `punchIn_address` TEXT,
  `punchIn_browser` VARCHAR(100),
  `punchIn_os` VARCHAR(100),
  `punchIn_ip` VARCHAR(50),
  
  `punchOut_time` DATETIME,
  `punchOut_photo` VARCHAR(255),
  `punchOut_originalSelfie` VARCHAR(255),
  `punchOut_attendanceImage` VARCHAR(255),
  `punchOut_latitude` DECIMAL(10,8),
  `punchOut_longitude` DECIMAL(11,8),
  `punchOut_accuracy` DECIMAL(10,2),
  `punchOut_mapUrl` TEXT,
  `punchOut_address` TEXT,
  `punchOut_browser` VARCHAR(100),
  `punchOut_os` VARCHAR(100),
  `punchOut_ip` VARCHAR(50),
  
  `workingHours` INT DEFAULT 0,
  `lateMinutes` INT DEFAULT 0,
  `overtimeMinutes` INT DEFAULT 0,
  
  `status` ENUM('Present', 'Absent', 'Half Day', 'Holiday', 'Leave', 'Casual Leave', 'Weekend') DEFAULT 'Absent',
  `isManualEntry` BOOLEAN DEFAULT FALSE,
  `manualEntryReason` TEXT,
  `manualEnteredBy` VARCHAR(24),
  `isOfflineRecorded` BOOLEAN DEFAULT FALSE,
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `customer_entries` (
  `id` VARCHAR(24) PRIMARY KEY,
  `employeeId` VARCHAR(24) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `company` VARCHAR(255) DEFAULT '-',
  `email` VARCHAR(255) DEFAULT '-',
  `phone` VARCHAR(50) NOT NULL,
  `status` VARCHAR(100) DEFAULT 'NEW LEAD',
  `source` VARCHAR(100) DEFAULT 'WEBSITE',
  `serviceInterest` VARCHAR(255) DEFAULT '-',
  `budget` VARCHAR(100) DEFAULT '-',
  `priority` ENUM('WARM', 'COLD', 'HOT') DEFAULT 'WARM',
  `photo` VARCHAR(255),
  `brand` ENUM('Bosch', 'Furniture', 'None') DEFAULT 'None',
  `branch` VARCHAR(100) DEFAULT 'Main',
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `customer_entry_bills` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_entry_id` VARCHAR(24) NOT NULL,
  `url` TEXT NOT NULL,
  `originalName` VARCHAR(255),
  `uploadedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`customer_entry_id`) REFERENCES `customer_entries`(`id`) ON DELETE CASCADE
);

CREATE TABLE `followups` (
  `id` VARCHAR(24) PRIMARY KEY,
  `leadId` VARCHAR(24) NOT NULL,
  `date` DATETIME NOT NULL,
  `description` TEXT NOT NULL,
  `status` ENUM('PENDING', 'DONE') DEFAULT 'PENDING',
  `createdBy` VARCHAR(24) NULL,
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`leadId`) REFERENCES `customer_entries`(`id`) ON DELETE CASCADE
);

CREATE TABLE `leaves` (
  `id` VARCHAR(24) PRIMARY KEY,
  `employeeId` VARCHAR(24) NOT NULL,
  `type` ENUM('Annual Leave', 'Sick Leave', 'Casual Leave', 'Unpaid Leave') NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  `approvedBy` VARCHAR(24),
  `adminComment` TEXT,
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `quotes` (
  `id` VARCHAR(24) PRIMARY KEY,
  `leadId` VARCHAR(24) NOT NULL,
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `customerAddress` TEXT,
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`leadId`) REFERENCES `customer_entries`(`id`) ON DELETE CASCADE
);

CREATE TABLE `quote_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quote_id` VARCHAR(24) NOT NULL,
  `product` VARCHAR(255) NOT NULL,
  `model` VARCHAR(255) NOT NULL,
  `quantity` INT DEFAULT 1,
  `mrp` DECIMAL(12,2) NOT NULL,
  `discountedPrice` DECIMAL(12,2) NOT NULL,
  
  FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON DELETE CASCADE
);

CREATE TABLE `audit_logs` (
  `id` VARCHAR(24) PRIMARY KEY,
  `adminId` VARCHAR(24) NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `targetId` VARCHAR(24),
  `details` JSON,
  `ipAddress` VARCHAR(50),
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Insert Default Users
-- Default Password for both users is: password
-- --------------------------------------------------------

INSERT IGNORE INTO `users` (`id`, `name`, `employeeId`, `password`, `plainPassword`, `role`, `department`, `designation`, `shift`, `isActive`, `salary`, `salaryType`) VALUES
('admin_001_initial', 'System Admin', 'ADMIN001', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'password', 'Admin', 'Management', 'Administrator', 'General', 1, 0.00, 'Monthly'),
('emp_001_initial', 'John Doe', 'EMP001', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'password', 'Employee', 'Sales', 'Sales Executive', 'Morning', 1, 30000.00, 'Monthly');
