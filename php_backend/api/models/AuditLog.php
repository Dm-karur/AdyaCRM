<?php
namespace App\models;

class AuditLog {
    private $conn;
    private $table_name = "audit_logs";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create($data) {
        $query = "INSERT INTO " . $this->table_name . " (id, adminId, action, targetId, details, ipAddress) 
                  VALUES (:id, :adminId, :action, :targetId, :details, :ipAddress)";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $data['id']);
        $stmt->bindParam(":adminId", $data['adminId']);
        $stmt->bindParam(":action", $data['action']);
        $stmt->bindParam(":targetId", $data['targetId']);
        
        $details = isset($data['details']) ? json_encode($data['details']) : null;
        $stmt->bindParam(":details", $details);
        
        $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null;
        $stmt->bindParam(":ipAddress", $ip);

        return $stmt->execute();
    }
}
