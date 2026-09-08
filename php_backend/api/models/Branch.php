<?php
namespace App\models;

class Branch {
    private $conn;
    private $table_name = "branches";

    public $id;
    public $name;
    public $code;
    public $created_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getAll() {
        $query = "SELECT id as _id, id, name, code, latitude, longitude, attendance_radius, status, created_at FROM " . $this->table_name . " ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getByName($name) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE name = :name LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':name', $name);
        $stmt->execute();
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    public function create($name, $code, $latitude = null, $longitude = null, $attendance_radius = 100, $status = 'Active') {
        $query = "INSERT INTO " . $this->table_name . " SET id=:id, name=:name, code=:code, latitude=:latitude, longitude=:longitude, attendance_radius=:attendance_radius, status=:status";
        $stmt = $this->conn->prepare($query);

        $id = uniqid(); // Generate a unique ID string

        $stmt->bindValue(':id', $id);
        $stmt->bindValue(':name', $name);
        $stmt->bindValue(':code', $code);
        $stmt->bindValue(':latitude', $latitude);
        $stmt->bindValue(':longitude', $longitude);
        $stmt->bindValue(':attendance_radius', $attendance_radius);
        $stmt->bindValue(':status', $status);

        if ($stmt->execute()) {
            return [
                '_id' => $id,
                'id' => $id,
                'name' => $name,
                'code' => $code,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'attendance_radius' => $attendance_radius,
                'status' => $status
            ];
        }
        return false;
    }

    public function update($id, $name, $latitude = null, $longitude = null, $attendance_radius = 100, $status = 'Active') {
        $query = "UPDATE " . $this->table_name . " SET name=:name, latitude=:latitude, longitude=:longitude, attendance_radius=:attendance_radius, status=:status WHERE id=:id";
        $stmt = $this->conn->prepare($query);

        $stmt->bindValue(':id', $id);
        $stmt->bindValue(':name', $name);
        $stmt->bindValue(':latitude', $latitude);
        $stmt->bindValue(':longitude', $longitude);
        $stmt->bindValue(':attendance_radius', $attendance_radius);
        $stmt->bindValue(':status', $status);

        return $stmt->execute();
    }
    
    public function generateUniqueCode() {
        // Start from BR-1001 and increment
        $query = "SELECT code FROM " . $this->table_name . " ORDER BY created_at DESC LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if ($row && isset($row['code'])) {
            $lastCode = $row['code'];
            // Extract the number part
            if (preg_match('/BR-(\d+)/', $lastCode, $matches)) {
                $number = intval($matches[1]) + 1;
                return 'BR-' . $number;
            }
        }
        
        return 'BR-1001';
    }
}
