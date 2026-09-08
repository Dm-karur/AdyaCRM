<?php
require_once __DIR__ . '/config/Database.php';

use App\config\Database;

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    $query = "CREATE TABLE IF NOT EXISTS branches (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    
    $conn->exec($query);
    echo "Branches table created successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
