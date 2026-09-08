<?php
namespace App\models;

class Followup {
    private $conn;
    private $table_name = "followups";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create($data) {
        $query = "INSERT INTO " . $this->table_name . " (id, leadId, date, description, status, createdBy) 
                  VALUES (:id, :leadId, :date, :description, :status, :createdBy)";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":id", $data['id']);
        $stmt->bindParam(":leadId", $data['leadId']);
        $stmt->bindParam(":date", $data['date']);
        $stmt->bindParam(":description", $data['description']);
        $stmt->bindParam(":status", $data['status']);
        $stmt->bindParam(":createdBy", $data['createdBy']);

        return $stmt->execute();
    }

    public function getAll($role, $branch) {
        $query = "SELECT f.*, c.name as lead_name, c.company as lead_company, c.email as lead_email, 
                         c.phone as lead_phone, c.status as lead_status, c.source as lead_source, c.priority as lead_priority,
                         u.name as creator_name
                  FROM " . $this->table_name . " f
                  LEFT JOIN customer_entries c ON f.leadId = c.id 
                  LEFT JOIN users u ON (f.createdBy = u.id OR (f.createdBy IS NULL AND c.employeeId = u.id)) ";

        if ($role !== 'Admin') {
            $query .= " WHERE c.branch = :branch ";
        }

        $query .= " ORDER BY f.date ASC";

        $stmt = $this->conn->prepare($query);
        
        if ($role !== 'Admin') {
            $stmt->bindParam(":branch", $branch);
        }

        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getByLead($leadId) {
        $query = "SELECT f.*, u.name as creator_name 
                  FROM " . $this->table_name . " f 
                  LEFT JOIN customer_entries c ON f.leadId = c.id 
                  LEFT JOIN users u ON (f.createdBy = u.id OR (f.createdBy IS NULL AND c.employeeId = u.id))
                  WHERE f.leadId = :leadId ORDER BY f.date ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":leadId", $leadId);
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

    public function updateStatus($id, $status) {
        $query = "UPDATE " . $this->table_name . " SET status = :status WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":status", $status);
        $stmt->bindParam(":id", $id);
        return $stmt->execute();
    }
}
