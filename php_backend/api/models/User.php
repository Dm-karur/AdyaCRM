<?php
namespace App\models;

class User {
    private $conn;
    private $table_name = "users";

    public $id;
    public $name;
    public $employeeId;
    public $password;
    public $role;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function findByEmployeeId($employeeId) {
        $query = "SELECT *, id as _id FROM " . $this->table_name . " WHERE employeeId = :employeeId LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':employeeId', $employeeId);
        $stmt->execute();
        
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($result) {
            // Cast boolean fields
            $result['isActive'] = (bool)$result['isActive'];
            $result['isFieldWorker'] = (bool)$result['isFieldWorker'];
            $result['allow_outside_radius'] = (bool)$result['allow_outside_radius'];
        }
        return $result;
    }

    public function findById($id) {
        $query = "SELECT id as _id, id, name, employeeId, role, department, designation, joiningDate, shift, photo, isActive, isFieldWorker, allow_outside_radius, salary, salaryType, shiftStart, shiftEnd, brand, branch, password, plainPassword FROM " . $this->table_name . " WHERE id = :id LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($result) {
            // Cast boolean fields
            $result['isActive'] = (bool)$result['isActive'];
            $result['isFieldWorker'] = (bool)$result['isFieldWorker'];
            $result['allow_outside_radius'] = (bool)$result['allow_outside_radius'];
        }
        return $result;
    }

    public function matchPassword($enteredPassword, $hashedPassword) {
        return password_verify($enteredPassword, $hashedPassword);
    }

    public function create($data) {
        $query = "INSERT INTO " . $this->table_name . " 
                  SET id=:id, name=:name, employeeId=:employeeId, password=:password, 
                      plainPassword=:plainPassword, role=:role, department=:department,
                      shift=:shift, isFieldWorker=:isFieldWorker, allow_outside_radius=:allow_outside_radius, salary=:salary, 
                      salaryType=:salaryType, shiftStart=:shiftStart, shiftEnd=:shiftEnd, brand=:brand, branch=:branch";
                      
        $stmt = $this->conn->prepare($query);

        $hashed_password = password_hash($data['password'], PASSWORD_BCRYPT);

        $stmt->bindValue(':id', $data['id']);
        $stmt->bindValue(':name', $data['name']);
        $stmt->bindValue(':employeeId', $data['employeeId']);
        $stmt->bindValue(':password', $hashed_password);
        $stmt->bindValue(':plainPassword', $data['password']);
        $stmt->bindValue(':role', isset($data['role']) ? $data['role'] : 'Employee');
        $stmt->bindValue(':department', isset($data['department']) ? $data['department'] : 'General');
        $stmt->bindValue(':shift', isset($data['shift']) ? $data['shift'] : 'General');
        $stmt->bindValue(':isFieldWorker', isset($data['isFieldWorker']) && $data['isFieldWorker'] ? 1 : 0);
        $stmt->bindValue(':allow_outside_radius', isset($data['allow_outside_radius']) && $data['allow_outside_radius'] ? 1 : 0);
        $stmt->bindValue(':salary', isset($data['salary']) ? $data['salary'] : 0);
        $stmt->bindValue(':salaryType', isset($data['salaryType']) ? $data['salaryType'] : 'Monthly');
        $stmt->bindValue(':shiftStart', isset($data['shiftStart']) ? $data['shiftStart'] : '09:00');
        $stmt->bindValue(':shiftEnd', isset($data['shiftEnd']) ? $data['shiftEnd'] : '18:00');
        $stmt->bindValue(':brand', isset($data['brand']) ? $data['brand'] : 'None');
        $stmt->bindValue(':branch', isset($data['branch']) ? $data['branch'] : 'Main');

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    public function getAll() {
        $query = "SELECT id as _id, id, name, employeeId, role, department, designation, joiningDate, shift, photo, isActive, isFieldWorker, allow_outside_radius, salary, salaryType, shiftStart, shiftEnd, brand, branch FROM " . $this->table_name . " ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        // Cast boolean fields for all records
        return array_map(function($r) {
            $r['isActive'] = (bool)$r['isActive'];
            $r['isFieldWorker'] = (bool)$r['isFieldWorker'];
            $r['allow_outside_radius'] = (bool)$r['allow_outside_radius'];
            return $r;
        }, $results);
    }

    /**
     * Get all active employees (used for marking holidays)
     */
    public function getActiveEmployees() {
        $query = "SELECT id as _id, id, name, employeeId, role, department, shift, brand, branch FROM " . $this->table_name . " WHERE isActive = 1 ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get employees filtered by brand
     */
    public function getByBrand($brand) {
        $query = "SELECT id as _id, id, name, employeeId, role, department, designation, joiningDate, shift, photo, isActive, isFieldWorker, salary, salaryType, shiftStart, shiftEnd, brand, branch FROM " . $this->table_name . " WHERE brand = :brand ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':brand', $brand);
        $stmt->execute();
        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        return array_map(function($r) {
            $r['isActive'] = (bool)$r['isActive'];
            $r['isFieldWorker'] = (bool)$r['isFieldWorker'];
            return $r;
        }, $results);
    }

    /**
     * Get employees filtered by branch
     */
    public function getByBranch($branch) {
        $query = "SELECT id as _id, id, name, employeeId, role, department, designation, joiningDate, shift, photo, isActive, isFieldWorker, salary, salaryType, shiftStart, shiftEnd, brand, branch FROM " . $this->table_name . " WHERE branch = :branch ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':branch', $branch);
        $stmt->execute();
        $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        return array_map(function($r) {
            $r['isActive'] = (bool)$r['isActive'];
            $r['isFieldWorker'] = (bool)$r['isFieldWorker'];
            return $r;
        }, $results);
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        
        $allowedFields = ['name', 'department', 'shift', 'role', 'isActive', 'isFieldWorker', 'allow_outside_radius', 'salary', 'salaryType', 'shiftStart', 'shiftEnd', 'brand', 'branch'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "`$field` = :$field";
                $params[":$field"] = $data[$field];
            }
        }

        if (isset($data['password']) && !empty($data['password'])) {
            $fields[] = "password = :password";
            $fields[] = "plainPassword = :plainPassword";
            $params[":password"] = password_hash($data['password'], PASSWORD_BCRYPT);
            $params[":plainPassword"] = $data['password'];
        }

        if (empty($fields)) return true; // Nothing to update

        $query = "UPDATE " . $this->table_name . " SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $params[':id'] = $id;

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        return $stmt->execute();
    }

    public function delete($id) {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        return $stmt->execute();
    }
}
