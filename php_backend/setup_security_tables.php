<?php
require_once __DIR__ . '/api/config/Database.php';

use App\config\Database;

$database = new Database();
$db = $database->getConnection();

try {
    // Create login_attempts table
    $query = "CREATE TABLE IF NOT EXISTS login_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL,
        attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )";
    $db->exec($query);
    echo "login_attempts table created successfully.\n";

    // Create audit_logs table
    $query = "CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        adminId VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        targetId VARCHAR(50),
        details JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )";
    $db->exec($query);
    echo "audit_logs table created successfully.\n";

} catch (PDOException $e) {
    echo "Error creating tables: " . $e->getMessage() . "\n";
}
