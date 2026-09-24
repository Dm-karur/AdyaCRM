<?php
namespace App\models;

class CustomerEntry {
    private $conn;
    private $table_name = "customer_entries";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create($data) {
        $query = "INSERT INTO " . $this->table_name . " 
                  (id, employeeId, name, company, email, phone, status, source, referrerName, serviceInterest, budget, priority, photo, brand, branch) 
                  VALUES (:id, :employeeId, :name, :company, :email, :phone, :status, :source, :referrerName, :serviceInterest, :budget, :priority, :photo, :brand, :branch)";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":id", $data['id']);
        $stmt->bindParam(":employeeId", $data['employeeId']);
        $stmt->bindParam(":name", $data['name']);
        $stmt->bindParam(":company", $data['company']);
        $stmt->bindParam(":email", $data['email']);
        $stmt->bindParam(":phone", $data['phone']);
        $stmt->bindParam(":status", $data['status']);
        $stmt->bindParam(":source", $data['source']);
        $stmt->bindParam(":referrerName", $data['referrerName']);
        $stmt->bindParam(":serviceInterest", $data['serviceInterest']);
        $stmt->bindParam(":budget", $data['budget']);
        $stmt->bindParam(":priority", $data['priority']);
        $stmt->bindParam(":photo", $data['photo']);
        $stmt->bindParam(":brand", $data['brand']);
        $stmt->bindParam(":branch", $data['branch']);

        if($stmt->execute()) {
            return true;
        }
        return false;
    }

    public function getByPhone($phone) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE phone = :phone LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":phone", $phone);
        $stmt->execute();
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    public function getByNameExact($name) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE LOWER(name) = LOWER(:name) LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":name", $name);
        $stmt->execute();
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    public function getEmployeeEntries($employeeId) {
        // Need to join with users to get employee details
        $query = "SELECT c.*, u.name as employee_name, u.employeeId as employee_code, u.department as employee_department, u.brand as employee_brand, u.branch as employee_branch
                  FROM " . $this->table_name . " c
                  LEFT JOIN users u ON c.employeeId = u.id
                  WHERE c.employeeId = :employeeId
                  ORDER BY c.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":employeeId", $employeeId);
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getAllEntries($role, $branch) {
        $query = "SELECT c.*, u.name as employee_name, u.employeeId as employee_code, u.department as employee_department, u.brand as employee_brand, u.branch as employee_branch
                  FROM " . $this->table_name . " c
                  LEFT JOIN users u ON c.employeeId = u.id ";
                  
        if ($role !== 'Admin') {
            $query .= " WHERE c.branch = :branch ";
        }
        
        $query .= " ORDER BY c.created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        if ($role !== 'Admin') {
            $stmt->bindParam(":branch", $branch);
        }
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

    public function updatePhoto($id, $photo) {
        $query = "UPDATE " . $this->table_name . " SET photo = :photo WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":photo", $photo);
        $stmt->bindParam(":id", $id);
        return $stmt->execute();
    }

    public function delete($id) {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        return $stmt->execute();
    }

    // Bills handling
    public function addBill($customer_entry_id, $url, $originalName) {
        $query = "INSERT INTO customer_entry_bills (customer_entry_id, url, originalName) VALUES (:customer_entry_id, :url, :originalName)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":customer_entry_id", $customer_entry_id);
        $stmt->bindParam(":url", $url);
        $stmt->bindParam(":originalName", $originalName);
        return $stmt->execute();
    }

    public function getBills($customer_entry_id) {
        $query = "SELECT * FROM customer_entry_bills WHERE customer_entry_id = :customer_entry_id ORDER BY uploadedAt DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":customer_entry_id", $customer_entry_id);
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function addPurchaseBill($customer_entry_id, $billNumber, $billedDate, $product = null) {
        // Ensure table exists
        $createTableQuery = "CREATE TABLE IF NOT EXISTS customer_entry_purchase_bills (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_entry_id VARCHAR(24) NOT NULL,
            billNumber VARCHAR(255) NOT NULL,
            billedDate DATE NOT NULL,
            product VARCHAR(255) NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_entry_id) REFERENCES customer_entries(id) ON DELETE CASCADE
        )";
        $this->conn->exec($createTableQuery);

        // Add product column if it doesn't exist (for existing tables)
        try {
            $this->conn->exec("ALTER TABLE customer_entry_purchase_bills ADD COLUMN product VARCHAR(255) NULL");
        } catch (\PDOException $e) {
            // Column likely already exists, ignore error
        }

        $query = "INSERT INTO customer_entry_purchase_bills (customer_entry_id, billNumber, billedDate, product) VALUES (:customer_entry_id, :billNumber, :billedDate, :product)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":customer_entry_id", $customer_entry_id);
        $stmt->bindParam(":billNumber", $billNumber);
        $stmt->bindParam(":billedDate", $billedDate);
        $stmt->bindParam(":product", $product);
        return $stmt->execute();
    }

    public function getPurchaseBills($customer_entry_id) {
        // Ensure table exists to prevent errors if it hasn't been created yet
        $createTableQuery = "CREATE TABLE IF NOT EXISTS customer_entry_purchase_bills (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_entry_id VARCHAR(24) NOT NULL,
            billNumber VARCHAR(255) NOT NULL,
            billedDate DATE NOT NULL,
            product VARCHAR(255) NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_entry_id) REFERENCES customer_entries(id) ON DELETE CASCADE
        )";
        try {
            $this->conn->exec($createTableQuery);
            $query = "SELECT * FROM customer_entry_purchase_bills WHERE customer_entry_id = :customer_entry_id ORDER BY createdAt DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":customer_entry_id", $customer_entry_id);
            $stmt->execute();
            return $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\PDOException $e) {
            // Table might not exist or other error, return empty array
            return [];
        }
    }
}

