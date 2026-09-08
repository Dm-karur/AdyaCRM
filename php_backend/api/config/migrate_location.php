<?php
require_once __DIR__ . '/config.php';

try {
    $conn = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS
    );
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1. Update `branches` table
    $stmt = $conn->query("SHOW COLUMNS FROM `branches` LIKE 'latitude'");
    if ($stmt->rowCount() == 0) {
        $conn->exec("ALTER TABLE `branches` 
            ADD COLUMN `latitude` DECIMAL(10,8) NULL,
            ADD COLUMN `longitude` DECIMAL(11,8) NULL,
            ADD COLUMN `attendance_radius` INT DEFAULT 100,
            ADD COLUMN `status` ENUM('Active', 'Inactive') DEFAULT 'Active'");
        echo "Added location columns to branches.\n";
    } else {
        echo "Location columns already exist in branches.\n";
    }

    // 2. Update `users` table
    $stmt = $conn->query("SHOW COLUMNS FROM `users` LIKE 'allow_outside_radius'");
    if ($stmt->rowCount() == 0) {
        $conn->exec("ALTER TABLE `users` ADD COLUMN `allow_outside_radius` BOOLEAN DEFAULT 0");
        echo "Added allow_outside_radius to users.\n";
    } else {
        echo "allow_outside_radius already exists in users.\n";
    }

    // 3. Update `attendances` table
    $stmt = $conn->query("SHOW COLUMNS FROM `attendances` LIKE 'location_validation_status'");
    if ($stmt->rowCount() == 0) {
        $conn->exec("ALTER TABLE `attendances` 
            ADD COLUMN `location_validation_status` VARCHAR(50) NULL,
            ADD COLUMN `attendance_distance` DECIMAL(10,2) NULL");
        echo "Added location_validation_status to attendances.\n";
    } else {
        echo "location_validation_status already exists in attendances.\n";
    }

    echo "Migration completed successfully.\n";

} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
