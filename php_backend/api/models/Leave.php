<?php
namespace App\models;

class Leave {
    private $conn;
    private $table_name = "leaves";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create($data) {
        $query = "INSERT INTO " . $this->table_name . " (id, employeeId, type, startDate, endDate, reason) 
                  VALUES (:id, :employeeId, :type, :startDate, :endDate, :reason)";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $data['id']);
        $stmt->bindParam(":employeeId", $data['employeeId']);
        $stmt->bindParam(":type", $data['type']);
        $stmt->bindParam(":startDate", $data['startDate']);
        $stmt->bindParam(":endDate", $data['endDate']);
        $stmt->bindParam(":reason", $data['reason']);

        return $stmt->execute();
    }

    public function getMyLeaves($employeeId) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE employeeId = :employeeId ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":employeeId", $employeeId);
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getAllLeaves() {
        $query = "SELECT l.*, u.name as employee_name, u.employeeId as employee_code 
                  FROM " . $this->table_name . " l
                  LEFT JOIN users u ON l.employeeId = u.id 
                  ORDER BY l.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :id LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    public function updateStatus($id, $status, $adminComment, $approvedBy) {
        $query = "UPDATE " . $this->table_name . " SET status = :status, adminComment = :adminComment, approvedBy = :approvedBy WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":status", $status);
        $stmt->bindParam(":adminComment", $adminComment);
        $stmt->bindParam(":approvedBy", $approvedBy);
        $stmt->bindParam(":id", $id);
        return $stmt->execute();
    }
}
