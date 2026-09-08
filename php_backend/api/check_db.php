<?php
// Simple script to test the branches table on Hostinger
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");

require_once __DIR__ . '/config/Database.php';

try {
    $db = new \App\config\Database();
    $conn = $db->getConnection();
    
    // Check if table exists and what its structure is
    $query = "DESCRIBE branches";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $structure = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Try to select
    $query2 = "SELECT id as _id, id, name, code, created_at FROM branches ORDER BY created_at DESC";
    $stmt2 = $conn->prepare($query2);
    $stmt2->execute();
    $data = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "status" => "success",
        "message" => "Table exists and query works!",
        "structure" => $structure,
        "data" => $data
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>
