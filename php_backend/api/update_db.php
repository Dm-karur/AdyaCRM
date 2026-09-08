<?php
require_once __DIR__ . '/config/Database.php';

try {
    $db = new \App\config\Database();
    $conn = $db->getConnection();
    
    echo "Updating database...<br>";

    // Add createdBy to followups if it doesn't exist
    $result = $conn->query("SHOW COLUMNS FROM `followups` LIKE 'createdBy'");
    if ($result->rowCount() == 0) {
        $conn->exec("ALTER TABLE `followups` ADD COLUMN `createdBy` VARCHAR(24) NULL");
        echo "Successfully added `createdBy` column to `followups` table.<br>";
    } else {
        echo "`createdBy` column already exists in `followups` table.<br>";
    }

    // Add branch location fields
    $result = $conn->query("SHOW COLUMNS FROM `branches` LIKE 'latitude'");
    if ($result->rowCount() == 0) {
        $conn->exec("ALTER TABLE `branches` 
            ADD COLUMN `latitude` DECIMAL(10,8) NULL,
            ADD COLUMN `longitude` DECIMAL(11,8) NULL,
            ADD COLUMN `attendance_radius` INT DEFAULT 100,
            ADD COLUMN `status` ENUM('Active', 'Inactive') DEFAULT 'Active'");
        echo "Successfully added location columns to `branches` table.<br>";
    } else {
        echo "Location columns already exist in `branches` table.<br>";
    }

    // Add user permission field
    $result = $conn->query("SHOW COLUMNS FROM `users` LIKE 'allow_outside_radius'");
    if ($result->rowCount() == 0) {
        $conn->exec("ALTER TABLE `users` ADD COLUMN `allow_outside_radius` BOOLEAN DEFAULT 0");
        echo "Successfully added `allow_outside_radius` to `users` table.<br>";
    } else {
        echo "`allow_outside_radius` already exists in `users` table.<br>";
    }

    // Add attendance tracking fields
    $result = $conn->query("SHOW COLUMNS FROM `attendances` LIKE 'location_validation_status'");
    if ($result->rowCount() == 0) {
        $conn->exec("ALTER TABLE `attendances` 
            ADD COLUMN `location_validation_status` VARCHAR(50) NULL,
            ADD COLUMN `attendance_distance` DECIMAL(10,2) NULL");
        echo "Successfully added tracking fields to `attendances` table.<br>";
    } else {
        echo "Tracking fields already exist in `attendances` table.<br>";
    }

    echo "<br><b>Database update completed successfully!</b>";
} catch (Exception $e) {
    echo "Error updating database: " . $e->getMessage();
}
