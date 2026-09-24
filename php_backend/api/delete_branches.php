<?php
require_once __DIR__ . '/config/Database.php';
use App\config\Database;

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Delete all branches from the branches table
    $query = "TRUNCATE TABLE branches";
    $conn->exec($query);
    
    echo "Successfully deleted all branches from the database.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
